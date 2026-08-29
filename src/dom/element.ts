/**
 * @lpm.dev/neo.dom - Element Implementation
 *
 * Represents an HTML element
 */

import type { Element as IElement, Attr, NamedNodeMap } from '../types.js'
import { assertCanonicalNode, Node } from './node.js'
import { DocumentFragment, Text } from './document.js'
import { registerLazyElement } from './element-state.js'
import { HTML_NAMESPACE, NodeType } from '../utils/constants.js'
import { serializeChildren } from '../utils/serializer.js'
import { asciiLowercase, asciiUppercase, validateMarkupName } from '../utils/names.js'

const PARSED_MARKUP_NAME = Symbol('parsed-markup-name')

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
  private readonly attrs = new Map<string, Attr>()
  private indexedAttrs: Attr[] | null = null
  private readonly caseInsensitive: boolean

  constructor(caseInsensitive: boolean) {
    this.caseInsensitive = caseInsensitive
  }

  get length(): number {
    return this.attrs.size
  }

  item(index: number): Attr | null {
    if (!this.indexedAttrs) this.indexedAttrs = Array.from(this.attrs.values())
    return this.indexedAttrs[index] ?? null
  }

  getNamedItem(name: string): Attr | null {
    return this.attrs.get(this.normalizeName(name)) ?? null
  }

  setNamedItem(attr: Attr): Attr | null {
    return this.storeNamedItem(attr, true)
  }

  setParsedNamedItem(attr: Attr): Attr | null {
    return this.storeNamedItem(attr, false)
  }

  private storeNamedItem(attr: Attr, validate: boolean): Attr | null {
    const name = this.normalizeName(attr.name)
    if (validate) validateMarkupName(name)
    const oldAttr = this.attrs.get(name) ?? null
    const storedAttr = new AttrImpl(name, attr.value)
    this.attrs.set(name, storedAttr)
    this.indexedAttrs = null
    return oldAttr
  }

  removeNamedItem(name: string): Attr | null {
    const normalizedName = this.normalizeName(name)
    const attr = this.attrs.get(normalizedName) ?? null
    if (attr) {
      this.attrs.delete(normalizedName)
      this.indexedAttrs = null
    }
    return attr
  }

  [index: number]: Attr

  // Make it iterable
  *[Symbol.iterator]() {
    yield* this.attrs.values()
  }

  private normalizeName(name: string): string {
    return this.caseInsensitive ? asciiLowercase(name) : name
  }
}

function createNamedNodeMap(caseInsensitive: boolean): NamedNodeMap {
  const attributes = new NamedNodeMapImpl(caseInsensitive)
  return new Proxy(attributes, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^(0|[1-9]\d*)$/.test(property)) {
        return target.item(Number(property))
      }
      return Reflect.get(target, property, receiver)
    },
    set(target, property, value, receiver) {
      if (typeof property === 'string' && /^(0|[1-9]\d*)$/.test(property)) {
        return false
      }
      return Reflect.set(target, property, value, receiver)
    },
  })
}

/**
 * Element class
 */
export class Element extends Node implements IElement {
  readonly tagName!: string
  readonly localName!: string
  readonly namespaceURI!: string
  private _attributes: NamedNodeMap | null = null

  constructor(
    tagName: string,
    namespaceURI: string = HTML_NAMESPACE,
    parsedName?: typeof PARSED_MARKUP_NAME
  ) {
    if (parsedName !== PARSED_MARKUP_NAME) validateMarkupName(tagName)
    const normalizedTagName = namespaceURI === HTML_NAMESPACE
      ? asciiUppercase(tagName)
      : tagName
    const localName = namespaceURI === HTML_NAMESPACE ? asciiLowercase(tagName) : tagName

    super(NodeType.ELEMENT_NODE, normalizedTagName, null)
    registerLazyElement(this)
    Object.defineProperties(this, {
      tagName: immutableEnumerableProperty(normalizedTagName),
      localName: immutableEnumerableProperty(localName),
      namespaceURI: immutableEnumerableProperty(namespaceURI),
    })
  }

  get attributes(): NamedNodeMap {
    if (!this._attributes) {
      this._attributes = createNamedNodeMap(this.namespaceURI === HTML_NAMESPACE)
    }
    return this._attributes
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
    const attr = this._attributes?.getNamedItem(name)
    return attr ? attr.value : null
  }

  setAttribute(name: string, value: string): void {
    const attr = new AttrImpl(name, value)
    this.attributes.setNamedItem(attr)
  }

  removeAttribute(name: string): void {
    this._attributes?.removeNamedItem(name)
  }

  hasAttribute(name: string): boolean {
    return this._attributes ? this._attributes.getNamedItem(name) !== null : false
  }

  remove(): void {
    if (this.parentNode) {
      this.parentNode.removeChild(this)
    }
  }

  replaceWith(...nodes: (Node | string)[]): void {
    const parent = this.parentNode
    if (!parent) return
    assertCanonicalNode(parent, 'parentNode')

    const nodeArguments: Node[] = []
    for (const node of nodes) {
      if (typeof node === 'string') continue
      assertCanonicalNode(node, 'node')
      nodeArguments.push(node)
    }

    const nodeArgumentSet = new Set(nodeArguments)
    let viableNextSibling = this.nextSibling
    while (viableNextSibling && nodeArgumentSet.has(viableNextSibling as Node)) {
      viableNextSibling = viableNextSibling.nextSibling
    }

    const normalizedNodes = nodes.map(node => {
      return typeof node === 'string' ? new Text(node) : node
    })

    const finalNodes: Node[] = []
    const seenNodes = new Set<Node>()
    for (let index = normalizedNodes.length - 1; index >= 0; index--) {
      const node = normalizedNodes[index]
      if (!node || seenNodes.has(node)) continue
      seenNodes.add(node)
      finalNodes.push(node)
    }
    finalNodes.reverse()

    this.detachNodesForMutation(nodeArguments)

    let replacement: Node
    if (nodes.length === 1) {
      replacement = finalNodes[0]!
    } else {
      const fragment = new DocumentFragment()
      for (const node of finalNodes) fragment.appendChild(node)
      replacement = fragment
    }

    if (this.parentNode === parent) {
      parent.replaceChild(replacement, this)
    } else {
      parent.insertBefore(replacement, viableNextSibling)
    }
  }

  protected override cloneShallow(): Element {
    const clone = createParsedElement(this.localName, this.namespaceURI)
    if (this._attributes) {
      for (const attribute of this._attributes) {
        setParsedAttribute(clone, attribute.name, attribute.value)
      }
    }
    return clone
  }

  protected override createTextContentNode(value: string): Text {
    return new Text(value)
  }
}

/** Internal parser path for HTML names that the tokenizer has already delimited safely. */
export function createParsedElement(tagName: string, namespaceURI: string): Element {
  return new Element(tagName, namespaceURI, PARSED_MARKUP_NAME)
}

/** Internal parser path for attribute names already delimited by the HTML tokenizer. */
export function setParsedAttribute(element: Element, name: string, value: string): void {
  const attributes = element.attributes as NamedNodeMapImpl
  attributes.setParsedNamedItem(new AttrImpl(name, value))
}

function immutableEnumerableProperty(value: unknown): PropertyDescriptor {
  return {
    value,
    enumerable: true,
    writable: false,
    configurable: false,
  }
}
