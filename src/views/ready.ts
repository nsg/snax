import { parseCredentials } from '../credentials'
import { navigate } from '../router'
import { clearAll, loadCachedAccount, loadCredentialsText } from '../storage'
import { permissionLabel, readTokenInfo } from '../tokenInfo'
import { el } from '../ui/dom'
import { createBottomNav, createShell } from '../ui/shell'
import { createSteps } from '../ui/steps'

function joinPhrases(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ''
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`
}

function tokenSentence(credentialsText: string): string | null {
  const info = readTokenInfo(parseCredentials(credentialsText))
  if (info === null) return null
  const permissions = info.permissions.map((permission) => {
    const label = permissionLabel(permission)
    return label.charAt(0).toLowerCase() + label.slice(1)
  })
  if (permissions.length > 0 && info.expires !== undefined) {
    return `This token can ${joinPhrases(permissions)} and expires on ${info.expires}.`
  }
  if (permissions.length > 0) return `This token can ${joinPhrases(permissions)}.`
  if (info.expires !== undefined) return `This token expires on ${info.expires}.`
  return null
}

export function renderReady(root: HTMLElement): void {
  const cached = loadCachedAccount()
  const credentialsText = loadCredentialsText()
  if (cached === null || credentialsText === null) {
    navigate('#/token')
    return
  }

  let details: string | null
  try {
    details = tokenSentence(credentialsText)
  } catch {
    clearAll()
    navigate('#/')
    return
  }

  const account = cached.account
  const name = account.displayname?.trim() || account.username?.trim()
  const snapCount = Object.keys(account.snaps?.['16'] ?? {}).length
  const registered = snapCount === 0
    ? 'No snaps are registered to this account yet.'
    : snapCount === 1
      ? '1 snap is registered to your account.'
      : `${snapCount} snaps are registered to your account.`
  const shell = createShell()

  shell.main.append(
    createSteps(3),
    el('section', { className: 'flow-page flow-page--narrow ready-page' }, [
      el('div', { className: 'page-heading' }, [
        el('h1', null, name === undefined ? "You're in." : `You're in, ${name}.`),
        el('p', { className: 'page-lede' }, registered),
        details === null ? null : el('p', { className: 'token-summary' }, details),
      ]),
      createBottomNav({ backHref: '#/token', primaryLabel: 'Open your snaps', primaryHref: '#/account' }).element,
    ]),
  )
  root.replaceChildren(shell.element)
}
