/**
 * @lpm.dev/neo.dom - TreeWalker
 *
 * Traverses the filtered logical view of a DOM tree.
 */

import type { Node as INode, TreeWalker as ITreeWalker, NodeFilterCallback } from '../types.js'
import { NodeFilter } from '../utils/constants.js'

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

  parentNode(): INode | null {
    let node = this.currentNode.parentNode
    while (node && node !== this.root.parentNode) {
      if (this.filterNode(node) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        return node
      }
      node = node.parentNode
    }
    return null
  }

  firstChild(): INode | null {
    for (let child = this.currentNode.firstChild; child; child = child.nextSibling) {
      const candidate = this.firstPromotedNode(child)
      if (candidate) {
        this.currentNode = candidate
        return candidate
      }
    }
    return null
  }

  lastChild(): INode | null {
    for (let child = this.currentNode.lastChild; child; child = child.previousSibling) {
      const candidate = this.lastPromotedNode(child)
      if (candidate) {
        this.currentNode = candidate
        return candidate
      }
    }
    return null
  }

  previousSibling(): INode | null {
    return this.traverseSiblings(false)
  }

  nextSibling(): INode | null {
    return this.traverseSiblings(true)
  }

  previousNode(): INode | null {
    let node = this.currentNode

    while (node !== this.root) {
      for (let sibling = node.previousSibling; sibling; sibling = sibling.previousSibling) {
        const candidate = this.lastAcceptedInSubtree(sibling)
        if (candidate) {
          this.currentNode = candidate
          return candidate
        }
      }

      const parent = node.parentNode
      if (!parent || parent === this.root.parentNode) return null
      node = parent

      if (this.filterNode(node) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        return node
      }
    }

    return null
  }

  nextNode(): INode | null {
    let node = this.currentNode
    let descend = true

    while (true) {
      const candidate = this.nextStructuralNode(node, descend)
      if (!candidate) return null

      const result = this.filterNode(candidate)
      if (result === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = candidate
        return candidate
      }

      node = candidate
      descend = result !== NodeFilter.FILTER_REJECT
    }
  }

  private traverseSiblings(next: boolean): INode | null {
    let node = this.currentNode
    if (node === this.root) return null

    while (node !== this.root) {
      let sibling = next ? node.nextSibling : node.previousSibling
      while (sibling) {
        const candidate = next
          ? this.firstPromotedNode(sibling)
          : this.lastPromotedNode(sibling)
        if (candidate) {
          this.currentNode = candidate
          return candidate
        }
        sibling = next ? sibling.nextSibling : sibling.previousSibling
      }

      const parent = node.parentNode
      if (!parent || parent === this.root) return null
      const parentResult = this.filterNode(parent)
      if (parentResult !== NodeFilter.FILTER_SKIP) return null
      node = parent
    }

    return null
  }

  /** Find the first logical node promoted through FILTER_SKIP ancestors. */
  private firstPromotedNode(start: INode): INode | null {
    const stack: INode[] = [start]
    while (stack.length > 0) {
      const node = stack.pop()
      if (!node) continue

      const result = this.filterNode(node)
      if (result === NodeFilter.FILTER_ACCEPT) return node
      if (result === NodeFilter.FILTER_REJECT) continue

      for (let child = node.lastChild; child; child = child.previousSibling) {
        stack.push(child)
      }
    }
    return null
  }

  /** Find the last logical node promoted through FILTER_SKIP ancestors. */
  private lastPromotedNode(start: INode): INode | null {
    const stack: INode[] = [start]
    while (stack.length > 0) {
      const node = stack.pop()
      if (!node) continue

      const result = this.filterNode(node)
      if (result === NodeFilter.FILTER_ACCEPT) return node
      if (result === NodeFilter.FILTER_REJECT) continue

      for (let child = node.firstChild; child; child = child.nextSibling) {
        stack.push(child)
      }
    }
    return null
  }

  /** Find the final accepted node in document order inside a visible subtree. */
  private lastAcceptedInSubtree(start: INode): INode | null {
    type ReverseFrame = {
      node: INode
      result: number | null
      nextChild: INode | null
    }
    const stack: ReverseFrame[] = [{ node: start, result: null, nextChild: null }]

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (!frame) continue

      if (frame.result === null) {
        frame.result = this.filterNode(frame.node)
        if (frame.result === NodeFilter.FILTER_REJECT) {
          stack.pop()
          continue
        }
        frame.nextChild = frame.node.lastChild
      }

      const child = frame.nextChild
      if (child) {
        frame.nextChild = child.previousSibling
        stack.push({ node: child, result: null, nextChild: null })
        continue
      }

      stack.pop()
      if (frame.result === NodeFilter.FILTER_ACCEPT) return frame.node
    }

    return null
  }

  private nextStructuralNode(node: INode, descend: boolean): INode | null {
    if (descend && node.firstChild) return node.firstChild

    let current: INode | null = node
    while (current && current !== this.root) {
      if (current.nextSibling) return current.nextSibling
      current = current.parentNode
    }
    return null
  }

  private filterNode(node: INode): number {
    if (!this.matchesWhatToShow(node)) return NodeFilter.FILTER_SKIP
    return this.filter ? this.filter(node) : NodeFilter.FILTER_ACCEPT
  }

  private matchesWhatToShow(node: INode): boolean {
    if (this.whatToShow === NodeFilter.SHOW_ALL) return true
    const nodeTypeMask = 1 << (node.nodeType - 1)
    return (this.whatToShow & nodeTypeMask) !== 0
  }
}

export { NodeFilter }
