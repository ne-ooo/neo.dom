/**
 * @lpm.dev/neo.dom - Element Implementation
 *
 * Represents an HTML element
 */

import type {
  Element as IElement,
  HTMLTemplateElement as IHTMLTemplateElement,
  Attr,
  NamedNodeMap,
} from '../types.js'
import { assertCanonicalNode, Node, registerConcreteNode } from './node.js'
import { DocumentFragment, Text } from './document.js'
import {
  type CanonicalElementSerializationState,
  ElementMetadataField,
  registerTemplateContent,
  setCanonicalParsedAttribute,
} from './element-state.js'
import {
  getCanonicalParentNode,
  removeCanonicalNode,
  replaceCanonicalNodeWithNodes,
} from './node-state.js'
import { HTML_NAMESPACE, NodeType } from '../utils/constants.js'
import { serializeChildren } from '../utils/serializer.js'
import { asciiLowercase, asciiUppercase, validateMarkupName } from '../utils/names.js'

const PARSED_MARKUP_NAME = Symbol('parsed-markup-name')
const NO_ATTRIBUTES: readonly Attr[] = Object.freeze([])

/**
 * Attribute implementation
 */
class AttrImpl implements Attr {
  readonly name!: string
  value: string

  constructor(name: string, value: string) {
    Object.defineProperty(this, 'name', {
      value: name,
      enumerable: true,
      writable: false,
      configurable: false,
    })
    this.value = value
  }
}

/**
 * NamedNodeMap implementation (collection of attributes)
 */
class NamedNodeMapImpl implements NamedNodeMap {
  readonly #attrs = new Map<string, Attr>()
  #indexedAttrs: Attr[] | null = null
  readonly #caseInsensitive: boolean

  constructor(caseInsensitive: boolean) {
    this.#caseInsensitive = caseInsensitive
  }

  get length(): number {
    return this.#attrs.size
  }

  item(index: number): Attr | null {
    if (!this.#indexedAttrs) this.#indexedAttrs = Array.from(this.#attrs.values())
    return this.#indexedAttrs[index] ?? null
  }

  getNamedItem(name: string): Attr | null {
    return this.#attrs.get(this.#normalizeName(name)) ?? null
  }

  setNamedItem(attr: Attr): Attr | null {
    return this.#storeNamedItem(attr, true)
  }

  setParsedNamedItem(attr: Attr): Attr | null {
    return this.#storeNamedItem(attr, false)
  }

  #storeNamedItem(attr: Attr, validate: boolean): Attr | null {
    const name = this.#normalizeName(attr.name)
    if (validate) validateMarkupName(name)
    const oldAttr = this.#attrs.get(name) ?? null
    const storedAttr = new AttrImpl(name, attr.value)
    this.#attrs.set(name, storedAttr)
    this.#indexedAttrs = null
    return oldAttr
  }

  removeNamedItem(name: string): Attr | null {
    const normalizedName = this.#normalizeName(name)
    const attr = this.#attrs.get(normalizedName) ?? null
    if (attr) {
      this.#attrs.delete(normalizedName)
      this.#indexedAttrs = null
    }
    return attr
  }

  [index: number]: Attr

  // Make it iterable
  *[Symbol.iterator]() {
    yield* this.#attrs.values()
  }

  readStoredAttributes(): IterableIterator<Attr> {
    return this.#attrs.values()
  }

  #normalizeName(name: string): string {
    return this.#caseInsensitive ? asciiLowercase(name) : name
  }
}

const readStoredAttributes = NamedNodeMapImpl.prototype.readStoredAttributes
const setParsedNamedItem = NamedNodeMapImpl.prototype.setParsedNamedItem
Object.freeze(NamedNodeMapImpl.prototype)

function createNamedNodeMapView(attributes: NamedNodeMapImpl): NamedNodeMap {
  let boundMethods: Map<PropertyKey, {
    source: (...args: unknown[]) => unknown
    bound: (...args: unknown[]) => unknown
  }> | null = null
  const view = new Proxy(attributes, {
    get(target, property) {
      if (typeof property === 'string' && /^(0|[1-9]\d*)$/.test(property)) {
        return target.item(Number(property))
      }
      if (property === 'readStoredAttributes' || property === 'setParsedNamedItem') {
        return undefined
      }
      const value = Reflect.get(target, property, target) as unknown
      if (typeof value !== 'function') return value
      const source = value as (...args: unknown[]) => unknown
      const cached = boundMethods?.get(property)
      if (cached?.source === source) return cached.bound
      const bound = source.bind(target) as (...args: unknown[]) => unknown
      if (!boundMethods) boundMethods = new Map()
      boundMethods.set(property, { source, bound })
      return bound
    },
    set() {
      return false
    },
    defineProperty() {
      return false
    },
    deleteProperty() {
      return false
    },
    setPrototypeOf() {
      return false
    },
  })
  return view
}

/**
 * Element class
 */
export class Element extends Node implements IElement {
  readonly #tagName!: string
  readonly #localName!: string
  readonly #namespaceURI!: string
  #attributes: NamedNodeMapImpl | null = null
  #attributesView: NamedNodeMap | null = null

  constructor(
    tagName: string,
    namespaceURI: string = HTML_NAMESPACE,
    parsedName?: typeof PARSED_MARKUP_NAME
  ) {
    if (
      new.target === Element &&
      parsedName !== PARSED_MARKUP_NAME &&
      namespaceURI === HTML_NAMESPACE &&
      tagName.length === 8 &&
      asciiLowercase(tagName) === 'template'
    ) {
      return new HTMLTemplateElement()
    }
    if (parsedName !== PARSED_MARKUP_NAME) validateMarkupName(tagName)
    const normalizedTagName = namespaceURI === HTML_NAMESPACE
      ? asciiUppercase(tagName)
      : tagName
    const localName = namespaceURI === HTML_NAMESPACE ? asciiLowercase(tagName) : tagName

    super(NodeType.ELEMENT_NODE, normalizedTagName, null)
    this.#tagName = normalizedTagName
    this.#localName = localName
    this.#namespaceURI = namespaceURI
    registerConcreteNode(this, this.#readCanonicalElementMetadata)
  }

  get tagName(): string {
    return this.#tagName
  }

  get localName(): string {
    return this.#localName
  }

  get namespaceURI(): string {
    return this.#namespaceURI
  }

  #readCanonicalElementMetadata(
    field: number,
    name?: unknown,
    value?: unknown
  ): unknown {
    if (field === ElementMetadataField.TAG_NAME) return this.#tagName
    if (field === ElementMetadataField.LOCAL_NAME) return this.#localName
    if (field === ElementMetadataField.ATTRIBUTES) {
      return this.#attributes
        ? Reflect.apply(readStoredAttributes, this.#attributes, [])
        : null
    }
    if (field === ElementMetadataField.PARSED_ATTRIBUTE) {
      if (typeof name !== 'string' || typeof value !== 'string') {
        throw new TypeError('Parsed attributes require string names and values')
      }
      Reflect.apply(setParsedNamedItem, this.#getOrCreateAttributeStorage(), [
        new AttrImpl(name, value),
      ])
      return null
    }
    if (field === ElementMetadataField.SERIALIZATION_STATE) {
      const state = name as CanonicalElementSerializationState
      state.tagName = this.#tagName
      state.localName = this.#localName
      state.namespaceURI = this.#namespaceURI
      state.attributes = this.#attributes
        ? Reflect.apply(readStoredAttributes, this.#attributes, [])
        : NO_ATTRIBUTES
      return null
    }
    return this.#namespaceURI
  }

  #getOrCreateAttributeStorage(): NamedNodeMapImpl {
    if (!this.#attributes) {
      this.#attributes = new NamedNodeMapImpl(this.#namespaceURI === HTML_NAMESPACE)
      Object.freeze(this.#attributes)
    }
    return this.#attributes
  }

  get attributes(): NamedNodeMap {
    const attributes = this.#getOrCreateAttributeStorage()
    if (!this.#attributesView) {
      this.#attributesView = createNamedNodeMapView(attributes)
    }
    return this.#attributesView!
  }

  get innerHTML(): string {
    // Import serializer dynamically to avoid circular dependency
    return serializeChildren(this)
  }

  set innerHTML(html: string) {
    // This focused DOM does not implement fragment parsing for assignment.
    this.textContent = html
  }

  getAttribute(name: string): string | null {
    const attr = this.#attributes?.getNamedItem(name)
    return attr ? attr.value : null
  }

  setAttribute(name: string, value: string): void {
    const attr = new AttrImpl(name, value)
    this.#getOrCreateAttributeStorage().setNamedItem(attr)
  }

  removeAttribute(name: string): void {
    this.#attributes?.removeNamedItem(name)
  }

  hasAttribute(name: string): boolean {
    return this.#attributes ? this.#attributes.getNamedItem(name) !== null : false
  }

  remove(): void {
    removeCanonicalNode(this)
  }

  replaceWith(...nodes: (Node | string)[]): void {
    if (!getCanonicalParentNode<Node>(this)) return
    const normalizedNodes = nodes.map(node => {
      if (typeof node !== 'string') assertCanonicalNode(node, 'node')
      return typeof node === 'string' ? new Text(node) : node
    })
    replaceCanonicalNodeWithNodes(this, normalizedNodes)
  }

  protected override cloneShallow(): Element {
    const clone = createParsedElement(this.#localName, this.#namespaceURI)
    if (this.#attributes) {
      const attributes = Reflect.apply(readStoredAttributes, this.#attributes, [])
      for (const attribute of attributes) {
        setParsedAttribute(clone, attribute.name, attribute.value)
      }
    }
    return clone
  }

  protected override createTextContentNode(value: string): Text {
    return new Text(value)
  }
}

/** HTML template element whose children live in an inert content fragment. */
export class HTMLTemplateElement extends Element implements IHTMLTemplateElement {
  readonly #content: DocumentFragment

  constructor() {
    super('template', HTML_NAMESPACE, PARSED_MARKUP_NAME)
    this.#content = new DocumentFragment()
    registerTemplateContent(this, this.#content)
  }

  get content(): DocumentFragment {
    return this.#content
  }

  override get innerHTML(): string {
    return serializeChildren(this.#content)
  }

  override set innerHTML(html: string) {
    this.#content.textContent = html
  }

}

/** Internal parser path for HTML names that the tokenizer has already delimited safely. */
export function createParsedElement(tagName: string, namespaceURI: string): Element {
  if (namespaceURI === HTML_NAMESPACE && tagName === 'template') {
    return new HTMLTemplateElement()
  }
  return new Element(tagName, namespaceURI, PARSED_MARKUP_NAME)
}

/** Public document factory that returns the specialized HTML template class. */
export function createHTMLElement(tagName: string): Element {
  return tagName.length === 8 && asciiLowercase(tagName) === 'template'
    ? new HTMLTemplateElement()
    : new Element(tagName)
}

/** Internal parser path for attribute names already delimited by the HTML tokenizer. */
export function setParsedAttribute(element: Element, name: string, value: string): void {
  setCanonicalParsedAttribute(element, name, value)
}
