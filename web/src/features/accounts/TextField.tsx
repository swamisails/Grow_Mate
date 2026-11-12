import { useId } from 'react'

type TextFieldProps = {
  label: string
  /** The API field name: the input's `name`, which `focusFirstInvalid` looks up. */
  name: string
  type: 'text' | 'email' | 'password'
  autoComplete: string
  value: string
  onChange: (value: string) => void
  /** The API's 422 message for this field, shown under it and linked with `aria-describedby`. */
  error?: string
}

/** A text input with its floating label and its field error (EXPERIENCE.md, State Patterns: 422). */
export function TextField({ label, name, type, autoComplete, value, onChange, error }: TextFieldProps) {
  const inputId = useId()
  const errorId = useId()

  return (
    <div className="field">
      <input
        className="field__input"
        id={inputId}
        type={type}
        name={name}
        autoComplete={autoComplete}
        placeholder=" "
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        required
      />
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
