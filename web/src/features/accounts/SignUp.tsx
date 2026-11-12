import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { copy } from '../../app/copy'
import { fieldErrors, focusFirstInvalid, type FieldErrors } from '../../app/forms'
import { PageHeader } from '../../app/PageHeader'
import { Link } from '../../app/Router'
import { useSession } from '../../app/session'
import { TextField } from './TextField'

/** Sign up: creates an Employee account and signs it in (R1). */
export function SignUp() {
  const { signUp } = useSession()
  const [name, setName] = useState('')
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
      // Once the session holds the new Employee, the router leaves Sign up for the return path or Home.
      await signUp(name, email, password)
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
      <PageHeader title={copy.signUp.title} icon="person_add" />
      <section className="card" aria-label={copy.signUp.title}>
        <div className="card__body">
          <form className="form" ref={formRef} onSubmit={handleSubmit} noValidate>
            <TextField
              label={copy.signUp.name}
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={setName}
              error={errors.name}
            />
            <TextField
              label={copy.signUp.email}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
            />
            <TextField
              label={copy.signUp.password}
              name="password"
              type="password"
              autoComplete="new-password"
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
              {copy.signUp.submit}
            </button>
          </form>
        </div>
      </section>
      <p>
        {copy.signUp.haveAccount}{' '}
        <Link to={`/sign-in${window.location.search}`}>{copy.signUp.signInLink}</Link>
      </p>
    </>
  )
}
