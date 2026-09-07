import { parseCredentials, type Credentials } from '../credentials'
import { parseMacaroonV1 } from '../macaroon'
import { navigate } from '../router'
import { NetworkError, StoreError, fetchAccount, type AccountInfo, type SnapRegistration } from '../storeApi'
import { clearAll, loadCachedAccount, loadCredentialsText, saveCachedAccount } from '../storage'
import { el } from '../ui/dom'
import { createShell } from '../ui/shell'

function accountHeading(account: AccountInfo, fetchedAt?: string): HTMLElement {
  const identity = [account.displayname?.trim(), account.email?.trim()].filter(Boolean).join(', ')
  const children: Array<HTMLElement | string | null> = [
    el('h1', null, 'Your snaps'),
    identity === '' ? null : el('p', { className: 'account-identity' }, identity),
  ]
  if (fetchedAt !== undefined) {
    const time = new Date(fetchedAt)
    const value = Number.isNaN(time.getTime()) ? fetchedAt : time.toLocaleString()
    children.push(el('p', { className: 'account-updated' }, `updated ${value}`))
  }
  return el('div', { className: 'account-heading' }, children)
}

function snapRow(name: string, snap: SnapRegistration): HTMLElement {
  const facts: HTMLElement[] = []
  if (typeof snap.since === 'string' && snap.since.length > 0) {
    facts.push(el('span', null, `since ${snap.since.slice(0, 10)}`))
  }
  if (snap.private === true) facts.push(el('span', { className: 'private-tag' }, 'private'))
  if (typeof snap.status === 'string' && snap.status !== 'Approved') {
    facts.push(el('span', null, snap.status))
  }
  return el('li', { className: 'snap-row' }, [
    el('span', { className: 'snap-name' }, name),
    el('span', { className: 'snap-facts' }, facts),
  ])
}

function snapList(account: AccountInfo): HTMLElement {
  const snaps = account.snaps?.['16'] ?? {}
  const names = Object.keys(snaps).sort((a, b) => a.localeCompare(b))
  if (names.length === 0) {
    return el('p', { className: 'account-empty' }, 'No snaps are registered to this account yet.')
  }
  return el('ul', { className: 'snap-list' }, names.map((name) => snapRow(name, snaps[name] ?? {})))
}

function tokenDetails(credentials: Credentials): HTMLElement {
  const details = el('details', { className: 'token-details' })
  details.append(
    el('summary', null, 'Token details'),
    el('p', { className: 'token-kind' }, `Kind: ${credentials.kind === 'u1' ? 'Ubuntu One' : 'Candid'}`),
  )
  if (credentials.kind === 'u1') {
    const caveats = parseMacaroonV1(credentials.root).caveats
      .filter((caveat) => caveat.vid === undefined && caveat.location === undefined)
    details.append(
      el('p', { className: 'caveat-heading' }, 'First-party caveats:'),
      el('ul', { className: 'caveat-list' }, caveats.map((caveat) => el('li', null, caveat.id))),
    )
  }
  return details
}

function accountContent(account: AccountInfo, credentials: Credentials, fetchedAt?: string): HTMLElement {
  return el('div', { className: 'account-content' }, [
    accountHeading(account, fetchedAt),
    snapList(account),
    tokenDetails(credentials),
  ])
}

function banner(message: string, tone: 'error' | 'quiet'): HTMLElement {
  return el('p', {
    className: `account-banner account-banner--${tone}`,
    attrs: { role: 'status' },
  }, message)
}

export function renderAccount(root: HTMLElement): () => void {
  const credentialsText = loadCredentialsText()
  let credentials: Credentials
  try {
    if (credentialsText === null) throw new Error('Missing credentials')
    credentials = parseCredentials(credentialsText)
  } catch {
    clearAll()
    navigate('#/')
    return () => undefined
  }

  let active = true
  const shell = createShell({
    onLogout: () => {
      clearAll()
      navigate('#/')
    },
  })
  shell.main.classList.add('account-page')
  const notices = el('div', { className: 'account-notices' })
  const content = el('div')
  const cached = loadCachedAccount()
  if (cached === null) {
    content.append(
      el('div', { className: 'account-heading' }, [el('h1', null, 'Your snaps')]),
      el('p', { className: 'account-loading' }, 'Loading your Snap Store account.'),
      tokenDetails(credentials),
    )
  } else {
    content.replaceChildren(accountContent(cached.account, credentials, cached.fetchedAt))
  }
  shell.main.append(notices, content)
  root.replaceChildren(shell.element)

  void fetchAccount(credentials).then((account) => {
    if (!active) return
    saveCachedAccount(account)
    const refreshed = loadCachedAccount()
    notices.replaceChildren()
    content.replaceChildren(accountContent(account, credentials, refreshed?.fetchedAt))
  }).catch((error: unknown) => {
    if (!active) return
    if (error instanceof StoreError && error.status === 401) {
      notices.replaceChildren(banner('The Snap Store rejected the stored token. Log out and log in again.', 'error'))
    } else if (error instanceof NetworkError) {
      notices.replaceChildren(banner('Offline? Showing cached data.', 'quiet'))
    } else if (error instanceof StoreError) {
      notices.replaceChildren(banner(`The Snap Store answered with status ${error.status}: ${error.message}`, 'quiet'))
    } else {
      notices.replaceChildren(banner('Could not refresh the account. Showing cached data.', 'quiet'))
    }
  })

  return () => { active = false }
}
