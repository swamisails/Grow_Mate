import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { copy } from '../../app/copy'
import { fieldErrors, focusFirstInvalid, type FieldErrors } from '../../app/forms'
import { PageHeader } from '../../app/PageHeader'
import { Link } from '../../app/Router'
import { useSession } from '../../app/session'
import { TextField } from './TextField'

export function SignIn() {
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Focus moves to the first invalid field once its message and aria links are rendered.
  useEffect(() => {
    if (formRef.current && Object.keys(errors).length > 0) {
      focusFirstInvalid(formRef.current, errors)
    }
  }, [errors])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setFormError(null)
    try {
      // Once the session holds a user, the router leaves Sign in for the return path or the user's home.
      await signIn(email, password)
    } catch (caught) {
      const invalid = fieldErrors(caught)
      if (invalid) {
        setErrors(invalid)
      } else {
        setFormError(caught instanceof ApiError ? caught.message : copy.errors.generic)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader title={copy.signIn.title} icon="login" />
      <section className="card" aria-label={copy.signIn.title}>
        <div className="card__body">
          <form className="form" ref={formRef} onSubmit={handleSubmit} noValidate>
            <TextField
              label={copy.signIn.email}
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={setEmail}
              error={errors.email}
            />
            <TextField
              label={copy.signIn.password}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              error={errors.password}
            />
            {formError && (
              <p className="field-error" role="alert">
                {formError}
              </p>
            )}
            <button type="submit" className="button button--primary" disabled={submitting}>
              {copy.signIn.submit}
            </button>
          </form>
        </div>
      </section>
      <p>
        {copy.signIn.noAccount}{' '}
        {/* Keeps `?return=`, so signing up still comes back to the page that sent the user here. */}
        <Link to={`/sign-up${window.location.search}`}>{copy.signIn.signUpLink}</Link>
      </p>
    </>
  )
}
