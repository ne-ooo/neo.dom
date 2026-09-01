const concreteNodeStates = new WeakMap<object, unknown>()
let canonicalNodeReader: CanonicalNodeReader | null = null
let canonicalTraversalReader: CanonicalTraversalReader | null = null

type CanonicalNodeReader = (
  node: object,
  field: number,
  ...args: unknown[]
) => unknown

export interface CanonicalTraversalReader {
  nodeType(node: object): number
  parentNode<T extends object>(node: object): T | null
  firstChild<T extends object>(node: object): T | null
  lastChild<T extends object>(node: object): T | null
  nextSibling<T extends object>(node: object): T | null
  previousSibling<T extends object>(node: object): T | null
}

export const NodeMetadataField = {
  NODE_TYPE: 0,
  PARENT_NODE: 1,
  FIRST_CHILD: 2,
  LAST_CHILD: 3,
  NEXT_SIBLING: 4,
  PREVIOUS_SIBLING: 5,
  REPLACE_WITH: 6,
  REMOVE: 7,
  MARK_CONCRETE: 8,
} as const

/** Register the stable internal reader installed by the Node constructor. */
export function registerCanonicalNodeReader(
  reader: CanonicalNodeReader
): void {
  canonicalNodeReader ??= reader
}

/** Register dedicated read-only traversal functions once per module runtime. */
export function registerCanonicalTraversalReader(
  reader: CanonicalTraversalReader
): void {
  canonicalTraversalReader ??= reader
}

/** Register one concrete node and its optional internal state. */
export function registerConcreteNodeState(node: object, state: unknown = null): void {
  concreteNodeStates.set(node, state)
  canonicalNodeReader?.(node, NodeMetadataField.MARK_CONCRETE)
}

/** Test whether a node was created by a concrete neo.dom subclass. */
export function hasConcreteNodeState(node: object): boolean {
  return concreteNodeStates.has(node)
}

/** Read internal state without consulting shadowable public properties. */
export function getConcreteNodeState(node: object): unknown {
  return concreteNodeStates.get(node)
}

/** Read canonical node structure without consulting public or own properties. */
export function getCanonicalNodeMetadataField(
  node: object,
  field: number
): unknown {
  if (!concreteNodeStates.has(node)) return undefined
  return canonicalNodeReader ? canonicalNodeReader(node, field) : undefined
}

export function getCanonicalNodeType(node: object): number | undefined {
  return getCanonicalNodeMetadataField(node, NodeMetadataField.NODE_TYPE) as
    | number
    | undefined
}

export function getCanonicalParentNode<T extends object>(node: object): T | null | undefined {
  return getCanonicalNodeMetadataField(node, NodeMetadataField.PARENT_NODE) as
    | T
    | null
    | undefined
}

export function getCanonicalFirstChild<T extends object>(node: object): T | null | undefined {
  return getCanonicalNodeMetadataField(node, NodeMetadataField.FIRST_CHILD) as
    | T
    | null
    | undefined
}

export function getCanonicalLastChild<T extends object>(node: object): T | null | undefined {
  return getCanonicalNodeMetadataField(node, NodeMetadataField.LAST_CHILD) as
    | T
    | null
    | undefined
}

export function getCanonicalNextSibling<T extends object>(node: object): T | null | undefined {
  return getCanonicalNodeMetadataField(node, NodeMetadataField.NEXT_SIBLING) as
    | T
    | null
    | undefined
}

export function getCanonicalPreviousSibling<T extends object>(node: object): T | null | undefined {
  return getCanonicalNodeMetadataField(node, NodeMetadataField.PREVIOUS_SIBLING) as
    | T
    | null
    | undefined
}

/** Replace a canonical node through its unshadowable internal mutation path. */
export function replaceCanonicalNodeWithNodes(
  node: object,
  nodes: readonly object[]
): void {
  if (!concreteNodeStates.has(node) || !canonicalNodeReader) {
    throw new TypeError('Cannot replace a non-canonical neo.dom node')
  }
  canonicalNodeReader(node, NodeMetadataField.REPLACE_WITH, nodes)
}

/** Remove a canonical node through its unshadowable internal mutation path. */
export function removeCanonicalNode(node: object): void {
  if (!concreteNodeStates.has(node) || !canonicalNodeReader) {
    throw new TypeError('Cannot remove a non-canonical neo.dom node')
  }
  canonicalNodeReader(node, NodeMetadataField.REMOVE)
}

/** Get a read-only fast path after one canonical-root brand check. */
export function getCanonicalTraversalReader(
  root: object
): CanonicalTraversalReader | undefined {
  return concreteNodeStates.has(root) && canonicalTraversalReader
    ? canonicalTraversalReader
    : undefined
}
