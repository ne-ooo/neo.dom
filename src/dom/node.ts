/**
 * @lpm.dev/neo.dom - Node Implementation
 *
 * Base class for all DOM nodes
 */

import type { Node as INode, NodeList } from '../types.js'
import { NodeType } from '../utils/constants.js'

/** A live, array-like view over a node's child array. */
class NodeListImpl implements NodeList {
  constructor(private readonly nodes: INode[]) {}

  get length(): number {
    return this.nodes.length
  }

  item(index: number): INode | null {
    return this.nodes[index] ?? null
  }

  [index: number]: INode

  *[Symbol.iterator](): IterableIterator<INode> {
    yield* this.nodes
  }
}

function createLiveNodeList(nodes: INode[]): NodeList {
  return new Proxy(new NodeListImpl(nodes), {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^(0|[1-9]\d*)$/.test(property)) {
        return nodes[Number(property)]
      }
      return Reflect.get(target, property, receiver)
    },
  })
}

/**
 * Node base class
 */
export class Node implements INode {
  nodeType: number
  nodeName: string
  private _nodeValue: string | null
  parentNode: INode | null = null
  private readonly _childNodes: INode[] = []
  private readonly _childNodesList: NodeList
  private _nextSibling: INode | null = null
  private _previousSibling: INode | null = null

  constructor(nodeType: number, nodeName: string, nodeValue: string | null = null) {
    this.nodeType = nodeType
    this.nodeName = nodeName
    this._nodeValue = nodeValue
    this._childNodesList = createLiveNodeList(this._childNodes)
  }

  get nodeValue(): string | null {
    return this._nodeValue
  }

  set nodeValue(value: string | null) {
    this._nodeValue = value
  }

  get childNodes(): NodeList {
    return this._childNodesList
  }

  get firstChild(): INode | null {
    return this._childNodes[0] ?? null
  }

  get lastChild(): INode | null {
    return this._childNodes[this._childNodes.length - 1] ?? null
  }

  get nextSibling(): INode | null {
    return this.parentNode ? this._nextSibling : null
  }

  get previousSibling(): INode | null {
    return this.parentNode ? this._previousSibling : null
  }

  get textContent(): string | null {
    if (this.nodeType === NodeType.TEXT_NODE || this.nodeType === NodeType.COMMENT_NODE) {
      return this.nodeValue
    }

    if (
      this.nodeType !== NodeType.ELEMENT_NODE &&
      this.nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      return null
    }

    const chunks: string[] = []
    const stack = [...this._childNodes].reverse()

    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) continue

      if (current.nodeType === NodeType.TEXT_NODE) {
        chunks.push(current.nodeValue ?? '')
        continue
      }

      const children = current.childNodes
      for (let index = children.length - 1; index >= 0; index--) {
        const child = children.item(index)
        if (child) stack.push(child)
      }
    }

    return chunks.join('')
  }

  set textContent(value: string | null) {
    if (this.nodeType === NodeType.TEXT_NODE || this.nodeType === NodeType.COMMENT_NODE) {
      this.nodeValue = value
      return
    }

    if (
      this.nodeType !== NodeType.ELEMENT_NODE &&
      this.nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      return
    }

    for (const child of this._childNodes) {
      child.parentNode = null
      Node.clearSiblingLinks(child)
    }
    this._childNodes.splice(0, this._childNodes.length)

    if (value !== null && value !== '') {
      this.appendChild(this.createTextContentNode(value))
    }
  }

  appendChild(node: INode): INode {
    this.preInsert(node, null, null)
    return node
  }

  removeChild(node: INode): INode {
    const index = this._childNodes.indexOf(node)
    if (index === -1) {
      throw new Error('Node not found')
    }

    const previous = this._childNodes[index - 1] ?? null
    const next = this._childNodes[index + 1] ?? null
    this._childNodes.splice(index, 1)
    Node.setNextSibling(previous, next)
    Node.setPreviousSibling(next, previous)
    node.parentNode = null
    Node.clearSiblingLinks(node)
    return node
  }

  replaceChild(newNode: INode, oldNode: INode): INode {
    if (this._childNodes.indexOf(oldNode) === -1) {
      throw new Error('Node not found')
    }
    if (newNode === oldNode) {
      return oldNode
    }

    this.preInsert(newNode, null, oldNode)
    return oldNode
  }

  insertBefore(newNode: INode, refNode: INode | null): INode {
    if (refNode !== null && this._childNodes.indexOf(refNode) === -1) {
      throw new Error('Reference node not found')
    }
    if (newNode === refNode) {
      return newNode
    }

    this.preInsert(newNode, refNode, null)
    return newNode
  }

  cloneNode(deep: boolean = false): INode {
    const rootClone = this.cloneShallow()
    if (!deep) return rootClone

    const stack: Array<{ source: INode; target: Node }> = [
      { source: this, target: rootClone },
    ]

    while (stack.length > 0) {
      const frame = stack.pop()
      if (!frame) continue

      const childFrames: Array<{ source: INode; target: Node }> = []
      for (let index = 0; index < frame.source.childNodes.length; index++) {
        const sourceChild = frame.source.childNodes.item(index)
        if (!sourceChild) continue
        const childClone = (sourceChild as Node).cloneShallow()
        frame.target.appendChild(childClone)
        childFrames.push({ source: sourceChild, target: childClone })
      }

      for (let index = childFrames.length - 1; index >= 0; index--) {
        const childFrame = childFrames[index]
        if (childFrame) stack.push(childFrame)
      }
    }

    return rootClone
  }

  protected cloneShallow(): Node {
    return new Node(this.nodeType, this.nodeName, this.nodeValue)
  }

  protected createTextContentNode(value: string): Node {
    return new Node(NodeType.TEXT_NODE, '#text', value)
  }

  /** Validate an insertion completely before changing any participating tree. */
  private preInsert(newNode: INode, referenceNode: INode | null, replacedNode: INode | null): void {
    if (newNode === this) {
      throw hierarchyError('A node cannot be inserted into itself')
    }

    const candidates = newNode.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
      ? Array.from(newNode.childNodes)
      : [newNode]

    for (const candidate of candidates) {
      this.validateCandidate(candidate)
    }

    // Parsing and cloning append large numbers of new leaves. This common case
    // can update the array and sibling links in O(1) after full validation.
    if (
      referenceNode === null &&
      replacedNode === null &&
      newNode.nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE &&
      newNode.parentNode !== this &&
      this.nodeType !== NodeType.DOCUMENT_NODE
    ) {
      if (newNode.parentNode) newNode.parentNode.removeChild(newNode)
      const previous = this._childNodes[this._childNodes.length - 1] ?? null
      this._childNodes.push(newNode)
      newNode.parentNode = this
      Node.setPreviousSibling(newNode, previous)
      Node.setNextSibling(newNode, null)
      Node.setNextSibling(previous, newNode)
      return
    }

    const removed = new Set<INode>(candidates)
    if (replacedNode) removed.add(replacedNode)

    const anchorIndex = replacedNode
      ? this._childNodes.indexOf(replacedNode)
      : referenceNode
        ? this._childNodes.indexOf(referenceNode)
        : this._childNodes.length

    let insertionIndex = 0
    for (let index = 0; index < anchorIndex; index++) {
      const child = this._childNodes[index]
      if (child && !removed.has(child)) insertionIndex++
    }

    const finalChildren = this._childNodes.filter(child => !removed.has(child))
    finalChildren.splice(insertionIndex, 0, ...candidates)
    this.validateFinalChildren(finalChildren)

    for (const candidate of candidates) {
      if (candidate.parentNode && candidate.parentNode !== this) {
        candidate.parentNode.removeChild(candidate)
      }
    }

    const retained = new Set(finalChildren)
    for (const child of this._childNodes) {
      if (!retained.has(child)) {
        child.parentNode = null
        Node.clearSiblingLinks(child)
      }
    }

    this._childNodes.splice(0, this._childNodes.length, ...finalChildren)
    for (const child of finalChildren) {
      child.parentNode = this
    }
    this.relinkChildren()
  }

  private validateCandidate(candidate: INode): void {
    // A leaf cannot already contain this parent, so the common parse/clone path
    // avoids walking the complete ancestor chain for every appended leaf.
    if (candidate.childNodes.length > 0) {
      const visited = new Set<INode>()
      let ancestor: INode | null = this
      while (ancestor) {
        if (ancestor === candidate) {
          throw hierarchyError('The insertion would create a cycle')
        }
        if (visited.has(ancestor)) {
          throw hierarchyError('The existing parent chain contains a cycle')
        }
        visited.add(ancestor)
        ancestor = ancestor.parentNode
      }
    }

    const allowed = this.nodeType === NodeType.DOCUMENT_NODE
      ? candidate.nodeType === NodeType.ELEMENT_NODE ||
        candidate.nodeType === NodeType.COMMENT_NODE ||
        candidate.nodeType === NodeType.DOCUMENT_TYPE_NODE
      : this.nodeType === NodeType.ELEMENT_NODE || this.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
        ? candidate.nodeType === NodeType.ELEMENT_NODE ||
          candidate.nodeType === NodeType.TEXT_NODE ||
          candidate.nodeType === NodeType.COMMENT_NODE
        : false

    if (!allowed) {
      throw hierarchyError(`${this.nodeName} cannot contain ${candidate.nodeName}`)
    }
  }

  private validateFinalChildren(children: INode[]): void {
    if (this.nodeType !== NodeType.DOCUMENT_NODE) return

    let elementIndex = -1
    let doctypeIndex = -1

    for (let index = 0; index < children.length; index++) {
      const child = children[index]
      if (!child) continue

      if (child.nodeType === NodeType.ELEMENT_NODE) {
        if (elementIndex !== -1) {
          throw hierarchyError('A document can contain only one document element')
        }
        elementIndex = index
      } else if (child.nodeType === NodeType.DOCUMENT_TYPE_NODE) {
        if (doctypeIndex !== -1) {
          throw hierarchyError('A document can contain only one doctype')
        }
        doctypeIndex = index
      }
    }

    if (doctypeIndex !== -1 && elementIndex !== -1 && doctypeIndex > elementIndex) {
      throw hierarchyError('A document doctype must precede the document element')
    }
  }

  private relinkChildren(): void {
    for (let index = 0; index < this._childNodes.length; index++) {
      const child = this._childNodes[index]
      if (!child) continue
      Node.setPreviousSibling(child, this._childNodes[index - 1] ?? null)
      Node.setNextSibling(child, this._childNodes[index + 1] ?? null)
    }
  }

  private static clearSiblingLinks(node: INode): void {
    Node.setPreviousSibling(node, null)
    Node.setNextSibling(node, null)
  }

  private static setNextSibling(node: INode | null, sibling: INode | null): void {
    if (node instanceof Node) node._nextSibling = sibling
  }

  private static setPreviousSibling(node: INode | null, sibling: INode | null): void {
    if (node instanceof Node) node._previousSibling = sibling
  }
}

function hierarchyError(message: string): Error {
  return new Error(`HierarchyRequestError: ${message}`)
}
