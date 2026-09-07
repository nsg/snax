import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource/ubuntu-mono/400.css'
import '@fontsource/ubuntu-mono/700.css'
import './style.css'
import { startRouter } from './router'

const app = document.querySelector<HTMLElement>('#app')

if (app === null) {
  throw new Error('Missing #app element')
}

startRouter(app)
