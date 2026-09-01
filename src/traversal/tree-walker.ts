/**
 * @lpm.dev/neo.dom - TreeWalker
 *
 * Traverses the filtered logical view of a DOM tree.
 */

import type { Node as INode, TreeWalker as ITreeWalker, NodeFilterCallback } from '../types.js'
import {
  type CanonicalTraversalReader,
  getCanonicalTraversalReader,
} from '../dom/node-state.js'
import { NodeFilter } from '../utils/constants.js'

export class TreeWalker implements ITreeWalker {
  readonly root: INode
  readonly whatToShow: number
  readonly filter: NodeFilterCallback | null
  currentNode: INode
  readonly #rootCanonicalReader: CanonicalTraversalReader | undefined
  #activeCanonicalReader: CanonicalTraversalReader | undefined

  constructor(root: INode, whatToShow: number, filter: NodeFilterCallback | null = null) {
    this.root = root
    this.whatToShow = whatToShow
    this.filter = filter
    this.currentNode = root
    this.#rootCanonicalReader = getCanonicalTraversalReader(root)
    this.#activeCanonicalReader = this.#rootCanonicalReader
  }

  parentNode(): INode | null {
    this.#prepareTraversal()
    let node = this.#parentNode(this.currentNode)
    const rootParent = this.#parentNode(this.root)
    while (node && node !== rootParent) {
      if (this.filterNode(node) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        return node
      }
      node = this.#parentNode(node)
    }
    return null
  }

  firstChild(): INode | null {
    this.#prepareTraversal()
    for (let child = this.#firstChild(this.currentNode); child; child = this.#nextSibling(child)) {
      const candidate = this.firstPromotedNode(child)
      if (candidate) {
        this.currentNode = candidate
        return candidate
      }
    }
    return null
  }

  lastChild(): INode | null {
    this.#prepareTraversal()
    for (let child = this.#lastChild(this.currentNode); child; child = this.#previousSibling(child)) {
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
    this.#prepareTraversal()
    let node = this.currentNode

    while (node !== this.root) {
      for (let sibling = this.#previousSibling(node); sibling; sibling = this.#previousSibling(sibling)) {
        const candidate = this.lastAcceptedInSubtree(sibling)
        if (candidate) {
          this.currentNode = candidate
          return candidate
        }
      }

      const parent = this.#parentNode(node)
      if (!parent || parent === this.#parentNode(this.root)) return null
      node = parent

      if (this.filterNode(node) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        return node
      }
    }

    return null
  }

  nextNode(): INode | null {
    this.#prepareTraversal()
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
    this.#prepareTraversal()
    let node = this.currentNode
    if (node === this.root) return null

    while (node !== this.root) {
      let sibling = next ? this.#nextSibling(node) : this.#previousSibling(node)
      while (sibling) {
        const candidate = next
          ? this.firstPromotedNode(sibling)
          : this.lastPromotedNode(sibling)
        if (candidate) {
          this.currentNode = candidate
          return candidate
        }
        sibling = next ? this.#nextSibling(sibling) : this.#previousSibling(sibling)
      }

      const parent = this.#parentNode(node)
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

      for (let child = this.#lastChild(node); child; child = this.#previousSibling(child)) {
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

      for (let child = this.#firstChild(node); child; child = this.#nextSibling(child)) {
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
        frame.nextChild = this.#lastChild(frame.node)
      }

      const child = frame.nextChild
      if (child) {
        frame.nextChild = this.#previousSibling(child)
        stack.push({ node: child, result: null, nextChild: null })
        continue
      }

      stack.pop()
      if (frame.result === NodeFilter.FILTER_ACCEPT) return frame.node
    }

    return null
  }

  private nextStructuralNode(node: INode, descend: boolean): INode | null {
    const firstChild = descend ? this.#firstChild(node) : null
    if (firstChild) return firstChild

    let current: INode | null = node
    while (current && current !== this.root) {
      const nextSibling = this.#nextSibling(current)
      if (nextSibling) return nextSibling
      current = this.#parentNode(current)
    }
    return null
  }

  private filterNode(node: INode): number {
    if (!this.matchesWhatToShow(node)) return NodeFilter.FILTER_SKIP
    return this.filter ? this.filter(node) : NodeFilter.FILTER_ACCEPT
  }

  private matchesWhatToShow(node: INode): boolean {
    if (this.whatToShow === NodeFilter.SHOW_ALL) return true
    const nodeTypeMask = 1 << (this.#nodeType(node) - 1)
    return (this.whatToShow & nodeTypeMask) !== 0
  }

  #prepareTraversal(): void {
    this.#activeCanonicalReader = this.#rootCanonicalReader &&
      getCanonicalTraversalReader(this.currentNode)
      ? this.#rootCanonicalReader
      : undefined
  }

  #nodeType(node: INode): number {
    return this.#activeCanonicalReader
      ? this.#activeCanonicalReader.nodeType(node)
      : node.nodeType
  }

  #parentNode(node: INode): INode | null {
    return this.#activeCanonicalReader
      ? this.#activeCanonicalReader.parentNode<INode>(node)
      : node.parentNode
  }

  #firstChild(node: INode): INode | null {
    return this.#activeCanonicalReader
      ? this.#activeCanonicalReader.firstChild<INode>(node)
      : node.firstChild
  }

  #lastChild(node: INode): INode | null {
    return this.#activeCanonicalReader
      ? this.#activeCanonicalReader.lastChild<INode>(node)
      : node.lastChild
  }

  #nextSibling(node: INode): INode | null {
    return this.#activeCanonicalReader
      ? this.#activeCanonicalReader.nextSibling<INode>(node)
      : node.nextSibling
  }

  #previousSibling(node: INode): INode | null {
    return this.#activeCanonicalReader
      ? this.#activeCanonicalReader.previousSibling<INode>(node)
      : node.previousSibling
  }
}

export { NodeFilter }
