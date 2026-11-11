import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { copy } from '../../app/copy'
import { useSession } from '../../app/session'

export function SignIn() {
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const ids = { email: useId(), password: useId(), error: useId() }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      // Once the session holds an Admin, the router leaves Sign in for the Admin home.
      await signIn(email, password)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : copy.errors.generic)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card" aria-labelledby={`${ids.email}-title`}>
      <h1 className="card__header" id={`${ids.email}-title`}>
        {copy.signIn.title}
      </h1>
      <div className="card__body">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <input
              className="field__input"
              id={ids.email}
              type="email"
              name="email"
              autoComplete="username"
              placeholder=" "
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={error ? ids.error : undefined}
              aria-invalid={error ? true : undefined}
              required
            />
            <label className="field__label" htmlFor={ids.email}>
              {copy.signIn.email}
            </label>
          </div>
          <div className="field">
            <input
              className="field__input"
              id={ids.password}
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder=" "
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <label className="field__label" htmlFor={ids.password}>
              {copy.signIn.password}
            </label>
          </div>
          {error && (
            <p className="field-error" id={ids.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button button--primary" disabled={submitting}>
            {copy.signIn.submit}
          </button>
        </form>
      </div>
    </section>
  )
}
