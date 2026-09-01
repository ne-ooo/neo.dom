import type { Node } from '../types.js'
import {
  getCanonicalTraversalReader,
} from '../dom/node-state.js'

export interface ActiveNodeIterator {
  adjustForNodeRemoval(node: Node): void
}

const iteratorsByRoot = new WeakMap<Node, Set<WeakRef<ActiveNodeIterator>>>()

interface IteratorFinalizationRecord {
  readonly root: WeakRef<Node>
  readonly reference: WeakRef<ActiveNodeIterator>
}

const iteratorFinalizer = new FinalizationRegistry<IteratorFinalizationRecord>(record => {
  const root = record.root.deref()
  if (!root) return

  const iterators = iteratorsByRoot.get(root)
  if (!iterators) return

  iterators.delete(record.reference)
  if (iterators.size === 0) iteratorsByRoot.delete(root)
})

/** Register an iterator for DOM pre-removal steps below its root. */
export function registerNodeIterator(root: Node, iterator: ActiveNodeIterator): void {
  let iterators = iteratorsByRoot.get(root)
  if (!iterators) {
    iterators = new Set()
    iteratorsByRoot.set(root, iterators)
  }
  const reference = new WeakRef(iterator)
  iterators.add(reference)
  iteratorFinalizer.register(iterator, {
    root: new WeakRef(root),
    reference,
  })
}

/** Run DOM pre-removal steps before a node loses its tree links. */
export function notifyNodeIteratorsBeforeRemoval(node: Node, parent: Node): void {
  let ancestor: Node | null = parent
  const canonicalReader = getCanonicalTraversalReader(parent)

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
      if (iterators.size === 0) iteratorsByRoot.delete(ancestor)
    }
    ancestor = canonicalReader
      ? canonicalReader.parentNode<Node>(ancestor)
      : ancestor.parentNode
  }
}
