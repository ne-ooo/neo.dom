/**
 * @lpm.dev/neo.dom - Node Implementation
 *
 * Base class for all DOM nodes
 */

import type { Node as INode, NodeList } from '../types.js'
import { notifyNodeIteratorsBeforeRemoval } from '../traversal/iterator-registry.js'
import { NodeType } from '../utils/constants.js'
import {
  type CanonicalTraversalReader,
  hasConcreteNodeState,
  NodeMetadataField,
  registerCanonicalNodeReader,
  registerCanonicalTraversalReader,
  registerConcreteNodeState,
} from './node-state.js'
import { getTemplateContent, getTemplateHost } from './element-state.js'

/** A live, array-like view over a node's child array. */
class NodeListImpl implements NodeList {
  readonly #nodes: INode[]

  constructor(nodes: INode[]) {
    this.#nodes = nodes
  }

  get length(): number {
    return this.#nodes.length
  }

  item(index: number): INode | null {
    return this.#nodes[index] ?? null
  }

  [index: number]: INode

  *[Symbol.iterator](): IterableIterator<INode> {
    yield* this.#nodes
  }
}

Object.freeze(NodeListImpl.prototype)

function createLiveNodeList(nodes: INode[]): NodeList {
  let boundMethods: Map<PropertyKey, {
    source: (...args: unknown[]) => unknown
    bound: (...args: unknown[]) => unknown
  }> | null = null
  const target = new NodeListImpl(nodes)
  Object.freeze(target)
  return new Proxy(target, {
    get(target, property) {
      if (typeof property === 'string' && /^(0|[1-9]\d*)$/.test(property)) {
        return nodes[Number(property)]
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
}

/**
 * Node base class
 */
export class Node implements INode {
  static readonly #canonicalTraversalReader: CanonicalTraversalReader = Object.freeze({
    nodeType: (node: object): number => (node as Node).#nodeType,
    parentNode: <T extends object>(node: object): T | null =>
      (node as Node).#parentNode as T | null,
    firstChild: <T extends object>(node: object): T | null =>
      ((node as Node).#childNodes[0] ?? null) as T | null,
    lastChild: <T extends object>(node: object): T | null => {
      const target = node as Node
      return (target.#childNodes[target.#childNodes.length - 1] ?? null) as T | null
    },
    nextSibling: <T extends object>(node: object): T | null =>
      (node as Node).#nextSibling as T | null,
    previousSibling: <T extends object>(node: object): T | null =>
      (node as Node).#previousSibling as T | null,
  })

  static {
    registerCanonicalNodeReader(Node.#readCanonicalNodeMetadata)
    registerCanonicalTraversalReader(Node.#canonicalTraversalReader)
  }

  readonly #nodeType: number
  readonly #nodeName: string
  #nodeValue: string | null
  #parentNode: Node | null = null
  readonly #childNodes: Node[] = []
  #childNodesList: NodeList | null = null
  #nextSibling: Node | null = null
  #previousSibling: Node | null = null
  #concrete = false

  constructor(nodeType: number, nodeName: string, nodeValue: string | null = null) {
    this.#nodeType = nodeType
    this.#nodeName = nodeName
    this.#nodeValue = nodeValue
  }

  static #readCanonicalNodeMetadata(
    node: object,
    field: number,
    value?: unknown
  ): unknown {
    const target = node as Node
    if (field === NodeMetadataField.NODE_TYPE) return target.#nodeType
    if (field === NodeMetadataField.PARENT_NODE) return target.#parentNode
    if (field === NodeMetadataField.FIRST_CHILD) return target.#childNodes[0] ?? null
    if (field === NodeMetadataField.LAST_CHILD) {
      return target.#childNodes[target.#childNodes.length - 1] ?? null
    }
    if (field === NodeMetadataField.NEXT_SIBLING) return target.#nextSibling
    if (field === NodeMetadataField.PREVIOUS_SIBLING) return target.#previousSibling
    if (field === NodeMetadataField.REPLACE_WITH) {
      if (!Array.isArray(value)) throw new TypeError('Replacement nodes must be an array')
      target.#replaceWithNodes(value as Node[])
      return null
    }
    if (field === NodeMetadataField.REMOVE) {
      Node.#detachNodesForMutation([target])
      return null
    }
    if (field === NodeMetadataField.MARK_CONCRETE) {
      target.#concrete = true
      return null
    }
    return undefined
  }

  get nodeType(): number {
    return this.#nodeType
  }

  get nodeName(): string {
    return this.#nodeName
  }

  get parentNode(): Node | null {
    return this.#parentNode
  }

  get nodeValue(): string | null {
    return this.#nodeValue
  }

  set nodeValue(value: string | null) {
    if (this.#nodeType === NodeType.TEXT_NODE || this.#nodeType === NodeType.COMMENT_NODE) {
      this.#nodeValue = value
    }
  }

  get childNodes(): NodeList {
    if (!this.#childNodesList) {
      this.#childNodesList = createLiveNodeList(this.#childNodes)
    }
    return this.#childNodesList
  }

  get firstChild(): Node | null {
    return this.#childNodes[0] ?? null
  }

  get lastChild(): Node | null {
    return this.#childNodes[this.#childNodes.length - 1] ?? null
  }

  get nextSibling(): Node | null {
    return this.#parentNode ? this.#nextSibling : null
  }

  get previousSibling(): Node | null {
    return this.#parentNode ? this.#previousSibling : null
  }

  get textContent(): string | null {
    if (this.#nodeType === NodeType.TEXT_NODE || this.#nodeType === NodeType.COMMENT_NODE) {
      return this.nodeValue
    }

    if (
      this.#nodeType !== NodeType.ELEMENT_NODE &&
      this.#nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      return null
    }

    const chunks: string[] = []
    const stack = [...this.#childNodes].reverse()

    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) continue

      if (Node.#getNodeType(current) === NodeType.TEXT_NODE) {
        chunks.push(current.nodeValue ?? '')
        continue
      }

      const childCount = Node.#getChildCount(current)
      for (let index = childCount - 1; index >= 0; index--) {
        const child = Node.#getChildAt(current, index)
        if (child) stack.push(child)
      }
    }

    return chunks.join('')
  }

  set textContent(value: string | null) {
    if (this.#nodeType === NodeType.TEXT_NODE || this.#nodeType === NodeType.COMMENT_NODE) {
      this.nodeValue = value
      return
    }

    if (
      this.#nodeType !== NodeType.ELEMENT_NODE &&
      this.#nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      return
    }

    Node.#detachNodesForMutation(this.#childNodes.slice())

    if (value !== null && value !== '') {
      this.appendChild(this.createTextContentNode(value))
    }
  }

  appendChild(node: INode): INode {
    Node.#assertConcreteNode(this, 'parentNode')
    Node.#assertConcreteNode(node, 'node')
    this.#preInsert(node, null, null)
    return node
  }

  removeChild(node: INode): INode {
    Node.#assertConcreteNode(this, 'parentNode')
    Node.#assertConcreteNode(node, 'node')
    const index = this.#childNodes.indexOf(node)
    if (index === -1) {
      throw new Error('Node not found')
    }

    Node.#detachNodesForMutation([node])
    return node
  }

  replaceChild(newNode: INode, oldNode: INode): INode {
    Node.#assertConcreteNode(this, 'parentNode')
    Node.#assertConcreteNode(newNode, 'newNode')
    Node.#assertConcreteNode(oldNode, 'oldNode')
    if (this.#childNodes.indexOf(oldNode) === -1) {
      throw new Error('Node not found')
    }
    if (newNode === oldNode) {
      notifyNodeIteratorsBeforeRemoval(newNode, this)
      return oldNode
    }

    this.#preInsert(newNode, null, oldNode)
    return oldNode
  }

  insertBefore(newNode: INode, refNode: INode | null): INode {
    Node.#assertConcreteNode(this, 'parentNode')
    Node.#assertConcreteNode(newNode, 'newNode')
    if (refNode) Node.#assertConcreteNode(refNode, 'refNode')
    if (refNode !== null && this.#childNodes.indexOf(refNode) === -1) {
      throw new Error('Reference node not found')
    }
    if (newNode === refNode) {
      notifyNodeIteratorsBeforeRemoval(newNode, this)
      return newNode
    }

    this.#preInsert(newNode, refNode, null)
    return newNode
  }

  cloneNode(deep: boolean = false): INode {
    const rootClone = this.cloneShallow()
    if (!deep) return rootClone

    const stack: Array<{
      children: readonly Node[]
      target: Node
      childIndex: number
    }> = []
    this.#pushCloningGroups(stack, rootClone)

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (!frame) continue

      if (frame.childIndex >= frame.children.length) {
        stack.pop()
        continue
      }

      const sourceChild = frame.children[frame.childIndex]
      frame.childIndex++
      if (!sourceChild) continue

      const concreteChild = sourceChild as Node
      const childClone = concreteChild.cloneShallow()
      frame.target.appendChild(childClone)
      concreteChild.#pushCloningGroups(stack, childClone)
    }

    return rootClone
  }

  protected cloneShallow(): Node {
    return new Node(this.#nodeType, this.#nodeName, this.#nodeValue)
  }

  protected createTextContentNode(value: string): Node {
    return new Node(NodeType.TEXT_NODE, '#text', value)
  }

  #pushCloningGroups(
    stack: Array<{ children: readonly Node[]; target: Node; childIndex: number }>,
    clone: Node
  ): void {
    if (this.#nodeType === NodeType.ELEMENT_NODE && this.#nodeName === 'TEMPLATE') {
      const content = getTemplateContent(this as never) as Node | undefined
      if (content && content.#childNodes.length > 0) {
        const cloneContent = getTemplateContent(clone as never) as Node | undefined
        if (!cloneContent) throw new TypeError('Missing cloned template content')
        stack.push({ children: content.#childNodes, target: cloneContent, childIndex: 0 })
      }
    }
    if (this.#childNodes.length > 0) {
      stack.push({ children: this.#childNodes, target: clone, childIndex: 0 })
    }
  }

  /** Replace this node with a validated batch without partially detaching it. */
  #replaceWithNodes(nodes: readonly Node[]): void {
    const parent = this.#parentNode
    if (!parent) return

    for (const node of nodes) assertCanonicalNode(node, 'node')
    if (nodes.length === 1) {
      parent.#preInsert(nodes[0]!, null, this)
      return
    }

    if (nodes.length > 1) {
      for (const node of nodes) {
        if (
          node.#nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE &&
          node.#nodeType !== NodeType.ELEMENT_NODE &&
          node.#nodeType !== NodeType.TEXT_NODE &&
          node.#nodeType !== NodeType.COMMENT_NODE
        ) {
          throw hierarchyError(`A document fragment cannot contain ${node.#nodeName}`)
        }
      }
    }

    const fragmentStates = new Map<Node, {
      readonly children: readonly Node[]
      readonly remaining: Set<Node>
    }>()
    for (const node of nodes) {
      if (
        node.#nodeType === NodeType.DOCUMENT_FRAGMENT_NODE &&
        !fragmentStates.has(node)
      ) {
        const children = node.#childNodes.slice()
        fragmentStates.set(node, {
          children,
          remaining: new Set(children),
        })
      }
    }

    const replacementSequence: Node[] = []

    for (const node of nodes) {
      if (node.#nodeType === NodeType.DOCUMENT_FRAGMENT_NODE) {
        const state = fragmentStates.get(node)
        if (!state || state.remaining.size === 0) continue
        for (const child of state.children) {
          if (state.remaining.has(child)) replacementSequence.push(child)
        }
        state.remaining.clear()
        continue
      }

      if (node.#parentNode) fragmentStates.get(node.#parentNode)?.remaining.delete(node)
      replacementSequence.push(node)
    }

    parent.#insertCandidates(deduplicateNodes(replacementSequence), null, this, false)
  }

  /** Validate an insertion completely before changing any participating tree. */
  #preInsert(newNode: Node, referenceNode: Node | null, replacedNode: Node | null): void {
    if (newNode === this) {
      throw hierarchyError('A node cannot be inserted into itself')
    }

    const candidates = newNode.#nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
      ? newNode.#childNodes.slice()
      : [newNode]

    for (const candidate of candidates) {
      this.#validateCandidate(candidate)
    }

    // Re-inserting a child at its current position still runs DOM iterator
    // pre-removal steps, but it does not need to rebuild the unchanged list.
    if (
      replacedNode === null &&
      candidates.length === 1 &&
      newNode.#nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE &&
      newNode.#parentNode === this &&
      (
        (referenceNode === null && newNode === this.#childNodes[this.#childNodes.length - 1]) ||
        (referenceNode !== null && newNode.#nextSibling === referenceNode)
      )
    ) {
      notifyNodeIteratorsBeforeRemoval(newNode, this)
      return
    }

    if (candidates.length === 0 && replacedNode === null) return

    // Parsing and cloning append large numbers of new leaves. This common case
    // can update the array and sibling links in O(1) after full validation.
    if (
      referenceNode === null &&
      replacedNode === null &&
      newNode.#nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE &&
      newNode.#parentNode !== this &&
      this.#nodeType !== NodeType.DOCUMENT_NODE
    ) {
      Node.#detachNodesForMutation([newNode])
      const previous = this.#childNodes[this.#childNodes.length - 1] ?? null
      this.#childNodes.push(newNode)
      Node.#setParentNode(newNode, this)
      Node.#setPreviousSibling(newNode, previous)
      Node.#setNextSibling(newNode, null)
      Node.#setNextSibling(previous, newNode)
      return
    }

    this.#insertCandidates(candidates, referenceNode, replacedNode, true)
  }

  #insertCandidates(
    candidates: readonly Node[],
    referenceNode: Node | null,
    replacedNode: Node | null,
    validated: boolean
  ): void {
    if (!validated) {
      for (const candidate of candidates) this.#validateCandidate(candidate)
    }

    const removed = new Set<Node>(candidates)
    if (replacedNode) removed.add(replacedNode)

    const anchorIndex = replacedNode
      ? this.#childNodes.indexOf(replacedNode)
      : referenceNode
        ? this.#childNodes.indexOf(referenceNode)
        : this.#childNodes.length

    let insertionIndex = 0
    for (let index = 0; index < anchorIndex; index++) {
      const child = this.#childNodes[index]
      if (child && !removed.has(child)) insertionIndex++
    }

    const remainingChildren = this.#childNodes.filter(child => !removed.has(child))
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
    this.#validateFinalChildren(finalChildren)

    const detachOrder = replacedNode && !candidates.includes(replacedNode)
      ? [...candidates, replacedNode]
      : candidates
    Node.#detachNodesForMutation(detachOrder)

    this.#childNodes.splice(0, this.#childNodes.length)
    for (const child of finalChildren) this.#childNodes.push(child)
    for (const child of finalChildren) {
      Node.#setParentNode(child, this)
    }
    this.#relinkChildren()
  }

  #validateCandidate(candidate: Node): void {
    // A fragment is flattened before insertion, so the target itself can be a
    // candidate even when the fragment wrapper is a different node. Reject it
    // before the leaf fast path below skips the ancestor walk.
    if (candidate === this) {
      throw hierarchyError('A node cannot be inserted into itself')
    }

    // Ordinary leaves cannot already contain this parent. Templates still need
    // a host-inclusive walk because their inert content is a separate fragment.
    if (
      Node.#getChildCount(candidate) > 0 ||
      (
        candidate.#nodeType === NodeType.ELEMENT_NODE &&
        candidate.#nodeName === 'TEMPLATE' &&
        getTemplateContent(candidate as never) !== undefined
      )
    ) {
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
        ancestor = ancestor.#parentNode ?? (getTemplateHost(ancestor) as Node | undefined) ?? null
      }
    }

    const allowed = this.#nodeType === NodeType.DOCUMENT_NODE
      ? candidate.#nodeType === NodeType.ELEMENT_NODE ||
        candidate.#nodeType === NodeType.COMMENT_NODE ||
        candidate.#nodeType === NodeType.DOCUMENT_TYPE_NODE
      : this.#nodeType === NodeType.ELEMENT_NODE ||
          this.#nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
        ? candidate.#nodeType === NodeType.ELEMENT_NODE ||
          candidate.#nodeType === NodeType.TEXT_NODE ||
          candidate.#nodeType === NodeType.COMMENT_NODE
        : false

    if (!allowed) {
      throw hierarchyError(`${this.#nodeName} cannot contain ${candidate.#nodeName}`)
    }
  }

  #validateFinalChildren(children: Node[]): void {
    if (this.#nodeType !== NodeType.DOCUMENT_NODE) return

    let elementIndex = -1
    let doctypeIndex = -1

    for (let index = 0; index < children.length; index++) {
      const child = children[index]
      if (!child) continue

      if (child.#nodeType === NodeType.ELEMENT_NODE) {
        if (elementIndex !== -1) {
          throw hierarchyError('A document can contain only one document element')
        }
        elementIndex = index
      } else if (child.#nodeType === NodeType.DOCUMENT_TYPE_NODE) {
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

  #relinkChildren(): void {
    for (let index = 0; index < this.#childNodes.length; index++) {
      const child = this.#childNodes[index]
      if (!child) continue
      Node.#setPreviousSibling(child, this.#childNodes[index - 1] ?? null)
      Node.#setNextSibling(child, this.#childNodes[index + 1] ?? null)
    }
  }

  /** Detach many nodes with one compaction pass per parent. */
  static #detachNodesForMutation(nodes: readonly INode[]): void {
    const canonicalNodes: Node[] = []
    for (const node of nodes) {
      Node.#assertConcreteNode(node, 'node')
      canonicalNodes.push(node)
    }

    const removedByParent = new Map<Node, Set<Node>>()
    for (const node of canonicalNodes) {
      const parent = node.#parentNode
      if (!parent) continue
      Node.#assertConcreteNode(parent, 'parentNode')

      notifyNodeIteratorsBeforeRemoval(node, parent)

      const previous = node.#previousSibling
      const next = node.#nextSibling
      Node.#setNextSibling(previous, next)
      Node.#setPreviousSibling(next, previous)
      node.#parentNode = null
      node.#previousSibling = null
      node.#nextSibling = null

      let removed = removedByParent.get(parent)
      if (!removed) {
        removed = new Set()
        removedByParent.set(parent, removed)
      }
      removed.add(node)
    }

    for (const [parent, removed] of removedByParent) {
      let writeIndex = 0
      for (const child of parent.#childNodes) {
        if (!removed.has(child)) {
          parent.#childNodes[writeIndex] = child
          writeIndex++
        }
      }
      parent.#childNodes.length = writeIndex
    }
  }

  static #setNextSibling(node: Node | null, sibling: Node | null): void {
    if (node) node.#nextSibling = sibling
  }

  static #setPreviousSibling(node: Node | null, sibling: Node | null): void {
    if (node) node.#previousSibling = sibling
  }

  static #setParentNode(node: Node, parent: Node | null): void {
    node.#parentNode = parent
  }

  static #getNodeType(node: INode): number {
    return node instanceof Node ? node.#nodeType : node.nodeType
  }

  static #getChildCount(node: INode): number {
    return node instanceof Node ? node.#childNodes.length : node.childNodes.length
  }

  static #getChildAt(node: INode, index: number): Node | null {
    Node.#assertConcreteNode(node, 'node')
    return node.#childNodes[index] ?? null
  }

  static #assertConcreteNode(value: unknown, name: string): asserts value is Node {
    if (!(value instanceof Node)) {
      throw new TypeError(`${name} must be a canonical neo.dom Node from this module instance`)
    }
    if (!value.#concrete) {
      throw new TypeError(`${name} must be a concrete neo.dom node, not a base Node instance`)
    }
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
  if (!hasConcreteNodeState(value)) {
    throw new TypeError(`${name} must be a concrete neo.dom node, not a base Node instance`)
  }
}

/** Brand a concrete DOM subclass so base Node cannot impersonate it. */
export function registerConcreteNode(node: Node, state: unknown = null): void {
  registerConcreteNodeState(node, state)
}

function deduplicateNodes(nodes: readonly Node[]): Node[] {
  const result: Node[] = []
  const seen = new Set<Node>()
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index]
    if (!node || seen.has(node)) continue
    seen.add(node)
    result.push(node)
  }
  result.reverse()
  return result
}
