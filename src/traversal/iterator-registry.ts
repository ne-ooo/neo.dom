import type { Node } from '../types.js'

export interface ActiveNodeIterator {
  adjustForNodeRemoval(node: Node): void
}

const iteratorsByRoot = new WeakMap<Node, Set<WeakRef<ActiveNodeIterator>>>()

/** Register an iterator for DOM pre-removal steps below its root. */
export function registerNodeIterator(root: Node, iterator: ActiveNodeIterator): void {
  let iterators = iteratorsByRoot.get(root)
  if (!iterators) {
    iterators = new Set()
    iteratorsByRoot.set(root, iterators)
  }
  iterators.add(new WeakRef(iterator))
}

/** Run DOM pre-removal steps before a node loses its tree links. */
export function notifyNodeIteratorsBeforeRemoval(node: Node, parent: Node): void {
  let ancestor: Node | null = parent

  while (ancestor) {
    const iterators = iteratorsByRoot.get(ancestor)
    if (iterators) {
      for (const reference of iterators) {
        const iterator = reference.deref()
        if (iterator) {
          iterator.adjustForNodeRemoval(node)
        } else {
          iterators.delete(reference)
        }
      }
    }
    ancestor = ancestor.parentNode
  }
}
