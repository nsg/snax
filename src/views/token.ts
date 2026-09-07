import { CredentialsParseError, parseCredentials } from '../credentials'
import { navigate } from '../router'
import { NetworkError, StoreError, fetchAccount } from '../storeApi'
import { saveCachedAccount, saveCredentialsText } from '../storage'
import { el } from '../ui/dom'
import { createBottomNav, createShell } from '../ui/shell'
import { createSteps } from '../ui/steps'

export function renderToken(root: HTMLElement): () => void {
  const shell = createShell()
  let active = true
  let checking = false

  const textarea = el('textarea', {
    className: 'token-textarea', rows: 8, placeholder: 'contents of snax-login.txt', spellcheck: false,
    autocomplete: 'off', attrs: { 'aria-label': 'Login token' },
  })
  const status = el('p', { className: 'token-status', attrs: { role: 'status' } })
  const privacy = el('p', { className: 'privacy-note' }, "The token stays in this browser's local storage and is only ever sent to dashboard.snapcraft.io. Log out deletes it.")

  const showError = (message: string): void => {
    status.className = 'token-status is-error'
    status.textContent = message
    textarea.classList.add('is-error')
  }

  const nav = createBottomNav({
    backHref: '#/setup',
    primaryLabel: 'Check token',
    onPrimary: () => { void checkToken() },
  })

  const checkToken = async (): Promise<void> => {
    if (checking) return
    status.className = 'token-status'
    status.textContent = ''
    textarea.classList.remove('is-error')

    let credentials
    try {
      credentials = parseCredentials(textarea.value)
    } catch (error) {
      showError(error instanceof CredentialsParseError ? error.message : 'The token could not be parsed.')
      return
    }

    checking = true
    nav.primary.textContent = 'Checking with the Snap Store'
    ;(nav.primary as HTMLButtonElement).disabled = true
    status.textContent = 'Asking dashboard.snapcraft.io who you are.'

    try {
      const account = await fetchAccount(credentials)
      if (!active) return
      saveCredentialsText(textarea.value)
      saveCachedAccount(account)
      navigate('#/ready')
    } catch (error) {
      if (!active) return
      if (error instanceof StoreError && error.status === 401) {
        showError('The Snap Store rejected this token. It may have expired or been revoked. Make a new one and paste it again.')
      } else if (error instanceof StoreError) {
        showError(`The Snap Store answered with status ${error.status}: ${error.message}`)
      } else if (error instanceof NetworkError) {
        showError(error.message)
      } else {
        showError('Could not check the token. Try again.')
      }
      checking = false
      nav.primary.textContent = 'Check token'
      ;(nav.primary as HTMLButtonElement).disabled = false
    }
  }

  shell.main.append(
    createSteps(2),
    el('section', { className: 'flow-page flow-page--narrow' }, [
      el('div', { className: 'page-heading' }, [
        el('h1', null, 'Paste the token'),
        el('p', { className: 'page-lede' }, 'Paste everything that cat printed. It is one long line.'),
      ]),
      textarea, status, privacy, nav.element,
    ]),
  )
  root.replaceChildren(shell.element)
  textarea.focus()

  return () => { active = false }
}
