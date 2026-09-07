import { el, text } from './dom'

export interface CommandPart {
  text: string
  value?: boolean
}

export type CommandLine = readonly CommandPart[]

export interface TerminalCommand {
  lines: readonly CommandLine[]
  copyText?: string
  copyLabel?: string
}

export interface CopyButtonOptions {
  getText: () => string
  selectionTarget?: Node
  ariaLabel?: string
  className?: string
}

export interface CopyButton {
  button: HTMLButtonElement
  destroy: () => void
}

function selectNodeContents(node: Node): void {
  const selection = window.getSelection()
  if (selection === null) return

  const range = document.createRange()
  range.selectNodeContents(node)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function createCopyButton(options: CopyButtonOptions): CopyButton {
  const button = el('button', {
    type: 'button',
    className: options.className ?? 'terminal-copy',
    attrs: { 'aria-label': options.ariaLabel ?? 'Copy command' },
  }, 'Copy')
  let resetTimer: number | undefined
  let destroyed = false

  const markCopied = (): void => {
    if (destroyed) return
    button.textContent = 'Copied'
    if (resetTimer !== undefined) window.clearTimeout(resetTimer)
    resetTimer = window.setTimeout(() => {
      button.textContent = 'Copy'
      resetTimer = undefined
    }, 1500)
  }

  const fallback = (): void => {
    if (options.selectionTarget !== undefined) selectNodeContents(options.selectionTarget)
    markCopied()
  }

  const handleClick = (): void => {
    const clipboard = navigator.clipboard
    if (clipboard === undefined) {
      fallback()
      return
    }

    void clipboard.writeText(options.getText()).then(markCopied, fallback)
  }

  button.addEventListener('click', handleClick)

  return {
    button,
    destroy(): void {
      destroyed = true
      button.removeEventListener('click', handleClick)
      if (resetTimer !== undefined) window.clearTimeout(resetTimer)
    },
  }
}

interface CommandState {
  command: TerminalCommand
  code: HTMLElement
  copy: CopyButton
  values?: Map<string, string>
}

export interface TerminalPanel {
  element: HTMLElement
  updateCommand: (index: number, lines: readonly CommandLine[], copyText?: string) => void
  destroy: () => void
}

function displayText(lines: readonly CommandLine[]): string {
  return lines.map((line) => line.map((part) => part.text).join('')).join('\n')
}

function valueTexts(lines: readonly CommandLine[]): Map<string, string> {
  const values = new Map<string, string>()
  for (const line of lines) {
    line.forEach((part, partIndex) => {
      if (part.value !== true) return
      const key = line.slice(0, partIndex).map((prefix) => prefix.text).join('')
      values.set(key, part.text)
    })
  }
  return values
}

function valueNode(value: string): HTMLElement {
  // Break long comma-separated values only after commas, never mid-word.
  const span = el('span', { className: 'terminal-value' })
  const pieces = value.split(',')
  pieces.forEach((piece, index) => {
    if (index > 0) {
      span.append(text(','))
      span.append(el('wbr'))
    }
    span.append(text(piece))
  })
  return span
}

function renderCommand(code: HTMLElement, lines: readonly CommandLine[], previousValues?: ReadonlyMap<string, string>): void {
  code.replaceChildren()

  lines.forEach((line, lineIndex) => {
    const lineElement = el('span', { className: 'terminal-line' })
    if (lineIndex === 0) {
      lineElement.append(el('span', { className: 'terminal-command__prompt', attrs: { 'aria-hidden': 'true' } }, '$ '))
    }

    line.forEach((part, partIndex) => {
      if (part.value !== true) {
        lineElement.append(text(part.text))
        return
      }

      const key = line.slice(0, partIndex).map((prefix) => prefix.text).join('')
      const changed = previousValues !== undefined && previousValues.get(key) !== part.text
      const value = valueNode(part.text)
      if (changed) value.classList.add('is-flashing')
      lineElement.append(value)
    })

    code.append(lineElement)
  })
}

export function createTerminal(commands: readonly TerminalCommand[]): TerminalPanel {
  const element = el('section', { className: 'terminal-panel', attrs: { 'aria-label': 'Terminal commands' } })
  const states: CommandState[] = []

  for (const command of commands) {
    const code = el('code', { className: 'terminal-command__code' })
    renderCommand(code, command.lines)
    const pre = el('pre', { className: 'terminal-command__text' }, code)
    const state: CommandState = {
      command: { ...command },
      code,
      copy: createCopyButton({
        getText: () => state.command.copyText ?? displayText(state.command.lines),
        selectionTarget: code,
        ariaLabel: command.copyLabel ?? 'Copy command',
      }),
      values: valueTexts(command.lines),
    }
    const commandElement = el('div', { className: 'terminal-command' }, [state.copy.button, pre])
    states.push(state)
    element.append(commandElement)
  }

  return {
    element,
    updateCommand(index, lines, copyText): void {
      const state = states[index]
      if (state === undefined) throw new RangeError(`No terminal command at index ${index}`)

      const previousValues = state.values
      state.command = {
        ...state.command,
        lines,
        ...(copyText === undefined ? {} : { copyText }),
      }
      renderCommand(state.code, lines, previousValues)
      state.values = valueTexts(lines)
    },
    destroy(): void {
      for (const state of states) state.copy.destroy()
    },
  }
}
