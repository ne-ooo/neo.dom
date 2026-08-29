/**
 * @lpm.dev/neo.dom - Node Implementation
 *
 * Base class for all DOM nodes
 */

import type { Node as INode, NodeList } from '../types.js'
import { notifyNodeIteratorsBeforeRemoval } from '../traversal/iterator-registry.js'
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
    set(target, property, value, receiver) {
      if (typeof property === 'string' && /^(0|[1-9]\d*)$/.test(property)) {
        return false
      }
      return Reflect.set(target, property, value, receiver)
    },
  })
}

/**
 * Node base class
 */
export class Node implements INode {
  private readonly _nodeType: number
  private readonly _nodeName: string
  private _nodeValue: string | null
  private _parentNode: Node | null = null
  private readonly _childNodes: Node[] = []
  private _childNodesList: NodeList | null = null
  private _nextSibling: Node | null = null
  private _previousSibling: Node | null = null

  constructor(nodeType: number, nodeName: string, nodeValue: string | null = null) {
    this._nodeType = nodeType
    this._nodeName = nodeName
    this._nodeValue = nodeValue
  }

  get nodeType(): number {
    return this._nodeType
  }

  get nodeName(): string {
    return this._nodeName
  }

  get parentNode(): Node | null {
    return this._parentNode
  }

  get nodeValue(): string | null {
    return this._nodeValue
  }

  set nodeValue(value: string | null) {
    if (this._nodeType === NodeType.TEXT_NODE || this._nodeType === NodeType.COMMENT_NODE) {
      this._nodeValue = value
    }
  }

  get childNodes(): NodeList {
    if (!this._childNodesList) {
      this._childNodesList = createLiveNodeList(this._childNodes)
    }
    return this._childNodesList
  }

  get firstChild(): Node | null {
    return this._childNodes[0] ?? null
  }

  get lastChild(): Node | null {
    return this._childNodes[this._childNodes.length - 1] ?? null
  }

  get nextSibling(): Node | null {
    return this._parentNode ? this._nextSibling : null
  }

  get previousSibling(): Node | null {
    return this._parentNode ? this._previousSibling : null
  }

  get textContent(): string | null {
    if (this._nodeType === NodeType.TEXT_NODE || this._nodeType === NodeType.COMMENT_NODE) {
      return this.nodeValue
    }

    if (
      this._nodeType !== NodeType.ELEMENT_NODE &&
      this._nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      return null
    }

    const chunks: string[] = []
    const stack = [...this._childNodes].reverse()

    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) continue

      if (Node.getNodeType(current) === NodeType.TEXT_NODE) {
        chunks.push(current.nodeValue ?? '')
        continue
      }

      const childCount = Node.getChildCount(current)
      for (let index = childCount - 1; index >= 0; index--) {
        const child = Node.getChildAt(current, index)
        if (child) stack.push(child)
      }
    }

    return chunks.join('')
  }

  set textContent(value: string | null) {
    if (this._nodeType === NodeType.TEXT_NODE || this._nodeType === NodeType.COMMENT_NODE) {
      this.nodeValue = value
      return
    }

    if (
      this._nodeType !== NodeType.ELEMENT_NODE &&
      this._nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      return
    }

    this.detachNodesForMutation(this._childNodes.slice())

    if (value !== null && value !== '') {
      this.appendChild(this.createTextContentNode(value))
    }
  }

  appendChild(node: INode): INode {
    assertCanonicalNode(node, 'node')
    this.preInsert(node, null, null)
    return node
  }

  removeChild(node: INode): INode {
    assertCanonicalNode(node, 'node')
    const index = this._childNodes.indexOf(node)
    if (index === -1) {
      throw new Error('Node not found')
    }

    this.detachNodesForMutation([node])
    return node
  }

  replaceChild(newNode: INode, oldNode: INode): INode {
    assertCanonicalNode(newNode, 'newNode')
    assertCanonicalNode(oldNode, 'oldNode')
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
    assertCanonicalNode(newNode, 'newNode')
    if (refNode) assertCanonicalNode(refNode, 'refNode')
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

    const stack: Array<{ source: Node; target: Node; childIndex: number }> = [
      { source: this, target: rootClone, childIndex: 0 },
    ]

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (!frame) continue

      if (frame.childIndex >= frame.source._childNodes.length) {
        stack.pop()
        continue
      }

      const sourceChild = frame.source._childNodes[frame.childIndex]
      frame.childIndex++
      if (!sourceChild) continue

      const concreteChild = sourceChild as Node
      const childClone = concreteChild.cloneShallow()
      frame.target.appendChild(childClone)
      if (concreteChild._childNodes.length > 0) {
        stack.push({ source: concreteChild, target: childClone, childIndex: 0 })
      }
    }

    return rootClone
  }

  protected cloneShallow(): Node {
    return new Node(this._nodeType, this._nodeName, this._nodeValue)
  }

  protected createTextContentNode(value: string): Node {
    return new Node(NodeType.TEXT_NODE, '#text', value)
  }

  /** Validate an insertion completely before changing any participating tree. */
  private preInsert(newNode: Node, referenceNode: Node | null, replacedNode: Node | null): void {
    if (newNode === this) {
      throw hierarchyError('A node cannot be inserted into itself')
    }

    const candidates = newNode._nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
      ? newNode._childNodes.slice()
      : [newNode]

    for (const candidate of candidates) {
      this.validateCandidate(candidate)
    }

    // Parsing and cloning append large numbers of new leaves. This common case
    // can update the array and sibling links in O(1) after full validation.
    if (
      referenceNode === null &&
      replacedNode === null &&
      newNode._nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE &&
      newNode._parentNode !== this &&
      this._nodeType !== NodeType.DOCUMENT_NODE
    ) {
      Node.detachNodesForMutation([newNode])
      const previous = this._childNodes[this._childNodes.length - 1] ?? null
      this._childNodes.push(newNode)
      Node.setParentNode(newNode, this)
      Node.setPreviousSibling(newNode, previous)
      Node.setNextSibling(newNode, null)
      Node.setNextSibling(previous, newNode)
      return
    }

    const removed = new Set<Node>(candidates)
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

    const remainingChildren = this._childNodes.filter(child => !removed.has(child))
    const finalChildren: Node[] = []
    for (let index = 0; index < insertionIndex; index++) {
      const child = remainingChildren[index]
      if (child) finalChildren.push(child)
    }
    for (const candidate of candidates) finalChildren.push(candidate)
    for (let index = insertionIndex; index < remainingChildren.length; index++) {
      const child = remainingChildren[index]
      if (child) finalChildren.push(child)
    }
    this.validateFinalChildren(finalChildren)

    const detachOrder = replacedNode && !candidates.includes(replacedNode)
      ? [...candidates, replacedNode]
      : candidates
    Node.detachNodesForMutation(detachOrder)

    this._childNodes.splice(0, this._childNodes.length)
    for (const child of finalChildren) this._childNodes.push(child)
    for (const child of finalChildren) {
      Node.setParentNode(child, this)
    }
    this.relinkChildren()
  }

  private validateCandidate(candidate: Node): void {
    // A fragment is flattened before insertion, so the target itself can be a
    // candidate even when the fragment wrapper is a different node. Reject it
    // before the leaf fast path below skips the ancestor walk.
    if (candidate === this) {
      throw hierarchyError('A node cannot be inserted into itself')
    }

    // A leaf cannot already contain this parent, so the common parse/clone path
    // avoids walking the complete ancestor chain for every appended leaf.
    if (Node.getChildCount(candidate) > 0) {
      const visited = new Set<Node>()
      let ancestor: Node | null = this
      while (ancestor) {
        if (ancestor === candidate) {
          throw hierarchyError('The insertion would create a cycle')
        }
        if (visited.has(ancestor)) {
          throw hierarchyError('The existing parent chain contains a cycle')
        }
        visited.add(ancestor)
        ancestor = ancestor._parentNode
      }
    }

    const allowed = this._nodeType === NodeType.DOCUMENT_NODE
      ? candidate._nodeType === NodeType.ELEMENT_NODE ||
        candidate._nodeType === NodeType.COMMENT_NODE ||
        candidate._nodeType === NodeType.DOCUMENT_TYPE_NODE
      : this._nodeType === NodeType.ELEMENT_NODE ||
          this._nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
        ? candidate._nodeType === NodeType.ELEMENT_NODE ||
          candidate._nodeType === NodeType.TEXT_NODE ||
          candidate._nodeType === NodeType.COMMENT_NODE
        : false

    if (!allowed) {
      throw hierarchyError(`${this._nodeName} cannot contain ${candidate._nodeName}`)
    }
  }

  private validateFinalChildren(children: Node[]): void {
    if (this._nodeType !== NodeType.DOCUMENT_NODE) return

    let elementIndex = -1
    let doctypeIndex = -1

    for (let index = 0; index < children.length; index++) {
      const child = children[index]
      if (!child) continue

      if (child._nodeType === NodeType.ELEMENT_NODE) {
        if (elementIndex !== -1) {
          throw hierarchyError('A document can contain only one document element')
        }
        elementIndex = index
      } else if (child._nodeType === NodeType.DOCUMENT_TYPE_NODE) {
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

  /** Detach many nodes with one compaction pass per parent. */
  protected detachNodesForMutation(nodes: readonly INode[]): void {
    Node.detachNodesForMutation(nodes)
  }

  private static detachNodesForMutation(nodes: readonly INode[]): void {
    const canonicalNodes: Node[] = []
    for (const node of nodes) {
      assertCanonicalNode(node, 'node')
      canonicalNodes.push(node)
    }

    const removedByParent = new Map<Node, Set<Node>>()
    for (const node of canonicalNodes) {
      const parent = node._parentNode
      if (!parent) continue
      assertCanonicalNode(parent, 'parentNode')

      notifyNodeIteratorsBeforeRemoval(node, parent)

      const previous = node._previousSibling
      const next = node._nextSibling
      Node.setNextSibling(previous, next)
      Node.setPreviousSibling(next, previous)
      node._parentNode = null
      node._previousSibling = null
      node._nextSibling = null

      let removed = removedByParent.get(parent)
      if (!removed) {
        removed = new Set()
        removedByParent.set(parent, removed)
      }
      removed.add(node)
    }

    for (const [parent, removed] of removedByParent) {
      let writeIndex = 0
      for (const child of parent._childNodes) {
        if (!removed.has(child)) {
          parent._childNodes[writeIndex] = child
          writeIndex++
        }
      }
      parent._childNodes.length = writeIndex
    }
  }

  private static clearSiblingLinks(node: Node): void {
    Node.setPreviousSibling(node, null)
    Node.setNextSibling(node, null)
  }

  private static setNextSibling(node: Node | null, sibling: Node | null): void {
    if (node) node._nextSibling = sibling
  }

  private static setPreviousSibling(node: Node | null, sibling: Node | null): void {
    if (node) node._previousSibling = sibling
  }

  private static setParentNode(node: Node, parent: Node | null): void {
    node._parentNode = parent
  }

  private static getNodeType(node: INode): number {
    return node instanceof Node ? node._nodeType : node.nodeType
  }

  private static getChildCount(node: INode): number {
    return node instanceof Node ? node._childNodes.length : node.childNodes.length
  }

  private static getChildAt(node: INode, index: number): Node | null {
    assertCanonicalNode(node, 'node')
    return node._childNodes[index] ?? null
  }
}

function hierarchyError(message: string): Error {
  return new Error(`HierarchyRequestError: ${message}`)
}

/** Reject structural lookalikes and nodes from a different package runtime. */
export function assertCanonicalNode(value: unknown, name: string): asserts value is Node {
  if (!(value instanceof Node)) {
    throw new TypeError(`${name} must be a canonical neo.dom Node from this module instance`)
  }
}
