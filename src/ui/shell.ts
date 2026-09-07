import { el } from './dom'

export interface ShellOptions {
  onLogout?: () => void
}

export interface Shell {
  element: HTMLElement
  header: HTMLElement
  main: HTMLElement
}

export function createShell(options: ShellOptions = {}): Shell {
  const wordmark = el('div', { className: 'wordmark' }, 'snax')
  const headerActions = el('div', { className: 'site-header__actions' })

  if (options.onLogout !== undefined) {
    const logout = el('button', {
      type: 'button',
      className: 'button button--secondary',
      on: { click: options.onLogout },
    }, 'Log out')
    headerActions.append(logout)
  }

  const headerInner = el(
    'div',
    { className: 'shell-container site-header__inner' },
    [wordmark, headerActions],
  )
  const header = el('header', { className: 'site-header' }, headerInner)
  const main = el('main', { className: 'shell-container page-main' })
  const element = el('div', { className: 'app-shell' }, [header, main])

  return { element, header, main }
}

export interface BottomNavOptions {
  backHref?: string
  backLabel?: string
  primaryLabel: string
  primaryHref?: string
  onPrimary?: (event: MouseEvent) => void
  primaryType?: 'button' | 'submit'
  primaryForm?: string
}

export interface BottomNav {
  element: HTMLElement
  back?: HTMLAnchorElement
  primary: HTMLAnchorElement | HTMLButtonElement
}

export function createBottomNav(options: BottomNavOptions): BottomNav {
  const back = options.backHref === undefined
    ? undefined
    : el('a', { className: 'text-link bottom-nav__back', href: options.backHref }, options.backLabel ?? 'Back')

  const primary = options.primaryHref === undefined
    ? el('button', {
        type: options.primaryType ?? 'button',
        className: 'button button--primary',
        ...(options.primaryForm === undefined ? {} : { form: options.primaryForm }),
        ...(options.onPrimary === undefined ? {} : { on: { click: options.onPrimary } }),
      }, options.primaryLabel)
    : el('a', {
        className: 'button button--primary',
        href: options.primaryHref,
        ...(options.onPrimary === undefined ? {} : { on: { click: options.onPrimary } }),
      }, options.primaryLabel)

  const leading = back ?? el('span', { className: 'bottom-nav__spacer', attrs: { 'aria-hidden': 'true' } })
  const element = el(
    'nav',
    { className: 'bottom-nav', attrs: { 'aria-label': 'Page navigation' } },
    [leading, primary],
  )

  return { element, back, primary }
}
