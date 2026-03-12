/**
 * @lpm.dev/neo.dom - Document Implementation
 *
 * Root of the DOM tree
 */

import type {
  Document as IDocument,
  Element as IElement,
  Text as IText,
  Comment as IComment,
  DocumentFragment as IDocumentFragment,
  NodeIterator as INodeIterator,
  TreeWalker as ITreeWalker,
  NodeFilterCallback,
} from '../types.js'
import { Node } from './node.js'
import { Element } from './element.js'
import { NodeType } from '../utils/constants.js'

/**
 * Text node class
 */
export class Text extends Node implements IText {
  data: string

  constructor(text: string) {
    super(NodeType.TEXT_NODE, '#text', text)
    this.data = text
  }

  override get nodeValue(): string {
    return this.data
  }

  override set nodeValue(value: string | null) {
    this.data = value ?? ''
  }
}

/**
 * Comment node class
 */
export class Comment extends Node implements IComment {
  data: string

  constructor(data: string) {
    super(NodeType.COMMENT_NODE, '#comment', data)
    this.data = data
  }

  override get nodeValue(): string {
    return this.data
  }

  override set nodeValue(value: string | null) {
    this.data = value ?? ''
  }
}

/**
 * DocumentFragment class
 */
export class DocumentFragment extends Node implements IDocumentFragment {
  constructor() {
    super(NodeType.DOCUMENT_FRAGMENT_NODE, '#document-fragment', null)
  }

  get children(): IElement[] {
    return Array.from(this.childNodes).filter(
      node => node.nodeType === NodeType.ELEMENT_NODE
    ) as IElement[]
  }
}

/**
 * Document class
 */
export class Document extends Node implements IDocument {
  private _body: Element

  constructor() {
    super(NodeType.DOCUMENT_NODE, '#document', null)

    // Create body element
    this._body = new Element('body')
    this.appendChild(this._body)
  }

  get body(): IElement {
    return this._body
  }

  get documentElement(): IElement {
    // For our simplified implementation, return body
    // In real DOM, this would be <html> element
    return this._body
  }

  createTextNode(text: string): IText {
    return new Text(text)
  }

  createElement(tagName: string): IElement {
    return new Element(tagName)
  }

  createComment(data: string): IComment {
    return new Comment(data)
  }

  createDocumentFragment(): IDocumentFragment {
    return new DocumentFragment()
  }

  createNodeIterator(
    root: Node,
    whatToShow: number,
    filter?: NodeFilterCallback
  ): INodeIterator {
    // Import dynamically to avoid circular dependency
    const { NodeIterator } = require('../traversal/iterator.js')
    return new NodeIterator(root, whatToShow, filter ?? null)
  }

  createTreeWalker(
    root: Node,
    whatToShow: number,
    filter?: NodeFilterCallback
  ): ITreeWalker {
    // Import dynamically to avoid circular dependency
    const { TreeWalker } = require('../traversal/tree-walker.js')
    return new TreeWalker(root, whatToShow, filter ?? null)
  }
}
