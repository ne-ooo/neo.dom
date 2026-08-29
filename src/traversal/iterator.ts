/**
 * @lpm.dev/neo.dom - NodeIterator
 *
 * Traverses DOM tree nodes in document order
 */

import type { Node as INode, NodeIterator as INodeIterator, NodeFilterCallback } from '../types.js'
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

  constructor(root: INode, whatToShow: number, filter: NodeFilterCallback | null = null) {
    this.root = root
    this.whatToShow = whatToShow
    this.filter = filter
    this._referenceNode = root
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
    if (node === this.root || !isInclusiveAncestor(node, this._referenceNode)) return

    if (this._pointerBeforeReference) {
      const following = this.firstFollowingNodeOutside(node)
      if (following) {
        this._referenceNode = following
        return
      }
      this._pointerBeforeReference = false
    }

    const previous = node.previousSibling
    if (!previous) {
      const parent = node.parentNode
      if (parent) this._referenceNode = parent
      return
    }

    let reference = previous
    while (reference.lastChild) reference = reference.lastChild
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
    if (node.firstChild) return node.firstChild

    let current: INode | null = node
    while (current && current !== this.root) {
      if (current.nextSibling) return current.nextSibling
      current = current.parentNode
    }
    return null
  }

  private previousInRoot(node: INode): INode | null {
    if (node === this.root) return null

    if (node.previousSibling) {
      let previous = node.previousSibling
      while (previous.lastChild) previous = previous.lastChild
      return previous
    }

    return node.parentNode
  }

  private firstFollowingNodeOutside(node: INode): INode | null {
    let current: INode | null = node
    while (current && current !== this.root) {
      if (current.nextSibling) return current.nextSibling
      current = current.parentNode
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
    const nodeTypeMask = 1 << (node.nodeType - 1)
    return (this.whatToShow & nodeTypeMask) !== 0
  }
}

// Export NodeFilter constants
export { NodeFilter }

function isInclusiveAncestor(ancestor: INode, node: INode): boolean {
  const visited = new Set<INode>()
  let current: INode | null = node

  while (current && !visited.has(current)) {
    if (current === ancestor) return true
    visited.add(current)
    current = current.parentNode
  }
  return false
}
