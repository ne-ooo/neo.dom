import type { Attr, Element, Node } from '../types.js'
import { getConcreteNodeState } from './node-state.js'

export const ElementMetadataField = {
  TAG_NAME: 0,
  LOCAL_NAME: 1,
  NAMESPACE_URI: 2,
  ATTRIBUTES: 3,
  PARSED_ATTRIBUTE: 4,
  SERIALIZATION_STATE: 5,
} as const

type CanonicalElementReader = (field: number, ...args: unknown[]) => unknown

const templateContents = new WeakMap<Element, Node>()
const templateHosts = new WeakMap<Node, Element>()
const EMPTY_ATTRIBUTES: readonly Attr[] = Object.freeze([])

export interface CanonicalElementSerializationState {
  tagName: string
  localName: string
  namespaceURI: string
  attributes: Iterable<Attr>
}

/** Read structural metadata that cannot be shadowed through public properties. */
export function getCanonicalElementMetadataField(
  element: Element,
  field: number
): string | undefined {
  const reader = getConcreteNodeState(element) as CanonicalElementReader | null | undefined
  const value = typeof reader === 'function'
    ? Reflect.apply(reader, element, [field])
    : undefined
  return typeof value === 'string' ? value : undefined
}

/** Associate an HTML template with its inert content fragment. */
export function registerTemplateContent(element: Element, content: Node): void {
  templateContents.set(element, content)
  templateHosts.set(content, element)
}

/** Read a template's content fragment without consulting shadowable fields. */
export function getTemplateContent(element: Element): Node | undefined {
  return templateContents.get(element)
}

/** Read the template that owns an inert content fragment. */
export function getTemplateHost(content: Node): Element | undefined {
  return templateHosts.get(content)
}

/** Read local attribute storage without creating a public NamedNodeMap. */
export function getStoredAttributes(element: Element): Iterable<Attr> | undefined {
  const reader = getConcreteNodeState(element) as CanonicalElementReader | null | undefined
  if (typeof reader !== 'function') return undefined
  return (
    Reflect.apply(reader, element, [ElementMetadataField.ATTRIBUTES]) as
      | Iterable<Attr>
      | null
  ) ?? EMPTY_ATTRIBUTES
}

/** Store one tokenizer-delimited attribute through canonical private storage. */
export function setCanonicalParsedAttribute(
  element: Element,
  name: string,
  value: string
): void {
  const reader = getConcreteNodeState(element) as CanonicalElementReader | null | undefined
  if (typeof reader !== 'function') {
    throw new TypeError('Missing canonical attribute storage')
  }
  Reflect.apply(reader, element, [ElementMetadataField.PARSED_ATTRIBUTE, name, value])
}

/** Populate one reusable serializer record with canonical element state. */
export function populateCanonicalElementSerializationState(
  element: Element,
  state: CanonicalElementSerializationState
): boolean {
  const reader = getConcreteNodeState(element) as CanonicalElementReader | null | undefined
  if (typeof reader !== 'function') return false
  Reflect.apply(reader, element, [ElementMetadataField.SERIALIZATION_STATE, state])
  return true
}
