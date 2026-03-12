/**
 * @lpm.dev/neo.dom - Element Implementation
 *
 * Represents an HTML element
 */

import type { Element as IElement, Attr, NamedNodeMap } from '../types.js'
import { Node } from './node.js'
import { NodeType } from '../utils/constants.js'
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

  constructor() {
    this.attrs = new Map()
  }

  get length(): number {
    return this.attrs.size
  }

  item(index: number): Attr | null {
    const attrs = Array.from(this.attrs.values())
    return attrs[index] ?? null
  }

  getNamedItem(name: string): Attr | null {
    return this.attrs.get(name) ?? null
  }

  setNamedItem(attr: Attr): Attr | null {
    const oldAttr = this.attrs.get(attr.name) ?? null
    this.attrs.set(attr.name, attr)
    return oldAttr
  }

  removeNamedItem(name: string): Attr | null {
    const attr = this.attrs.get(name) ?? null
    this.attrs.delete(name)
    return attr
  }

  [index: number]: Attr

  // Make it iterable
  *[Symbol.iterator]() {
    yield* this.attrs.values()
  }
}

/**
 * Element class
 */
export class Element extends Node implements IElement {
  tagName: string
  attributes: NamedNodeMap

  constructor(tagName: string) {
    super(NodeType.ELEMENT_NODE, tagName.toUpperCase(), null)
    this.tagName = tagName.toUpperCase()
    this.attributes = new NamedNodeMapImpl()
  }

  get innerHTML(): string {
    // Import serializer dynamically to avoid circular dependency
    return serializeChildren(this)
  }

  set innerHTML(html: string) {
    // Clear children
    while (this.firstChild) {
      this.removeChild(this.firstChild)
    }

    // Parse and append new children (implemented later)
    // For now, just create a text node
    if (html) {
      const textNode = new Node(NodeType.TEXT_NODE, '#text', html)
      this.appendChild(textNode)
    }
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
        return new Node(NodeType.TEXT_NODE, '#text', node)
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
}
