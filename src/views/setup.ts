import { buildExportCommand, exportCommandLines } from '../exportCommand'
import { loadOnboarding, saveOnboarding, type OnboardingState } from '../onboarding'
import { el } from '../ui/dom'
import { createBottomNav, createShell } from '../ui/shell'
import { createSteps } from '../ui/steps'
import { createCopyButton, createTerminal } from '../ui/terminal'

function localDateAfter(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function describe(state: OnboardingState): string {
  const snaps = state.snaps.trim() === '' ? 'all snaps' : `only ${state.snaps.trim()}`
  return `expires ${state.expires}, ${snaps}`
}

export function renderSetup(root: HTMLElement): () => void {
  const shell = createShell()
  const state: OnboardingState = loadOnboarding()

  const terminal = createTerminal([
    { lines: exportCommandLines(state), copyText: buildExportCommand(state), copyLabel: 'Copy export command' },
  ])

  const expires = el('input', {
    type: 'date', value: state.expires, min: localDateAfter(0), max: localDateAfter(365), required: true,
  })
  const expiryField = el('label', { className: 'field' }, [
    el('span', { className: 'field__label' }, 'Expires'),
    expires,
    el('small', { className: 'field__hint' }, 'Up to one year.'),
  ])

  const snaps = el('input', { type: 'text', value: state.snaps, placeholder: 'all snaps' })
  const snapsField = el('label', { className: 'field' }, [
    el('span', { className: 'field__label' }, 'Only these snaps'),
    snaps,
    el('small', { className: 'field__hint' }, 'Comma-separated snap names, optional.'),
  ])

  const summaryDetail = el('span', { className: 'advanced__detail' }, describe(state))
  const advanced = el('details', { className: 'advanced' }, [
    el('summary', null, [el('span', null, 'Advanced'), summaryDetail]),
    el('form', { className: 'advanced__fields', on: { submit: (event) => event.preventDefault() } }, [
      expiryField,
      snapsField,
    ]),
  ])

  const update = (): void => {
    state.expires = expires.value
    state.snaps = snaps.value
    saveOnboarding(state)
    terminal.updateCommand(0, exportCommandLines(state), buildExportCommand(state))
    summaryDetail.textContent = describe(state)
  }
  expires.addEventListener('input', update)
  snaps.addEventListener('input', update)

  const installCode = el('code', null, 'sudo snap install snapcraft --classic')
  const installCopy = createCopyButton({
    getText: () => 'sudo snap install snapcraft --classic', selectionTarget: installCode,
    ariaLabel: 'Copy snapcraft install command', className: 'inline-copy',
  })
  const installAside = el('aside', { className: 'install-aside' }, [
    el('span', null, ["Don't have snapcraft? ", installCode, installCopy.button]),
    el('span', null, 'Printing the token needs snapcraft 7.5 or newer.'),
  ])

  shell.main.append(
    createSteps(1),
    el('section', { className: 'flow-page flow-page--setup' }, [
      el('div', { className: 'page-heading' }, [
        el('h1', null, 'Make a token'),
        el('p', { className: 'page-lede' }, 'Run this in a terminal. snapcraft signs you in with Ubuntu One and prints a token that can see your snaps, read their metrics and release revisions.'),
      ]),
      terminal.element,
      el('p', { className: 'quiet-note' }, 'Copy the long line at the end of the output. Nothing is written to disk, so there is no file to clean up afterwards.'),
      advanced,
      installAside,
      createBottomNav({ backHref: '#/', primaryLabel: 'Next, paste the token', primaryHref: '#/token' }).element,
    ]),
  )
  root.replaceChildren(shell.element)

  return () => {
    terminal.destroy()
    installCopy.destroy()
  }
}
