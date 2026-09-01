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
  HTMLTemplateElement as IHTMLTemplateElement,
  NodeIterator as INodeIterator,
  TreeWalker as ITreeWalker,
  NodeFilterCallback,
} from '../types.js'
import { Node, registerConcreteNode } from './node.js'
import { createHTMLElement, Element } from './element.js'
import {
  ElementMetadataField,
  getCanonicalElementMetadataField,
} from './element-state.js'
import { HTML_NAMESPACE, NodeType } from '../utils/constants.js'
import {
  getCanonicalFirstChild,
  getCanonicalNextSibling,
  getCanonicalNodeType,
} from './node-state.js'
import { NodeIterator } from '../traversal/iterator.js'
import { TreeWalker } from '../traversal/tree-walker.js'

/**
 * Text node class
 */
export class Text extends Node implements IText {
  data: string

  constructor(text: string) {
    super(NodeType.TEXT_NODE, '#text', text)
    registerConcreteNode(this)
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
    registerConcreteNode(this)
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
    registerConcreteNode(this)
  }

  get children(): IElement[] {
    const children: IElement[] = []
    for (
      let child = getCanonicalFirstChild<Node>(this) ?? null;
      child;
      child = getCanonicalNextSibling<Node>(child) ?? null
    ) {
      if (getCanonicalNodeType(child) === NodeType.ELEMENT_NODE) {
        children.push(child as unknown as IElement)
      }
    }
    return children
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
  readonly name!: string
  readonly publicId!: string
  readonly systemId!: string

  constructor(name: string, publicId: string = '', systemId: string = '') {
    super(NodeType.DOCUMENT_TYPE_NODE, name, null)
    registerConcreteNode(this)
    Object.defineProperties(this, {
      name: immutableProperty(name),
      publicId: immutableProperty(publicId),
      systemId: immutableProperty(systemId),
    })
  }

  protected override cloneShallow(): DocumentType {
    return new DocumentType(this.name, this.publicId, this.systemId)
  }
}

function immutableProperty(value: string): PropertyDescriptor {
  return {
    value,
    enumerable: true,
    writable: false,
    configurable: false,
  }
}

/**
 * Document class
 */
export class Document extends Node implements IDocument {
  constructor() {
    super(NodeType.DOCUMENT_NODE, '#document', null)
    registerConcreteNode(this)

    const documentElement = new Element('html')
    const head = new Element('head')
    const body = new Element('body')
    this.appendChild(documentElement)
    documentElement.appendChild(head)
    documentElement.appendChild(body)
  }

  get head(): IElement | null {
    return this.findDocumentElementChild('head')
  }

  get body(): IElement | null {
    return this.findDocumentElementChild('body', 'frameset')
  }

  get documentElement(): IElement | null {
    for (
      let child = getCanonicalFirstChild<Node>(this) ?? null;
      child;
      child = getCanonicalNextSibling<Node>(child) ?? null
    ) {
      if (getCanonicalNodeType(child) === NodeType.ELEMENT_NODE) {
        return child as unknown as IElement
      }
    }
    return null
  }

  override cloneNode(_deep: boolean = false): never {
    throw new Error('Document.cloneNode() is not supported')
  }

  createTextNode(text: string): IText {
    return new Text(text)
  }

  createElement(tagName: 'template'): IHTMLTemplateElement
  createElement(tagName: string): IElement
  createElement(tagName: string): IElement {
    return createHTMLElement(tagName)
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

  private findDocumentElementChild(
    localName: 'head' | 'body',
    alternateName?: 'frameset'
  ): IElement | null {
    const documentElement = this.documentElement
    if (!documentElement) return null

    for (
      let child = getCanonicalFirstChild<Node>(documentElement) ?? null;
      child;
      child = getCanonicalNextSibling<Node>(child) ?? null
    ) {
      const namespaceURI = getCanonicalElementMetadataField(
        child as unknown as IElement,
        ElementMetadataField.NAMESPACE_URI
      )
      const childLocalName = getCanonicalElementMetadataField(
        child as unknown as IElement,
        ElementMetadataField.LOCAL_NAME
      )
      if (
        namespaceURI === HTML_NAMESPACE &&
        (childLocalName === localName || childLocalName === alternateName)
      ) {
        return child as unknown as IElement
      }
    }
    return null
  }
}
