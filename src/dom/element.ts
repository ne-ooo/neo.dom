/**
 * @lpm.dev/neo.dom - Element Implementation
 *
 * Represents an HTML element
 */

import type { Element as IElement, Attr, NamedNodeMap } from '../types.js'
import { Node } from './node.js'
import { Text } from './document.js'
import { HTML_NAMESPACE, NodeType } from '../utils/constants.js'
import { serializeChildren } from '../utils/serializer.js'

/**
 * Attribute implementation
 */
class AttrImpl implements Attr {
  name: string
  value: string

  constructor(name: string, value: string) {
    this.name = name
    this.value = value
  }
}

/**
 * NamedNodeMap implementation (collection of attributes)
 */
class NamedNodeMapImpl implements NamedNodeMap {
  private attrs: Map<string, Attr>
  private readonly caseInsensitive: boolean

  constructor(caseInsensitive: boolean) {
    this.attrs = new Map()
    this.caseInsensitive = caseInsensitive
  }

  get length(): number {
    return this.attrs.size
  }

  item(index: number): Attr | null {
    const attrs = Array.from(this.attrs.values())
    return attrs[index] ?? null
  }

  getNamedItem(name: string): Attr | null {
    return this.attrs.get(this.normalizeName(name)) ?? null
  }

  setNamedItem(attr: Attr): Attr | null {
    const name = this.normalizeName(attr.name)
    const oldAttr = this.attrs.get(name) ?? null
    const storedAttr = name === attr.name ? attr : new AttrImpl(name, attr.value)
    this.attrs.set(name, storedAttr)
    return oldAttr
  }

  removeNamedItem(name: string): Attr | null {
    const normalizedName = this.normalizeName(name)
    const attr = this.attrs.get(normalizedName) ?? null
    this.attrs.delete(normalizedName)
    return attr
  }

  [index: number]: Attr

  // Make it iterable
  *[Symbol.iterator]() {
    yield* this.attrs.values()
  }

  private normalizeName(name: string): string {
    return this.caseInsensitive ? name.toLowerCase() : name
  }
}

/**
 * Element class
 */
export class Element extends Node implements IElement {
  tagName: string
  readonly localName: string
  readonly namespaceURI: string
  attributes: NamedNodeMap

  constructor(tagName: string, namespaceURI: string = HTML_NAMESPACE) {
    const normalizedTagName = namespaceURI === HTML_NAMESPACE
      ? tagName.toUpperCase()
      : tagName

    super(NodeType.ELEMENT_NODE, normalizedTagName, null)
    this.tagName = normalizedTagName
    this.localName = namespaceURI === HTML_NAMESPACE ? tagName.toLowerCase() : tagName
    this.namespaceURI = namespaceURI
    this.attributes = new NamedNodeMapImpl(namespaceURI === HTML_NAMESPACE)
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
    const attr = this.attributes.getNamedItem(name)
    return attr ? attr.value : null
  }

  setAttribute(name: string, value: string): void {
    const attr = new AttrImpl(name, value)
    this.attributes.setNamedItem(attr)
  }

  removeAttribute(name: string): void {
    this.attributes.removeNamedItem(name)
  }

  hasAttribute(name: string): boolean {
    return this.attributes.getNamedItem(name) !== null
  }

  remove(): void {
    if (this.parentNode) {
      this.parentNode.removeChild(this)
    }
  }

  replaceWith(...nodes: (Node | string)[]): void {
    if (!this.parentNode) {
      return
    }

    const parent = this.parentNode

    // Convert strings to text nodes
    const nodeList = nodes.map(node => {
      if (typeof node === 'string') {
        return new Text(node)
      }
      return node
    })

    // Insert all nodes before this element
    for (const node of nodeList) {
      parent.insertBefore(node, this)
    }

    // Remove this element
    parent.removeChild(this)
  }

  protected override cloneShallow(): Element {
    const clone = new Element(this.localName, this.namespaceURI)
    for (let index = 0; index < this.attributes.length; index++) {
      const attribute = this.attributes.item(index)
      if (attribute) clone.setAttribute(attribute.name, attribute.value)
    }
    return clone
  }

  protected override createTextContentNode(value: string): Text {
    return new Text(value)
  }
}
