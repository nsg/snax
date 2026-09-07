import { buildExportCommand, exportCommandLines } from '../exportCommand'
import { loadOnboarding, saveOnboarding, type OnboardingState } from '../onboarding'
import { el } from '../ui/dom'
import { createBottomNav, createShell } from '../ui/shell'
import { createSteps } from '../ui/steps'
import { createCopyButton, createTerminal } from '../ui/terminal'

const permissions = [
  ['package_access', 'See your snaps and revisions'],
  ['package_metrics', 'Read install metrics'],
  ['package_release', 'Release revisions to channels'],
  ['package_update', 'Edit snap listings'],
  ['package_manage', 'Manage collaborators'],
  ['package_push', 'Upload new revisions'],
  ['package_register', 'Register new snap names'],
] as const

function localDateAfter(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function renderSetup(root: HTMLElement): () => void {
  const shell = createShell()
  const state: OnboardingState = loadOnboarding()
  const form = el('form', { className: 'setup-options' })
  form.addEventListener('submit', (event) => event.preventDefault())

  const expires = el('input', {
    type: 'date', value: state.expires, min: localDateAfter(0), max: localDateAfter(365), required: true,
  })
  const expiryField = el('label', { className: 'field' }, [
    el('span', { className: 'field__label' }, 'Expires'),
    expires,
    el('small', { className: 'field__hint' }, 'Up to one year.'),
  ])

  const fieldset = el('fieldset', { className: 'permission-group' }, [el('legend', null, 'Permissions')])
  const permissionInputs: HTMLInputElement[] = []
  for (const [acl, label] of permissions) {
    const required = acl === 'package_access'
    const checkbox = el('input', {
      type: 'checkbox', value: acl, checked: required || state.acls.includes(acl), disabled: required,
    })
    permissionInputs.push(checkbox)
    fieldset.append(el('label', { className: 'permission-row' }, [
      checkbox,
      el('span', { className: 'permission-row__copy' }, [
        el('span', { className: 'permission-row__label' }, label),
        el('code', { className: 'permission-row__id' }, acl),
        required ? el('small', { className: 'permission-row__hint' }, 'always on') : null,
      ]),
    ]))
  }

  const snaps = el('input', { type: 'text', value: state.snaps, placeholder: 'all snaps' })
  const snapsField = el('label', { className: 'field' }, [
    el('span', { className: 'field__label' }, 'Only these snaps'),
    snaps,
    el('small', { className: 'field__hint' }, 'Comma-separated snap names, optional.'),
  ])
  form.append(expiryField, fieldset, snapsField)

  const terminal = createTerminal([
    { lines: exportCommandLines(state), copyText: buildExportCommand(state), copyLabel: 'Copy export command' },
    { lines: [[{ text: 'cat snax-login.txt' }]], copyText: 'cat snax-login.txt', copyLabel: 'Copy cat command' },
  ])
  const terminalColumn = el('div', { className: 'setup-terminal' }, [
    terminal.element,
    el('p', { className: 'quiet-note' }, 'snapcraft asks for your Ubuntu One email, password and second factor, then writes the token to snax-login.txt.'),
  ])

  const installCode = el('code', null, 'sudo snap install snapcraft --classic')
  const installCopy = createCopyButton({
    getText: () => 'sudo snap install snapcraft --classic', selectionTarget: installCode,
    ariaLabel: 'Copy snapcraft install command', className: 'inline-copy',
  })
  const installAside = el('aside', { className: 'install-aside' }, [
    "Don't have snapcraft? ", installCode, installCopy.button,
  ])

  const update = (): void => {
    state.expires = expires.value
    state.acls = permissionInputs.filter((input) => input.checked || input.disabled).map((input) => input.value)
    state.snaps = snaps.value
    saveOnboarding(state)
    terminal.updateCommand(0, exportCommandLines(state), buildExportCommand(state))
  }
  expires.addEventListener('input', update)
  snaps.addEventListener('input', update)
  for (const input of permissionInputs) input.addEventListener('change', update)

  shell.main.append(
    createSteps(1),
    el('section', { className: 'flow-page' }, [
      el('div', { className: 'page-heading' }, [
        el('h1', null, 'Make a token'),
        el('p', { className: 'page-lede' }, 'snapcraft mints a token that does only what you allow and expires when you choose.'),
      ]),
      el('div', { className: 'setup-grid' }, [form, terminalColumn]),
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
