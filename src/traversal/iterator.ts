/**
 * @lpm.dev/neo.dom - NodeIterator
 *
 * Traverses DOM tree nodes in document order
 */

import type { Node as INode, NodeIterator as INodeIterator, NodeFilterCallback } from '../types.js'
import {
  type CanonicalTraversalReader,
  getCanonicalTraversalReader,
} from '../dom/node-state.js'
import { NodeFilter } from '../utils/constants.js'
import { registerNodeIterator } from './iterator-registry.js'

/**
 * NodeIterator implementation
 *
 * Iterates through nodes in a DOM tree in document order
 */
export class NodeIterator implements INodeIterator {
  readonly root: INode
  readonly whatToShow: number
  readonly filter: NodeFilterCallback | null
  private _referenceNode: INode
  private _pointerBeforeReference = true
  readonly #canonicalReader: CanonicalTraversalReader | undefined

  constructor(root: INode, whatToShow: number, filter: NodeFilterCallback | null = null) {
    this.root = root
    this.whatToShow = whatToShow
    this.filter = filter
    this._referenceNode = root
    this.#canonicalReader = getCanonicalTraversalReader(root)
    registerNodeIterator(root, this)
  }

  get referenceNode(): INode {
    return this._referenceNode
  }

  get pointerBeforeReference(): boolean {
    return this._pointerBeforeReference
  }

  /** Apply the DOM NodeIterator pre-removal steps while tree links are intact. */
  adjustForNodeRemoval(node: INode): void {
    if (node === this.root || !this.#isInclusiveAncestor(node, this._referenceNode)) return

    if (this._pointerBeforeReference) {
      const following = this.firstFollowingNodeOutside(node)
      if (following) {
        this._referenceNode = following
        return
      }
      this._pointerBeforeReference = false
    }

    const previous = this.#previousSibling(node)
    if (!previous) {
      const parent = this.#parentNode(node)
      if (parent) this._referenceNode = parent
      return
    }

    let reference = previous
    let lastChild: INode | null
    while ((lastChild = this.#lastChild(reference))) reference = lastChild
    this._referenceNode = reference
  }

  /**
   * Get next node in iteration
   *
   * @returns Next node or null if at end
   */
  nextNode(): INode | null {
    let node = this._referenceNode
    let beforeNode = this._pointerBeforeReference

    while (true) {
      if (beforeNode) {
        beforeNode = false
      } else {
        const next = this.nextInRoot(node)
        if (!next) return null
        node = next
      }

      if (this.acceptNode(node)) {
        this._referenceNode = node
        this._pointerBeforeReference = false
        return node
      }
    }
  }

  /**
   * Get previous node in iteration
   *
   * @returns Previous node or null if at beginning
   */
  previousNode(): INode | null {
    let node = this._referenceNode
    let beforeNode = this._pointerBeforeReference

    while (true) {
      if (beforeNode) {
        const previous = this.previousInRoot(node)
        if (!previous) return null
        node = previous
      } else {
        beforeNode = true
      }

      if (this.acceptNode(node)) {
        this._referenceNode = node
        this._pointerBeforeReference = true
        return node
      }
    }
  }

  private nextInRoot(node: INode): INode | null {
    const firstChild = this.#firstChild(node)
    if (firstChild) return firstChild

    let current: INode | null = node
    while (current && current !== this.root) {
      const nextSibling = this.#nextSibling(current)
      if (nextSibling) return nextSibling
      current = this.#parentNode(current)
    }
    return null
  }

  private previousInRoot(node: INode): INode | null {
    if (node === this.root) return null

    const previousSibling = this.#previousSibling(node)
    if (previousSibling) {
      let previous = previousSibling
      let lastChild: INode | null
      while ((lastChild = this.#lastChild(previous))) previous = lastChild
      return previous
    }

    return this.#parentNode(node)
  }

  private firstFollowingNodeOutside(node: INode): INode | null {
    let current: INode | null = node
    while (current && current !== this.root) {
      const nextSibling = this.#nextSibling(current)
      if (nextSibling) return nextSibling
      current = this.#parentNode(current)
    }
    return null
  }

  /**
   * Check if node should be accepted by filter
   *
   * @param node - Node to check
   * @returns true if node should be accepted
   */
  private acceptNode(node: INode): boolean {
    // Check whatToShow filter
    if (!this.matchesWhatToShow(node)) {
      return false
    }

    // Check custom filter
    if (this.filter) {
      const result = this.filter(node)
      return result === NodeFilter.FILTER_ACCEPT
    }

    return true
  }

  /**
   * Check if node matches whatToShow filter
   *
   * @param node - Node to check
   * @returns true if node matches
   */
  private matchesWhatToShow(node: INode): boolean {
    // SHOW_ALL shows everything
    if (this.whatToShow === NodeFilter.SHOW_ALL) {
      return true
    }

    // Check specific node type
    const nodeTypeMask = 1 << (this.#nodeType(node) - 1)
    return (this.whatToShow & nodeTypeMask) !== 0
  }

  #nodeType(node: INode): number {
    return this.#canonicalReader
      ? this.#canonicalReader.nodeType(node)
      : node.nodeType
  }

  #parentNode(node: INode): INode | null {
    return this.#canonicalReader
      ? this.#canonicalReader.parentNode<INode>(node)
      : node.parentNode
  }

  #firstChild(node: INode): INode | null {
    return this.#canonicalReader
      ? this.#canonicalReader.firstChild<INode>(node)
      : node.firstChild
  }

  #lastChild(node: INode): INode | null {
    return this.#canonicalReader
      ? this.#canonicalReader.lastChild<INode>(node)
      : node.lastChild
  }

  #nextSibling(node: INode): INode | null {
    return this.#canonicalReader
      ? this.#canonicalReader.nextSibling<INode>(node)
      : node.nextSibling
  }

  #previousSibling(node: INode): INode | null {
    return this.#canonicalReader
      ? this.#canonicalReader.previousSibling<INode>(node)
      : node.previousSibling
  }

  #isInclusiveAncestor(ancestor: INode, node: INode): boolean {
    const visited = new Set<INode>()
    let current: INode | null = node

    while (current && !visited.has(current)) {
      if (current === ancestor) return true
      visited.add(current)
      current = this.#parentNode(current)
    }
    return false
  }
}

// Export NodeFilter constants
export { NodeFilter }
