import { parseMacaroonV1 } from '../macaroon'
import { NetworkError, StoreError, fetchAccount, type AccountInfo, type SnapRegistration } from '../storeApi'
import { clearAll, loadCachedAccount, saveCachedAccount } from '../storage'
import type { Credentials } from '../credentials'
import { renderLogin } from './login'

function valueLine(label: string, value: string | undefined, className?: string): HTMLElement {
  const row = document.createElement('p')
  row.className = 'account-line'
  const labelNode = document.createElement('span')
  labelNode.textContent = label
  const valueNode = document.createElement('span')
  valueNode.textContent = value?.trim() || '—'
  if (className !== undefined) valueNode.className = className
  row.append(labelNode, valueNode)
  return row
}

function accountCard(account: AccountInfo, fetchedAt?: string): HTMLElement {
  const card = document.createElement('section')
  card.className = 'card'
  const title = document.createElement('h2')
  title.textContent = 'Signed in as'
  const displayName = document.createElement('p')
  displayName.className = 'display-name'
  displayName.textContent = account.displayname?.trim() || account.username?.trim() || 'Snap Store publisher'
  card.append(
    title,
    displayName,
    valueLine('Username', account.username),
    valueLine('Email', account.email),
    valueLine('Account id', account.account_id, 'mono'),
  )
  if (fetchedAt !== undefined) {
    const updated = document.createElement('p')
    updated.className = 'updated'
    updated.textContent = `updated ${fetchedAt}`
    card.append(updated)
  }
  return card
}

function snapRow(name: string, snap: SnapRegistration): HTMLElement {
  const row = document.createElement('li')
  row.className = 'snap-row'
  const primary = document.createElement('div')
  const snapName = document.createElement('strong')
  snapName.textContent = name
  primary.append(snapName)
  if (snap.private === true) {
    const badge = document.createElement('span')
    badge.className = 'badge'
    badge.textContent = 'private'
    primary.append(badge)
  }
  const metadata = document.createElement('div')
  metadata.className = 'snap-meta'
  const since = typeof snap.since === 'string' ? snap.since.slice(0, 10) : ''
  if (since !== '') {
    const date = document.createElement('span')
    date.textContent = `since ${since}`
    metadata.append(date)
  }
  if (typeof snap.status === 'string' && snap.status !== 'Approved') {
    const status = document.createElement('span')
    status.textContent = snap.status
    metadata.append(status)
  }
  row.append(primary, metadata)
  return row
}

function snapsCard(account: AccountInfo): HTMLElement {
  const snaps = account.snaps?.['16'] ?? {}
  const names = Object.keys(snaps).sort((a, b) => a.localeCompare(b))
  const card = document.createElement('section')
  card.className = 'card'
  const title = document.createElement('h2')
  title.textContent = `Your snaps (${names.length})`
  card.append(title)
  if (names.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'empty'
    empty.textContent = 'No snaps are available to this token.'
    card.append(empty)
  } else {
    const list = document.createElement('ul')
    list.className = 'snap-list'
    for (const name of names) {
      const snap = snaps[name]
      if (snap !== undefined) list.append(snapRow(name, snap))
    }
    card.append(list)
  }
  const next = document.createElement('p')
  next.className = 'hint'
  next.textContent = 'Snap details, metrics and releases come in the next steps.'
  card.append(next)
  return card
}

function tokenDetails(creds: Credentials): HTMLElement {
  const details = document.createElement('details')
  details.className = 'card token-details'
  const summary = document.createElement('summary')
  summary.textContent = 'Token details'
  const kind = document.createElement('p')
  kind.textContent = `Kind: ${creds.kind === 'u1' ? 'Ubuntu One' : 'Candid'}`
  details.append(summary, kind)

  if (creds.kind === 'u1') {
    const caveats = parseMacaroonV1(creds.root).caveats.filter((caveat) => caveat.location === undefined)
    const heading = document.createElement('p')
    heading.textContent = 'First-party caveats:'
    const list = document.createElement('ul')
    list.className = 'caveat-list mono'
    for (const caveat of caveats) {
      const item = document.createElement('li')
      item.textContent = caveat.id
      list.append(item)
    }
    details.append(heading, list)
  }
  return details
}

function banner(message: string, tone: 'warning' | 'subtle'): HTMLElement {
  const element = document.createElement('p')
  element.className = `banner ${tone}`
  element.setAttribute('role', 'status')
  element.textContent = message
  return element
}

export function renderAccount(root: HTMLElement, creds: Credentials): void {
  root.replaceChildren()
  const header = document.createElement('header')
  header.className = 'account-header'
  const identity = document.createElement('div')
  const wordmark = document.createElement('div')
  wordmark.className = 'wordmark'
  wordmark.textContent = 'snax'
  const tagline = document.createElement('p')
  tagline.textContent = 'A faster view of your snaps on the Snap Store. Runs entirely in your browser.'
  identity.append(wordmark, tagline)
  const logout = document.createElement('button')
  logout.type = 'button'
  logout.className = 'secondary'
  logout.textContent = 'Log out'
  logout.addEventListener('click', () => {
    clearAll()
    renderLogin(root)
  })
  header.append(identity, logout)

  const main = document.createElement('main')
  const noticeArea = document.createElement('div')
  const cards = document.createElement('div')
  const cached = loadCachedAccount()
  const renderCards = (account: AccountInfo, fetchedAt?: string): void => {
    cards.replaceChildren(accountCard(account, fetchedAt), snapsCard(account), tokenDetails(creds))
  }
  if (cached !== null) {
    renderCards(cached.account, cached.fetchedAt)
  } else {
    const loading = document.createElement('p')
    loading.className = 'loading'
    loading.textContent = 'Loading your Snap Store account…'
    cards.append(loading, tokenDetails(creds))
  }
  main.append(noticeArea, cards)
  root.append(header, main)

  void fetchAccount(creds).then((account) => {
    saveCachedAccount(account)
    noticeArea.replaceChildren()
    renderCards(account, new Date().toISOString())
  }).catch((error: unknown) => {
    if (error instanceof StoreError && error.status === 401) {
      noticeArea.replaceChildren(banner('The Snap Store rejected the stored token. Log out and log in again.', 'warning'))
    } else if (error instanceof NetworkError) {
      noticeArea.replaceChildren(banner('Offline? Showing cached data.', 'subtle'))
    } else if (error instanceof StoreError) {
      noticeArea.replaceChildren(banner(`The Snap Store returned status ${error.status}: ${error.message}`, 'subtle'))
    } else {
      noticeArea.replaceChildren(banner('Could not refresh the account. Showing cached data.', 'subtle'))
    }
  })
}
