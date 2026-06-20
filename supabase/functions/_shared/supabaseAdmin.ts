import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SERVICE_ROLE_KEY_ENV = 'SERVICE_ROLE_KEY';

export type ServiceClientDiagnostics = {
  supabaseUrlPresent: boolean;
  serviceRoleKeyPresent: boolean;
  serviceRoleKeyLength: number | null;
  serviceRoleJwtRole: string | null;
};

export type AdminReadDiagnostics = {
  serviceRoleKeyPresent: boolean;
  serviceRoleJwtRole: string | null;
  table: string;
  supabaseCode: string | null;
  supabaseMessage: string;
};

export class AdminReadError extends Error {
  diagnostics: AdminReadDiagnostics;

  constructor(summary: string, diagnostics: AdminReadDiagnostics) {
    super(summary);
    this.name = 'AdminReadError';
    this.diagnostics = diagnostics;
  }
}

type FilterBuilder = {
  eq: (column: string, value: string) => FilterBuilder;
  in: (column: string, values: string[]) => FilterBuilder;
  filter: (column: string, operator: string, value: string) => FilterBuilder;
};

let adminClient: SupabaseClient | null = null;

function normalizeSecret(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function decodeJwtRole(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) {
      return null;
    }

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload)) as { role?: string };
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

function getSupabaseUrl(): string | undefined {
  return normalizeSecret(Deno.env.get('SUPABASE_URL'));
}

export function getServiceRoleKey(): string | undefined {
  return (
    normalizeSecret(Deno.env.get(SERVICE_ROLE_KEY_ENV)) ??
    normalizeSecret(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  );
}

export function getServiceClientDiagnostics(): ServiceClientDiagnostics {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  return {
    supabaseUrlPresent: Boolean(supabaseUrl),
    serviceRoleKeyPresent: Boolean(serviceRoleKey),
    serviceRoleKeyLength: serviceRoleKey?.length ?? null,
    serviceRoleJwtRole: serviceRoleKey ? decodeJwtRole(serviceRoleKey) : null,
  };
}

export function logServiceClientDiagnostics(context: string): ServiceClientDiagnostics {
  const diagnostics = getServiceClientDiagnostics();

  console.log(`[send-push-notification] ${context}`, diagnostics);

  if (!diagnostics.supabaseUrlPresent || !diagnostics.serviceRoleKeyPresent) {
    throw new Error(`Missing SUPABASE_URL or ${SERVICE_ROLE_KEY_ENV} / SUPABASE_SERVICE_ROLE_KEY.`);
  }

  return diagnostics;
}

function unquoteFilterValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"');
  }

  return value;
}

function parseInList(raw: string): string[] {
  if (!raw.includes('"')) {
    return raw.split(',').filter(Boolean);
  }

  const matches = raw.match(/"(?:[^"]|"")*"/g);
  if (matches) {
    return matches.map((match) => unquoteFilterValue(match));
  }

  return raw.split(',').filter(Boolean);
}

function applyQueryFilters<T extends FilterBuilder>(builder: T, query: Record<string, string>): T {
  let result: FilterBuilder = builder;

  for (const [column, filter] of Object.entries(query)) {
    if (column === 'select') {
      continue;
    }

    if (filter.startsWith('eq.')) {
      result = result.eq(column, unquoteFilterValue(filter.slice(3)));
      continue;
    }

    if (filter.startsWith('in.(') && filter.endsWith(')')) {
      result = result.in(column, parseInList(filter.slice(4, -1)));
      continue;
    }

    const separatorIndex = filter.indexOf('.');
    if (separatorIndex === -1) {
      continue;
    }

    const operator = filter.slice(0, separatorIndex);
    const value = unquoteFilterValue(filter.slice(separatorIndex + 1));
    result = result.filter(column, operator, value);
  }

  return result as T;
}

function buildAdminClient(): SupabaseClient {
  logServiceClientDiagnostics('admin client init');

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(`Missing SUPABASE_URL or ${SERVICE_ROLE_KEY_ENV} / SUPABASE_SERVICE_ROLE_KEY.`);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  });
}

function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = buildAdminClient();
  }

  return adminClient;
}

function buildReadDiagnostics(table: string, supabaseMessage: string, supabaseCode: string | null): AdminReadDiagnostics {
  const diagnostics = getServiceClientDiagnostics();

  return {
    serviceRoleKeyPresent: diagnostics.serviceRoleKeyPresent,
    serviceRoleJwtRole: diagnostics.serviceRoleJwtRole,
    table,
    supabaseCode,
    supabaseMessage,
  };
}

function throwAdminReadError(table: string, supabaseMessage: string, supabaseCode: string | null): never {
  const diagnostics = buildReadDiagnostics(table, supabaseMessage, supabaseCode);
  throw new AdminReadError(`Failed to read ${table}: ${supabaseMessage}`, diagnostics);
}

export function createServiceClient(): SupabaseClient {
  return getAdminClient();
}

export async function adminSelect<T>(
  table: string,
  query: Record<string, string>,
): Promise<T[]> {
  const select = query.select ?? '*';
  const builder = applyQueryFilters(getAdminClient().from(table).select(select), query);
  const { data, error } = await builder;

  if (error) {
    throwAdminReadError(table, error.message, error.code ?? null);
  }

  return (data ?? []) as T[];
}

export async function adminSelectMaybeSingle<T>(
  table: string,
  query: Record<string, string>,
): Promise<T | null> {
  const rows = await adminSelect<T>(table, query);
  return rows[0] ?? null;
}

export async function adminDelete(
  table: string,
  query: Record<string, string>,
): Promise<void> {
  const builder = applyQueryFilters(getAdminClient().from(table).delete(), query);
  const { error } = await builder;

  if (error) {
    throwAdminReadError(table, error.message, error.code ?? null);
  }
}

export function isAdminReadError(error: unknown): error is AdminReadError {
  return error instanceof AdminReadError;
}
