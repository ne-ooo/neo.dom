/**
 * @lpm.dev/neo.dom - TypeScript Type Definitions
 *
 * Minimal DOM API types for HTML parsing and traversal
 * NOT a full W3C DOM implementation - a focused parsing and traversal subset
 */

/**
 * Node interface (base class for all DOM nodes)
 */
export interface Node {
  /** Node type (ELEMENT_NODE, TEXT_NODE, etc.) */
  readonly nodeType: number

  /** Node name (tag name for elements, '#text' for text nodes) */
  readonly nodeName: string

  /** Node value (text content for text nodes, null for elements) */
  nodeValue: string | null

  /** Parent node */
  readonly parentNode: Node | null

  /** Child nodes list */
  childNodes: NodeList

  /** First child node */
  firstChild: Node | null

  /** Last child node */
  lastChild: Node | null

  /** Next sibling node */
  nextSibling: Node | null

  /** Previous sibling node */
  previousSibling: Node | null

  /** Text content (includes all descendant text) */
  textContent: string | null

  /**
   * Append a child node
   */
  appendChild(node: Node): Node

  /**
   * Remove a child node
   */
  removeChild(node: Node): Node

  /**
   * Replace a child node with another
   */
  replaceChild(newNode: Node, oldNode: Node): Node

  /**
   * Insert a node before a reference node
   */
  insertBefore(newNode: Node, refNode: Node | null): Node

  /**
   * Clone this node
   */
  cloneNode(deep?: boolean): Node
}

/**
 * Element interface (represents an HTML element)
 */
export interface Element extends Node {
  /** Uppercase for HTML elements; source casing for foreign-content elements */
  readonly tagName: string

  /** Element local name, preserving foreign-content casing */
  readonly localName: string

  /** Namespace URI assigned by the HTML parser */
  readonly namespaceURI: string

  /** Attributes collection */
  readonly attributes: NamedNodeMap

  /** Inner HTML (serialized HTML of children) */
  innerHTML: string

  /**
   * Get an attribute value
   */
  getAttribute(name: string): string | null

  /**
   * Set an attribute
   */
  setAttribute(name: string, value: string): void

  /**
   * Remove an attribute
   */
  removeAttribute(name: string): void

  /**
   * Check if element has an attribute
   */
  hasAttribute(name: string): boolean

  /**
   * Remove this element from its parent
   */
  remove(): void

  /**
   * Replace this element with other nodes
   */
  replaceWith(...nodes: (Node | string)[]): void
}

/**
 * Text node interface
 */
export interface Text extends Node {
  /** Text data */
  data: string
}

/**
 * Comment node interface
 */
export interface Comment extends Node {
  /** Comment data */
  data: string
}

/**
 * Document interface (root of the DOM tree)
 */
export interface Document extends Node {
  /** Document head element */
  readonly head: Element | null

  /** Document body element */
  readonly body: Element | null

  /** Root HTML element */
  readonly documentElement: Element | null

  /**
   * Create a text node
   */
  createTextNode(text: string): Text

  /**
   * Create an element
   */
  createElement(tagName: string): Element

  /**
   * Create a comment node
   */
  createComment(data: string): Comment

  /**
   * Create a document fragment
   */
  createDocumentFragment(): DocumentFragment

  /**
   * Create a node iterator
   */
  createNodeIterator(
    root: Node,
    whatToShow: number,
    filter?: NodeFilterCallback
  ): NodeIterator

  /**
   * Create a tree walker
   */
  createTreeWalker(
    root: Node,
    whatToShow: number,
    filter?: NodeFilterCallback
  ): TreeWalker
}

/**
 * Document type declaration.
 */
export interface DocumentType extends Node {
  readonly name: string
  readonly publicId: string
  readonly systemId: string
}

/**
 * DocumentFragment interface
 */
export interface DocumentFragment extends Node {
  /** Children of the fragment */
  readonly children: Element[]
}

/**
 * NodeList interface (array-like collection of nodes)
 */
export interface NodeList {
  /** Number of nodes */
  readonly length: number

  /** Get node by index */
  item(index: number): Node | null

  /** Array access */
  [index: number]: Node

  /** Iterate nodes in order */
  [Symbol.iterator](): IterableIterator<Node>
}

/**
 * Attribute interface
 */
export interface Attr {
  /** Attribute name */
  readonly name: string

  /** Attribute value */
  value: string
}

/**
 * NamedNodeMap interface (collection of attributes)
 */
export interface NamedNodeMap {
  /** Number of attributes */
  readonly length: number

  /** Get attribute by index */
  item(index: number): Attr | null

  /** Get attribute by name */
  getNamedItem(name: string): Attr | null

  /** Validate and store a copy of an attribute */
  setNamedItem(attr: Attr): Attr | null

  /** Remove attribute by name */
  removeNamedItem(name: string): Attr | null

  /** Array access */
  readonly [index: number]: Attr

  /** Iterate attributes in insertion order */
  [Symbol.iterator](): IterableIterator<Attr>
}

/**
 * NodeIterator interface (for traversing DOM tree)
 */
export interface NodeIterator {
  /** Root node */
  readonly root: Node

  /** What to show filter */
  readonly whatToShow: number

  /** Filter function */
  readonly filter: NodeFilterCallback | null

  /** Current reference node */
  readonly referenceNode: Node

  /** Whether the iterator is positioned before the reference node */
  readonly pointerBeforeReference: boolean

  /** Get next node */
  nextNode(): Node | null

  /** Get previous node */
  previousNode(): Node | null
}

/**
 * TreeWalker interface (for traversing DOM tree with more control)
 */
export interface TreeWalker {
  /** Root node */
  readonly root: Node

  /** Current node */
  currentNode: Node

  /** What to show filter */
  readonly whatToShow: number

  /** Filter function */
  readonly filter: NodeFilterCallback | null

  /** Move to parent node */
  parentNode(): Node | null

  /** Move to first child */
  firstChild(): Node | null

  /** Move to last child */
  lastChild(): Node | null

  /** Move to previous sibling */
  previousSibling(): Node | null

  /** Move to next sibling */
  nextSibling(): Node | null

  /** Move to previous node */
  previousNode(): Node | null

  /** Move to next node */
  nextNode(): Node | null
}

/**
 * Node filter callback
 */
export type NodeFilterCallback = (node: Node) => number

/**
 * DOMParser interface (for parsing HTML strings)
 */
export interface DOMParser {
  /**
   * Parse HTML string to Document
   */
  parseFromString(html: string, mimeType: 'text/html'): Document
}

/** Resource limits applied by DOMParser to untrusted or accidental large input. */
export interface DOMParserOptions {
  /** Maximum input length in JavaScript UTF-16 code units. Default: 10 MiB. */
  maxInputLength?: number

  /** Maximum number of less-than signs in the input. Default: 250,000. */
  maxMarkupStarts?: number

  /** Maximum number of parsed DOM nodes, excluding the Document node. Default: 100,000. */
  maxNodes?: number

  /** Maximum transient HTML parser open-element count. Default: 512. */
  maxOpenElements?: number

  /** Maximum final parsed tree depth below the Document node. Default: 2,048. */
  maxDepth?: number

  /** Maximum number of attributes on one element. Default: 1,024. */
  maxAttributesPerElement?: number
}

/**
 * Token types (internal parser use)
 */
export type TokenType =
  | 'StartTag'
  | 'EndTag'
  | 'Text'
  | 'Comment'
  | 'EOF'

/**
 * Token (internal parser use)
 */
export interface Token {
  type: TokenType
  name?: string
  attributes?: Map<string, string>
  data?: string
}
