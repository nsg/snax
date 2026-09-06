import {
  CredentialsParseError,
  parseCredentials,
} from '../credentials'
import { NetworkError, StoreError, fetchAccount } from '../storeApi'
import { saveCachedAccount, saveCredentialsText } from '../storage'
import { renderAccount } from './account'

interface Permission {
  name: string
  description: string
  checked: boolean
  required?: boolean
}

const permissions: Permission[] = [
  { name: 'package_access', description: 'read your snaps, revisions and channel maps', checked: true, required: true },
  { name: 'package_metrics', description: 'view install and usage metrics', checked: true },
  { name: 'package_release', description: 'release revisions to channels and close channels', checked: true },
  { name: 'package_update', description: 'edit snap metadata such as title, description and media', checked: true },
  { name: 'package_manage', description: 'manage collaborators and other package settings', checked: true },
  { name: 'package_push', description: 'upload new revisions', checked: false },
  { name: 'package_register', description: 'register new snap names', checked: false },
]

function appendHeader(root: HTMLElement): void {
  const header = document.createElement('header')
  const wordmark = document.createElement('div')
  wordmark.className = 'wordmark'
  wordmark.textContent = 'snax'
  const tagline = document.createElement('p')
  tagline.textContent = 'A faster view of your snaps on the Snap Store. Runs entirely in your browser.'
  header.append(wordmark, tagline)
  root.append(header)
}

function localDateAfter(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function selectCode(code: HTMLElement): void {
  const selection = window.getSelection()
  if (selection === null) return
  const range = document.createRange()
  range.selectNodeContents(code)
  selection.removeAllRanges()
  selection.addRange(range)
}

function codeBlock(text: string): { element: HTMLElement; code: HTMLElement; setText: (value: string) => void } {
  const wrapper = document.createElement('div')
  wrapper.className = 'code-block'
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  code.textContent = text
  pre.append(code)
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'copy-button'
  button.textContent = 'Copy'
  button.setAttribute('aria-label', 'Copy command')
  button.addEventListener('click', async () => {
    const value = code.textContent ?? ''
    try {
      if (navigator.clipboard === undefined) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      button.textContent = 'Copied'
      window.setTimeout(() => { button.textContent = 'Copy' }, 1500)
    } catch {
      selectCode(code)
      button.textContent = 'Selected'
      window.setTimeout(() => { button.textContent = 'Copy' }, 1500)
    }
  })
  wrapper.append(pre, button)
  return {
    element: wrapper,
    code,
    setText(value: string): void { code.textContent = value },
  }
}

function stepHeading(number: number, title: string): HTMLHeadingElement {
  const heading = document.createElement('h2')
  const marker = document.createElement('span')
  marker.className = 'step-number'
  marker.textContent = `Step ${number}`
  heading.append(marker, document.createTextNode(` — ${title}`))
  return heading
}

export function renderLogin(root: HTMLElement): void {
  root.replaceChildren()
  appendHeader(root)

  const main = document.createElement('main')

  const installSection = document.createElement('section')
  installSection.className = 'step'
  installSection.append(stepHeading(1, 'Get snapcraft.'))
  const installCode = codeBlock('sudo snap install snapcraft --classic')
  const installNote = document.createElement('p')
  installNote.className = 'hint'
  installNote.textContent = 'Any recent snapcraft (7 or newer) works.'
  installSection.append(installCode.element, installNote)

  const exportSection = document.createElement('section')
  exportSection.className = 'step'
  exportSection.append(stepHeading(2, 'Export a login token.'))
  const commandForm = document.createElement('form')
  commandForm.className = 'command-form'
  commandForm.addEventListener('submit', (event) => event.preventDefault())

  const expiryLabel = document.createElement('label')
  expiryLabel.className = 'field'
  const expiryTitle = document.createElement('span')
  expiryTitle.textContent = 'Expires'
  const expiry = document.createElement('input')
  expiry.type = 'date'
  expiry.required = true
  expiry.value = localDateAfter(90)
  expiry.min = localDateAfter(0)
  expiry.max = localDateAfter(365)
  const expiryNote = document.createElement('small')
  expiryNote.textContent = 'Maximum is 1 year.'
  expiryLabel.append(expiryTitle, expiry, expiryNote)

  const permissionGroup = document.createElement('fieldset')
  const legend = document.createElement('legend')
  legend.textContent = 'Permissions'
  permissionGroup.append(legend)
  const permissionInputs: HTMLInputElement[] = []
  for (const permission of permissions) {
    const label = document.createElement('label')
    label.className = 'permission'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = permission.name
    checkbox.checked = permission.checked
    checkbox.disabled = permission.required === true
    permissionInputs.push(checkbox)
    const copy = document.createElement('span')
    const name = document.createElement('code')
    name.textContent = permission.name
    const description = document.createElement('small')
    description.textContent = `${permission.description}${permission.required === true ? ' (required)' : ''}`
    copy.append(name, description)
    label.append(checkbox, copy)
    permissionGroup.append(label)
  }

  const snapsLabel = document.createElement('label')
  snapsLabel.className = 'field'
  const snapsTitle = document.createElement('span')
  snapsTitle.textContent = 'Limit to snaps'
  const snaps = document.createElement('input')
  snaps.type = 'text'
  snaps.placeholder = 'my-snap,another-snap'
  const snapsNote = document.createElement('small')
  snapsNote.textContent = 'Optional, comma-separated.'
  snapsLabel.append(snapsTitle, snaps, snapsNote)

  const generated = codeBlock('')
  const updateCommand = (): void => {
    const selected = permissionInputs.filter((input) => input.checked || input.disabled).map((input) => input.value)
    const snapOption = snaps.value.trim() === '' ? '' : ` --snaps=${snaps.value.trim()}`
    generated.setText(`snapcraft export-login --acls=${selected.join(',')}${snapOption} --expires=${expiry.value} snax-login.txt`)
  }
  expiry.addEventListener('input', updateCommand)
  snaps.addEventListener('input', updateCommand)
  for (const input of permissionInputs) input.addEventListener('change', updateCommand)
  updateCommand()

  const exportNote = document.createElement('p')
  exportNote.className = 'hint'
  exportNote.textContent = 'snapcraft will ask for your Ubuntu One email, password and second factor, then write the token to snax-login.txt.'
  const catCode = codeBlock('cat snax-login.txt')
  const catNote = document.createElement('p')
  catNote.className = 'hint'
  catNote.textContent = 'Copy the whole output (one long line).'
  commandForm.append(expiryLabel, permissionGroup, snapsLabel, generated.element, exportNote, catCode.element, catNote)
  exportSection.append(commandForm)

  const loginSection = document.createElement('section')
  loginSection.className = 'step'
  loginSection.append(stepHeading(3, 'Paste the token.'))
  const loginForm = document.createElement('form')
  const textarea = document.createElement('textarea')
  textarea.rows = 6
  textarea.spellcheck = false
  textarea.autocomplete = 'off'
  textarea.placeholder = 'Paste the contents of snax-login.txt'
  textarea.setAttribute('aria-label', 'Exported login token')
  const submit = document.createElement('button')
  submit.type = 'submit'
  submit.className = 'primary'
  submit.textContent = 'Log in'
  const status = document.createElement('p')
  status.className = 'status'
  status.setAttribute('role', 'status')
  loginForm.append(textarea, submit, status)

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    status.className = 'status'
    let creds
    try {
      creds = parseCredentials(textarea.value)
    } catch (error) {
      status.classList.add('error')
      status.textContent = error instanceof CredentialsParseError ? error.message : 'The token could not be parsed.'
      return
    }

    submit.disabled = true
    status.textContent = 'Checking with the Snap Store…'
    try {
      const account = await fetchAccount(creds)
      saveCredentialsText(textarea.value)
      saveCachedAccount(account)
      renderAccount(root, creds)
    } catch (error) {
      status.classList.add('error')
      if (error instanceof StoreError && error.status === 401) {
        status.textContent = `The Snap Store rejected this token (${error.message}). It may have expired or been revoked — export a new one.`
      } else if (error instanceof StoreError) {
        status.textContent = `The Snap Store returned status ${error.status}: ${error.message}`
      } else if (error instanceof NetworkError) {
        status.textContent = error.message
      } else {
        status.textContent = 'Could not check the token. Please try again.'
      }
      submit.disabled = false
    }
  })

  const privacy = document.createElement('p')
  privacy.className = 'privacy'
  privacy.textContent = "Your token is stored only in this browser's local storage and is only ever sent to dashboard.snapcraft.io. Delete it any time with Log out. Tip: run snapcraft export-login with a short expiry and only the permissions you need."
  loginSection.append(loginForm, privacy)

  main.append(installSection, exportSection, loginSection)
  root.append(main)
}
