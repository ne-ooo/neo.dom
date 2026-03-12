/**
 * @lpm.dev/neo.dom - Lightweight DOM Parser for Node.js
 *
 * Security-focused, minimal DOM implementation for server-side HTML parsing
 *
 * @example
 * import { DOMParser } from '@lpm.dev/neo.dom'
 *
 * const parser = new DOMParser()
 * const doc = parser.parseFromString('<p>Hello <strong>world</strong></p>', 'text/html')
 *
 * console.log(doc.body.innerHTML)
 * // '<p>Hello <strong>world</strong></p>'
 */

// Main exports
export { DOMParser } from './parser/parser.js'
export { Document, Text, Comment, DocumentFragment } from './dom/document.js'
export { Element } from './dom/element.js'
export { Node } from './dom/node.js'

// Constants
export { NodeType, NodeFilter, VOID_ELEMENTS } from './utils/constants.js'

// Types
export type {
  Node as INode,
  Element as IElement,
  Text as IText,
  Comment as IComment,
  Document as IDocument,
  DocumentFragment as IDocumentFragment,
  NodeList,
  Attr,
  NamedNodeMap,
  NodeIterator,
  TreeWalker,
  Token,
  TokenType,
} from './types.js'
