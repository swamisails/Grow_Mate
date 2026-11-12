import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { copy } from '../../app/copy'
import { fieldErrors, focusFirstInvalid, type FieldErrors } from '../../app/forms'
import { PageHeader } from '../../app/PageHeader'
import { useSession } from '../../app/session'

export function SignIn() {
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const ids = { email: useId(), password: useId(), emailError: useId(), passwordError: useId() }

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
      // Once the session holds an Admin, the router leaves Sign in for the return path or the Admin home.
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
                aria-describedby={errors.email ? ids.emailError : undefined}
                aria-invalid={errors.email ? true : undefined}
                required
              />
              <label className="field__label" htmlFor={ids.email}>
                {copy.signIn.email}
              </label>
              {errors.email && (
                <p className="field-error" id={ids.emailError}>
                  {errors.email}
                </p>
              )}
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
                aria-describedby={errors.password ? ids.passwordError : undefined}
                aria-invalid={errors.password ? true : undefined}
                required
              />
              <label className="field__label" htmlFor={ids.password}>
                {copy.signIn.password}
              </label>
              {errors.password && (
                <p className="field-error" id={ids.passwordError}>
                  {errors.password}
                </p>
              )}
            </div>
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
    </>
  )
}
