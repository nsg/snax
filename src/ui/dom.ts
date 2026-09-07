export type DomChild = Node | string | number | false | null | undefined | readonly DomChild[]

type EventHandler = { bivarianceHack(event: Event): void }['bivarianceHack']

export interface ElementProps {
  attrs?: Readonly<Record<string, string | number | boolean | null | undefined>>
  dataset?: Readonly<Record<string, string | number | undefined>>
  on?: Readonly<Record<string, EventHandler>>
  [property: string]: unknown
}

export function text(value: string | number): Text {
  return document.createTextNode(String(value))
}

function appendChild(parent: Node, child: DomChild): void {
  if (child === null || child === undefined || child === false) return

  if (Array.isArray(child)) {
    for (const nestedChild of child) appendChild(parent, nestedChild)
    return
  }

  parent.appendChild(child instanceof Node ? child : text(child as string | number))
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps | null = null,
  children: DomChild = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)

  if (props !== null) {
    const { attrs, dataset, on, ...properties } = props

    for (const [name, value] of Object.entries(properties)) {
      if (value === null || value === undefined || value === false) continue
      if (name in element) {
        Reflect.set(element, name, value)
      } else {
        element.setAttribute(name, value === true ? '' : String(value))
      }
    }

    if (attrs !== undefined) {
      for (const [name, value] of Object.entries(attrs)) {
        if (value === null || value === undefined || value === false) continue
        element.setAttribute(name, value === true ? '' : String(value))
      }
    }

    if (dataset !== undefined) {
      for (const [name, value] of Object.entries(dataset)) {
        if (value !== undefined) element.dataset[name] = String(value)
      }
    }

    if (on !== undefined) {
      for (const [eventName, listener] of Object.entries(on)) {
        element.addEventListener(eventName, listener)
      }
    }
  }

  appendChild(element, children)
  return element
}
