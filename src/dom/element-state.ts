import type { Attr, Element, NamedNodeMap } from '../types.js'

const lazyElements = new WeakSet<Element>()
const EMPTY_ATTRIBUTES: readonly Attr[] = Object.freeze([])

/** Mark an element whose attribute collection uses neo.dom's lazy storage. */
export function registerLazyElement(element: Element): void {
  lazyElements.add(element)
}

/** Read local attribute storage without creating a public NamedNodeMap. */
export function getStoredAttributes(element: Element): Iterable<Attr> | undefined {
  if (!lazyElements.has(element)) return undefined
  return (Reflect.get(element, '_attributes') as NamedNodeMap | null) ?? EMPTY_ATTRIBUTES
}
