/**
 * @lpm.dev/neo.dom - Node Implementation
 *
 * Base class for all DOM nodes
 */

import type { Node as INode, NodeList } from '../types.js'
import { NodeType } from '../utils/constants.js'

/**
 * NodeList implementation (array-like collection)
 */
class NodeListImpl implements NodeList {
  private nodes: INode[]

  constructor(nodes: INode[] = []) {
    this.nodes = nodes
  }

  get length(): number {
    return this.nodes.length
  }

  item(index: number): INode | null {
    return this.nodes[index] ?? null
  }

  [index: number]: INode

  // Make it iterable
  *[Symbol.iterator]() {
    yield* this.nodes
  }
}

// Set up array-like indexing
Object.defineProperty(NodeListImpl.prototype, Symbol.iterator, {
  enumerable: false,
})

/**
 * Node base class
 */
export class Node implements INode {
  nodeType: number
  nodeName: string
  private _nodeValue: string | null
  parentNode: INode | null = null
  private _childNodes: INode[] = []

  constructor(nodeType: number, nodeName: string, nodeValue: string | null = null) {
    this.nodeType = nodeType
    this.nodeName = nodeName
    this._nodeValue = nodeValue
  }

  get nodeValue(): string | null {
    return this._nodeValue
  }

  set nodeValue(value: string | null) {
    this._nodeValue = value
  }

  get childNodes(): NodeList {
    const list = new NodeListImpl(this._childNodes)
    // Set up array-like indexing
    for (let i = 0; i < this._childNodes.length; i++) {
      Object.defineProperty(list, i, {
        get: () => this._childNodes[i],
        enumerable: true,
      })
    }
    return list
  }

  get firstChild(): INode | null {
    return this._childNodes[0] ?? null
  }

  get lastChild(): INode | null {
    return this._childNodes[this._childNodes.length - 1] ?? null
  }

  get nextSibling(): INode | null {
    if (!this.parentNode) return null
    const parent = this.parentNode as Node
    const index = parent._childNodes.indexOf(this)
    return parent._childNodes[index + 1] ?? null
  }

  get previousSibling(): INode | null {
    if (!this.parentNode) return null
    const parent = this.parentNode as Node
    const index = parent._childNodes.indexOf(this)
    return index > 0 ? parent._childNodes[index - 1] ?? null : null
  }

  get textContent(): string | null {
    if (this.nodeType === NodeType.TEXT_NODE) {
      return this.nodeValue
    }

    // Recursively get text from all descendant text nodes
    let text = ''
    for (const child of this._childNodes) {
      const childText = child.textContent
      if (childText !== null) {
        text += childText
      }
    }
    return text
  }

  set textContent(value: string | null) {
    // Remove all children and replace with single text node
    this._childNodes = []
    if (value !== null && value !== '') {
      const textNode = new Node(NodeType.TEXT_NODE, '#text', value)
      this.appendChild(textNode)
    }
  }

  appendChild(node: INode): INode {
    // Remove from previous parent
    if (node.parentNode) {
      node.parentNode.removeChild(node)
    }

    // Add to this node
    this._childNodes.push(node)
    ;(node as Node).parentNode = this

    return node
  }

  removeChild(node: INode): INode {
    const index = this._childNodes.indexOf(node)
    if (index === -1) {
      throw new Error('Node not found')
    }

    this._childNodes.splice(index, 1)
    ;(node as Node).parentNode = null

    return node
  }

  replaceChild(newNode: INode, oldNode: INode): INode {
    const index = this._childNodes.indexOf(oldNode)
    if (index === -1) {
      throw new Error('Node not found')
    }

    // Remove from previous parent
    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode)
    }

    this._childNodes[index] = newNode
    ;(newNode as Node).parentNode = this
    ;(oldNode as Node).parentNode = null

    return oldNode
  }

  insertBefore(newNode: INode, refNode: INode | null): INode {
    if (refNode === null) {
      return this.appendChild(newNode)
    }

    const index = this._childNodes.indexOf(refNode)
    if (index === -1) {
      throw new Error('Reference node not found')
    }

    // Remove from previous parent
    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode)
    }

    this._childNodes.splice(index, 0, newNode)
    ;(newNode as Node).parentNode = this

    return newNode
  }

  cloneNode(deep: boolean = false): INode {
    const clone = new Node(this.nodeType, this.nodeName, this.nodeValue)

    if (deep) {
      for (const child of this._childNodes) {
        clone.appendChild(child.cloneNode(true))
      }
    }

    return clone
  }
}
