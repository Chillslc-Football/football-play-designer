import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import './AuthPages.css'

type SignupPageProps = {
  onSwitchToLogin: () => void
  defaultEmail?: string
  lockedEmail?: boolean
  emailRedirectTo?: string
  title?: string
  subtitle?: string
  onBack?: () => void
}

export function SignupPage({
  onSwitchToLogin,
  defaultEmail = '',
  lockedEmail = false,
  emailRedirectTo,
  title = 'Create account',
  subtitle = 'Football Play Designer',
  onBack,
}: SignupPageProps) {
  const { signUp } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    const result = await signUp(email, password, displayName, { emailRedirectTo })
    if (result.error) {
      setError(result.error)
    } else if (result.message) {
      setMessage(result.message)
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
          {message && <p className="auth-success">{message}</p>}

          <div className="form-group">
            <label className="field-label" htmlFor="signup-name">
              Display name
            </label>
            <input
              id="signup-name"
              className="input-field"
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
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
            <label className="field-label" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              className="input-field"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
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
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin}>
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
