import './style.css'
import { parseCredentials } from './credentials'
import { loadCredentialsText } from './storage'
import { renderAccount } from './views/account'
import { renderLogin } from './views/login'

const app = document.querySelector<HTMLElement>('#app')

if (app === null) {
  throw new Error('Missing #app element')
}

const credentialsText = loadCredentialsText()

if (credentialsText !== null) {
  try {
    renderAccount(app, parseCredentials(credentialsText))
  } catch {
    renderLogin(app)
  }
} else {
  renderLogin(app)
}
