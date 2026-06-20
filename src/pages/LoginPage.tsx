import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import './AuthPages.css'

type LoginPageProps = {
  onSwitchToSignup: () => void
  defaultEmail?: string
  lockedEmail?: boolean
  title?: string
  subtitle?: string
  onBack?: () => void
}

export function LoginPage({
  onSwitchToSignup,
  defaultEmail = '',
  lockedEmail = false,
  title = 'Sign in',
  subtitle = "Winner's Choice",
  onBack,
}: LoginPageProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await signIn(email, password)
    if (result.error) {
      setError(result.error)
    }

    setSubmitting(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{title}</h1>
        <p className="auth-card-subtitle">{subtitle}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <p className="auth-error">{error}</p>}

          <div className="form-group">
            <label className="field-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="input-field"
              type="email"
              autoComplete="email"
              required
              readOnly={lockedEmail}
              value={email}
              onChange={(event) => {
                if (!lockedEmail) setEmail(event.target.value)
              }}
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="input-field"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {onBack ? (
          <p className="auth-switch">
            <button type="button" onClick={onBack}>
              Back to invite
            </button>
          </p>
        ) : (
          <p className="auth-switch">
            Need an account?{' '}
            <button type="button" onClick={onSwitchToSignup}>
              Sign up
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
