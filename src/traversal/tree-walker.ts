/**
 * @lpm.dev/neo.dom - TreeWalker
 *
 * Traverses DOM tree nodes with directional navigation
 */

import type { Node as INode, TreeWalker as ITreeWalker, NodeFilterCallback } from '../types.js'
import { NodeFilter } from '../utils/constants.js'

/**
 * TreeWalker implementation
 *
 * Traverses a DOM tree with fine-grained directional control,
 * supporting parent, child, and sibling navigation.
 */
export class TreeWalker implements ITreeWalker {
  readonly root: INode
  readonly whatToShow: number
  readonly filter: NodeFilterCallback | null
  currentNode: INode

  constructor(root: INode, whatToShow: number, filter: NodeFilterCallback | null = null) {
    this.root = root
    this.whatToShow = whatToShow
    this.filter = filter
    this.currentNode = root
  }

  /**
   * Move to the parent node
   *
   * @returns Parent node or null if at root
   */
  parentNode(): INode | null {
    let node: INode | null = this.currentNode.parentNode

    while (node && node !== this.root.parentNode) {
      if (this.filterNode(node) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        return node
      }
      node = node.parentNode
    }

    return null
  }

  /**
   * Move to the first child node
   *
   * @returns First child or null if no children
   */
  firstChild(): INode | null {
    return this.traverseChildren(true)
  }

  /**
   * Move to the last child node
   *
   * @returns Last child or null if no children
   */
  lastChild(): INode | null {
    return this.traverseChildren(false)
  }

  /**
   * Move to the previous sibling
   *
   * @returns Previous sibling or null if none
   */
  previousSibling(): INode | null {
    return this.traverseSiblings(false)
  }

  /**
   * Move to the next sibling
   *
   * @returns Next sibling or null if none
   */
  nextSibling(): INode | null {
    return this.traverseSiblings(true)
  }

  /**
   * Move to the previous node in document order
   *
   * @returns Previous node or null if at beginning
   */
  previousNode(): INode | null {
    let node: INode = this.currentNode

    while (node !== this.root) {
      // Try previous sibling's last descendant
      let sibling: INode | null = node.previousSibling
      while (sibling) {
        const result = this.filterNode(sibling)
        if (result === NodeFilter.FILTER_REJECT) {
          sibling = sibling.previousSibling
          continue
        }

        // Go to last descendant
        let child: INode | null = sibling.lastChild
        while (child) {
          const childResult = this.filterNode(child)
          if (childResult === NodeFilter.FILTER_REJECT) {
            child = child.previousSibling
            continue
          }
          if (childResult === NodeFilter.FILTER_ACCEPT) {
            this.currentNode = child
            return child
          }
          // FILTER_SKIP — go deeper
          const lastChild = child.lastChild
          if (lastChild) {
            child = lastChild
          } else {
            child = child.previousSibling
          }
        }

        if (result === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = sibling
          return sibling
        }
        sibling = sibling.previousSibling
      }

      // Try parent
      const parent: INode | null = node.parentNode
      if (!parent || parent === this.root.parentNode) {
        return null
      }

      if (this.filterNode(parent) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = parent
        return parent
      }

      node = parent
    }

    return null
  }

  /**
   * Move to the next node in document order
   *
   * @returns Next node or null if at end
   */
  nextNode(): INode | null {
    let node: INode | null = this.currentNode
    let result: number = NodeFilter.FILTER_ACCEPT

    // eslint-disable-next-line no-constant-condition
    outer: while (true) {
      // Try to go deeper if current node is not rejected
      while (result !== NodeFilter.FILTER_REJECT && node !== null && node.firstChild) {
        node = node.firstChild
        result = this.filterNode(node)
        if (result === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = node
          return node
        }
      }

      // Try siblings and parent's siblings
      let sibling: INode | null = null
      let temp: INode | null = node

      while (temp) {
        if (temp === this.root) {
          break outer
        }

        sibling = temp.nextSibling
        if (sibling) {
          node = sibling
          break
        }

        temp = temp.parentNode
      }

      if (!sibling) {
        break
      }

      result = this.filterNode(node!)
      if (result === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node!
        return node!
      }
    }

    return null
  }

  /**
   * Traverse children (first or last)
   */
  private traverseChildren(first: boolean): INode | null {
    let node: INode | null = first ? this.currentNode.firstChild : this.currentNode.lastChild

    while (node) {
      const result = this.filterNode(node)

      if (result === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        return node
      }

      if (result !== NodeFilter.FILTER_REJECT) {
        // FILTER_SKIP — try children of this node
        const child = first ? node.firstChild : node.lastChild
        if (child) {
          node = child
          continue
        }
      }

      // Try next/previous sibling
      while (node) {
        const sibling = first ? node.nextSibling : node.previousSibling
        if (sibling) {
          node = sibling
          break
        }

        const parent: INode | null = node.parentNode
        if (!parent || parent === this.currentNode) {
          return null
        }
        node = parent
      }
    }

    return null
  }

  /**
   * Traverse siblings (next or previous)
   */
  private traverseSiblings(next: boolean): INode | null {
    let node: INode = this.currentNode

    if (node === this.root) {
      return null
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let sibling: INode | null = next ? node.nextSibling : node.previousSibling

      while (sibling) {
        const result = this.filterNode(sibling)

        if (result === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = sibling
          return sibling
        }

        if (result !== NodeFilter.FILTER_REJECT) {
          // FILTER_SKIP — check children
          const child = next ? sibling.firstChild : sibling.lastChild
          if (child) {
            sibling = child
            continue
          }
        }

        sibling = next ? sibling.nextSibling : sibling.previousSibling
      }

      const parent: INode | null = node.parentNode
      if (!parent || parent === this.root) {
        return null
      }

      if (this.filterNode(parent) === NodeFilter.FILTER_ACCEPT) {
        return null
      }

      node = parent
    }
  }

  /**
   * Apply whatToShow and filter function to a node
   */
  private filterNode(node: INode): number {
    if (!this.matchesWhatToShow(node)) {
      return NodeFilter.FILTER_SKIP
    }

    if (this.filter) {
      return this.filter(node)
    }

    return NodeFilter.FILTER_ACCEPT
  }

  /**
   * Check if node matches whatToShow bitmask
   */
  private matchesWhatToShow(node: INode): boolean {
    if (this.whatToShow === NodeFilter.SHOW_ALL) {
      return true
    }
    const nodeTypeMask = 1 << (node.nodeType - 1)
    return (this.whatToShow & nodeTypeMask) !== 0
  }
}

// Export NodeFilter constants
export { NodeFilter }
