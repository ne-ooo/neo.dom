/**
 * @lpm.dev/neo.dom - NodeIterator
 *
 * Traverses DOM tree nodes in document order
 */

import type { Node as INode, NodeIterator as INodeIterator, NodeFilterCallback } from '../types.js'
import { NodeFilter } from '../utils/constants.js'

/**
 * NodeIterator implementation
 *
 * Iterates through nodes in a DOM tree in document order
 */
export class NodeIterator implements INodeIterator {
  readonly root: INode
  readonly whatToShow: number
  readonly filter: NodeFilterCallback | null
  private currentNode: INode | null
  private started: boolean = false

  constructor(root: INode, whatToShow: number, filter: NodeFilterCallback | null = null) {
    this.root = root
    this.whatToShow = whatToShow
    this.filter = filter
    this.currentNode = root
  }

  /**
   * Get next node in iteration
   *
   * @returns Next node or null if at end
   */
  nextNode(): INode | null {
    if (!this.started) {
      this.started = true
      // First call - check if root matches
      if (this.acceptNode(this.root)) {
        this.currentNode = this.root
        return this.root
      }
    }

    // Traverse in document order (depth-first)
    let node = this.currentNode

    while (node) {
      // Try first child
      if (node.firstChild) {
        node = node.firstChild
        if (this.acceptNode(node)) {
          this.currentNode = node
          return node
        }
        continue
      }

      // Try next sibling
      while (node) {
        if (node.nextSibling) {
          node = node.nextSibling
          if (this.acceptNode(node)) {
            this.currentNode = node
            return node
          }
          break
        }

        // Move up to parent
        if (node === this.root) {
          // Reached root, iteration complete
          return null
        }

        node = node.parentNode
      }
    }

    return null
  }

  /**
   * Get previous node in iteration
   *
   * @returns Previous node or null if at beginning
   */
  previousNode(): INode | null {
    let node = this.currentNode

    if (node === this.root) {
      return null
    }

    // Traverse in reverse document order
    while (node) {
      // Try previous sibling's last descendant
      if (node.previousSibling) {
        node = node.previousSibling

        // Go to last descendant
        while (node.lastChild) {
          node = node.lastChild
        }

        if (this.acceptNode(node)) {
          this.currentNode = node
          return node
        }
        continue
      }

      // Try parent
      if (node.parentNode && node.parentNode !== this.root) {
        node = node.parentNode
        if (this.acceptNode(node)) {
          this.currentNode = node
          return node
        }
        continue
      }

      // Reached root
      if (this.acceptNode(this.root)) {
        this.currentNode = this.root
        return this.root
      }

      return null
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
