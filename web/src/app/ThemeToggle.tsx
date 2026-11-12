import { copy } from './copy'
import { Icon } from './icons'
import { useTheme } from './theme'

/** The top-bar sun/moon button: a sun in light mode, a moon in dark mode; one click switches at once. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? copy.theme.toLight : copy.theme.toDark}
      onClick={toggle}
    >
      <Icon name={dark ? 'dark_mode' : 'light_mode'} className="theme-toggle__icon" />
    </button>
  )
}
