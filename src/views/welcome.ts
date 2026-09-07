import { el } from '../ui/dom'
import { createShell } from '../ui/shell'

export function renderWelcome(root: HTMLElement): void {
  const shell = createShell()
  shell.main.classList.add('welcome-page')

  shell.main.append(el('div', { className: 'welcome-intro' }, [
    el('h1', null, 'Your snaps, without the wait.'),
    el('p', { className: 'page-lede' }, 'snax is a faster view of your Snap Store publisher account. It runs in your browser, talks straight to the store, and keeps your token on this device.'),
    el('div', { className: 'welcome-actions' }, [
      el('a', { className: 'button button--primary', href: '#/setup' }, 'Get started'),
      el('a', { className: 'text-link', href: '#/token' }, 'I already have a token'),
    ]),
    el('ol', { className: 'welcome-sequence' }, [
      el('li', null, 'Make a token in your terminal'),
      el('li', null, 'Paste it here'),
      el('li', null, 'See your snaps'),
    ]),
  ]))
  root.replaceChildren(shell.element)
}
