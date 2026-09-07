import { loadCachedAccount, loadCredentialsText } from './storage'
import { renderAccount } from './views/account'
import { renderReady } from './views/ready'
import { renderSetup } from './views/setup'
import { renderToken } from './views/token'
import { renderWelcome } from './views/welcome'

export type ViewCleanup = void | (() => void)
export type View = (root: HTMLElement) => ViewCleanup

const titles: Record<string, string> = {
  '#/': 'snax',
  '#/setup': 'snax - Make a token',
  '#/token': 'snax - Paste the token',
  '#/ready': "snax - You're in",
  '#/account': 'snax - Your snaps',
}

export function navigate(path: string): void {
  const hash = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`
  if (location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    location.hash = hash
  }
}

function redirect(path: string): true {
  navigate(path)
  return true
}

export function startRouter(root: HTMLElement): () => void {
  let cleanup: (() => void) | undefined

  const render = (): void => {
    const hash = location.hash || '#/'
    const hasCredentials = loadCredentialsText() !== null

    if (!(hash in titles)) {
      redirect('#/')
      return
    }
    if (hash === '#/' && hasCredentials) {
      redirect('#/account')
      return
    }
    if (hash === '#/ready' && (!hasCredentials || loadCachedAccount() === null)) {
      redirect('#/token')
      return
    }
    if (hash === '#/account' && !hasCredentials) {
      redirect('#/')
      return
    }

    const views: Record<string, View> = {
      '#/': renderWelcome,
      '#/setup': renderSetup,
      '#/token': renderToken,
      '#/ready': renderReady,
      '#/account': renderAccount,
    }

    cleanup?.()
    cleanup = undefined
    document.title = titles[hash] ?? 'snax'
    const nextCleanup = views[hash]?.(root)
    if (typeof nextCleanup === 'function') cleanup = nextCleanup
  }

  window.addEventListener('hashchange', render)
  render()

  return () => {
    window.removeEventListener('hashchange', render)
    cleanup?.()
  }
}
