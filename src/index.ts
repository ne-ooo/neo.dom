/**
 * @lpm.dev/neo.dom - Lightweight DOM Parser for Node.js
 *
 * HTML5-compliant parsing with a minimal DOM implementation for Node.js
 *
 * @example
 * import { DOMParser } from '@lpm.dev/neo.dom'
 *
 * const parser = new DOMParser()
 * const doc = parser.parseFromString('<p>Hello <strong>world</strong></p>', 'text/html')
 *
 * console.log(doc.body?.innerHTML)
 * // '<p>Hello <strong>world</strong></p>'
 */

// Main exports
export { DOMParser, DEFAULT_DOM_PARSER_OPTIONS } from './parser/parser.js'
export { Document, Text, Comment, DocumentFragment, DocumentType } from './dom/document.js'
export { Element, HTMLTemplateElement } from './dom/element.js'
export { Node } from './dom/node.js'
export { NodeIterator, TreeWalker } from './traversal/index.js'

// Constants
export { NodeType, NodeFilter, VOID_ELEMENTS, HTML_NAMESPACE } from './utils/constants.js'

// Types
export type {
  Node as INode,
  Element as IElement,
  Text as IText,
  Comment as IComment,
  Document as IDocument,
  DocumentFragment as IDocumentFragment,
  DocumentType as IDocumentType,
  HTMLTemplateElement as IHTMLTemplateElement,
  NodeList,
  Attr,
  NamedNodeMap,
  NodeIterator as INodeIterator,
  TreeWalker as ITreeWalker,
  Token,
  TokenType,
  DOMParserOptions,
} from './types.js'
