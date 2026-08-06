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
  DocumentType as IDocumentType,
  NodeIterator as INodeIterator,
  TreeWalker as ITreeWalker,
  NodeFilterCallback,
} from '../types.js'
import { Node } from './node.js'
import { Element } from './element.js'
import { NodeType } from '../utils/constants.js'
import { NodeIterator } from '../traversal/iterator.js'
import { TreeWalker } from '../traversal/tree-walker.js'

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

  override get textContent(): string {
    return this.nodeValue
  }

  override set textContent(value: string | null) {
    this.nodeValue = value
  }

  protected override cloneShallow(): Text {
    return new Text(this.data)
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

  override get textContent(): string {
    return this.nodeValue
  }

  override set textContent(value: string | null) {
    this.nodeValue = value
  }

  protected override cloneShallow(): Comment {
    return new Comment(this.data)
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

  protected override cloneShallow(): DocumentFragment {
    return new DocumentFragment()
  }

  protected override createTextContentNode(value: string): Text {
    return new Text(value)
  }
}

/**
 * Document type declaration.
 */
export class DocumentType extends Node implements IDocumentType {
  readonly name: string
  readonly publicId: string
  readonly systemId: string

  constructor(name: string, publicId: string = '', systemId: string = '') {
    super(NodeType.DOCUMENT_TYPE_NODE, name, null)
    this.name = name
    this.publicId = publicId
    this.systemId = systemId
  }

  protected override cloneShallow(): DocumentType {
    return new DocumentType(this.name, this.publicId, this.systemId)
  }
}

/**
 * Document class
 */
export class Document extends Node implements IDocument {
  private _documentElement: Element
  private _head: Element
  private _body: Element

  constructor() {
    super(NodeType.DOCUMENT_NODE, '#document', null)

    this._documentElement = new Element('html')
    this._head = new Element('head')
    this._body = new Element('body')
    this.appendChild(this._documentElement)
    this._documentElement.appendChild(this._head)
    this._documentElement.appendChild(this._body)
  }

  get head(): IElement {
    return this._head
  }

  get body(): IElement {
    return this._body
  }

  get documentElement(): IElement {
    return this._documentElement
  }

  override cloneNode(_deep: boolean = false): never {
    throw new Error('Document.cloneNode() is not supported')
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
    return new NodeIterator(root, whatToShow, filter ?? null)
  }

  createTreeWalker(
    root: Node,
    whatToShow: number,
    filter?: NodeFilterCallback
  ): ITreeWalker {
    return new TreeWalker(root, whatToShow, filter ?? null)
  }
}
