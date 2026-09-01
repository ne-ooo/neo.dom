/**
 * Converts parse5's HTML5 tree into neo.dom nodes.
 */

import {
  defaultTreeAdapter,
  Parser,
  Tokenizer,
  type DefaultTreeAdapterTypes,
  type TokenHandler,
  type TokenizerOptions,
  type TreeAdapter,
} from 'parse5'
import { Comment, Document, DocumentFragment, DocumentType, Text } from '../dom/document.js'
import {
  createParsedElement,
  Element,
  HTMLTemplateElement,
  setParsedAttribute,
} from '../dom/element.js'
import type { Node } from '../dom/node.js'
import type { DOMParserOptions } from '../types.js'

type Parse5Document = DefaultTreeAdapterTypes.Document
type Parse5Child = DefaultTreeAdapterTypes.ChildNode
type Parse5Element = DefaultTreeAdapterTypes.Element
type Parse5Template = DefaultTreeAdapterTypes.Template
type ResolvedDOMParserOptions = Required<DOMParserOptions>
type Parse5TreeAdapter = TreeAdapter<DefaultTreeAdapterTypes.DefaultTreeAdapterMap>
interface ConversionState {
  readonly limits: ResolvedDOMParserOptions
  nodeCount: number
}

interface ConversionFrame {
  readonly children: Parse5Child[]
  readonly target: Element | DocumentFragment
  readonly depth: number
  childIndex: number
}

/** Parse a complete HTML document with browser-compatible tree construction. */
export function parseHTMLDocument(
  html: string,
  limits: ResolvedDOMParserOptions
): Document {
  const parser = new Parser<DefaultTreeAdapterTypes.DefaultTreeAdapterMap>({
    scriptingEnabled: false,
    treeAdapter: createLimitingTreeAdapter(limits),
  })
  parser.tokenizer = new AttributeLimitingTokenizer(
    parser.options,
    parser,
    limits.maxAttributesPerElement
  )
  parser.tokenizer.write(html, true)
  return convertDocument(parser.document, limits)
}

/** Stop unique attribute work before parse5's linear duplicate-name lookup grows quadratic. */
class AttributeLimitingTokenizer extends Tokenizer {
  private readonly attributeLimit: number
  private attributeToken: object | null = null
  private readonly attributeNames = new Set<string>()

  constructor(options: TokenizerOptions, handler: TokenHandler, attributeLimit: number) {
    super(options, handler)
    this.attributeLimit = attributeLimit
  }

  protected override _leaveAttrName(): void {
    const token = this.currentToken
    if (token && 'attrs' in token) {
      if (token !== this.attributeToken) {
        this.attributeToken = token
        this.attributeNames.clear()
      }

      const name = this.currentAttr.name
      if (this.attributeNames.has(name)) {
        // parse5 would linearly scan every accepted attribute only to discard
        // this duplicate. The Set has already established the same result.
        return
      }
      if (this.attributeNames.size >= this.attributeLimit) {
        throw new RangeError(
          `DOMParser maxAttributesPerElement exceeded: <${token.tagName}> has more than ${this.attributeLimit} attributes`
        )
      }
      this.attributeNames.add(name)
    }

    super._leaveAttrName()
  }
}

/** Abort parse5 tree construction as soon as a configured limit is crossed. */
function createLimitingTreeAdapter(limits: ResolvedDOMParserOptions): Parse5TreeAdapter {
  let nodeCount = 0
  let openDepth = 0

  const countNode = (): void => {
    nodeCount++
    if (nodeCount > limits.maxNodes) {
      throw new RangeError(
        `DOMParser maxNodes exceeded: parsed node count is greater than limit ${limits.maxNodes}`
      )
    }
  }

  return {
    ...defaultTreeAdapter,
    createDocumentFragment() {
      countNode()
      return defaultTreeAdapter.createDocumentFragment()
    },
    createElement(tagName, namespaceURI, attrs) {
      countNode()
      if (attrs.length > limits.maxAttributesPerElement) {
        throw new RangeError(
          `DOMParser maxAttributesPerElement exceeded: <${tagName}> has ${attrs.length} attributes; limit ${limits.maxAttributesPerElement}`
        )
      }
      return defaultTreeAdapter.createElement(tagName, namespaceURI, attrs)
    },
    createCommentNode(data) {
      countNode()
      return defaultTreeAdapter.createCommentNode(data)
    },
    insertBefore(parentNode, newNode, referenceNode) {
      const referenceIndex = findReferenceIndex(parentNode.childNodes, referenceNode)
      parentNode.childNodes.splice(referenceIndex, 0, newNode)
      newNode.parentNode = parentNode
    },
    adoptAttributes(recipient, attrs) {
      const existingNames = new Set(recipient.attrs.map(attribute => attribute.name))
      let adoptedCount = recipient.attrs.length
      for (const attribute of attrs) {
        if (!existingNames.has(attribute.name)) {
          existingNames.add(attribute.name)
          adoptedCount++
        }
      }
      if (adoptedCount > limits.maxAttributesPerElement) {
        throw new RangeError(
          `DOMParser maxAttributesPerElement exceeded: <${recipient.tagName}> has more than ${limits.maxAttributesPerElement} attributes`
        )
      }
      defaultTreeAdapter.adoptAttributes(recipient, attrs)
    },
    setDocumentType(document, name, publicId, systemId) {
      const hasDocumentType = defaultTreeAdapter
        .getChildNodes(document)
        .some(node => defaultTreeAdapter.isDocumentTypeNode(node))
      if (!hasDocumentType) countNode()
      defaultTreeAdapter.setDocumentType(document, name, publicId, systemId)
    },
    insertText(parentNode, text) {
      const lastChild = parentNode.childNodes[parentNode.childNodes.length - 1]
      if (!lastChild || !defaultTreeAdapter.isTextNode(lastChild)) countNode()
      defaultTreeAdapter.insertText(parentNode, text)
    },
    insertTextBefore(parentNode, text, referenceNode) {
      const referenceIndex = findReferenceIndex(parentNode.childNodes, referenceNode)
      const previousSibling = parentNode.childNodes[referenceIndex - 1]
      if (previousSibling && defaultTreeAdapter.isTextNode(previousSibling)) {
        previousSibling.value += text
        return
      }

      countNode()
      const textNode = defaultTreeAdapter.createTextNode(text)
      parentNode.childNodes.splice(referenceIndex, 0, textNode)
      textNode.parentNode = parentNode
    },
    onItemPush(item) {
      openDepth++
      if (openDepth > limits.maxOpenElements) {
        throw new RangeError(
          `DOMParser maxOpenElements exceeded: open element count ${openDepth} is greater than limit ${limits.maxOpenElements}`
        )
      }
      defaultTreeAdapter.onItemPush?.(item)
    },
    onItemPop(item, newTop) {
      openDepth--
      defaultTreeAdapter.onItemPop?.(item, newTop)
    },
  }
}

/** Avoid a complete sibling scan when foster parenting inserts before the tail. */
function findReferenceIndex<T>(children: T[], reference: T): number {
  const tailIndex = children.length - 1
  return children[tailIndex] === reference ? tailIndex : children.indexOf(reference)
}

function convertDocument(
  source: Parse5Document,
  limits: ResolvedDOMParserOptions
): Document {
  const document = new Document()
  const documentElement = document.documentElement as Element
  const head = document.head as Element
  const body = document.body as Element
  const state: ConversionState = { limits, nodeCount: 0 }

  const sourceDocumentElement = source.childNodes.find(isDocumentElement)
  if (sourceDocumentElement) {
    validateSourceNode(sourceDocumentElement, 1, state)
    copyAttributes(sourceDocumentElement, documentElement)
    populateDocumentElement(sourceDocumentElement, documentElement, head, body, state)
  }

  let passedDocumentElement = false
  let pendingComments = new DocumentFragment()

  const flushComments = (): void => {
    if (!pendingComments.firstChild) return
    if (passedDocumentElement) {
      document.appendChild(pendingComments)
    } else {
      document.insertBefore(pendingComments, documentElement)
    }
    pendingComments = new DocumentFragment()
  }

  for (let index = 0; index < source.childNodes.length; index++) {
    const child = takeChild(source.childNodes, index)
    if (!child) continue

    if (child === sourceDocumentElement) {
      flushComments()
      passedDocumentElement = true
      continue
    }

    const converted = convertSubtree(child, 1, state)
    if (!converted) continue

    if (converted instanceof Comment) {
      pendingComments.appendChild(converted)
      continue
    }

    flushComments()

    if (passedDocumentElement) {
      document.appendChild(converted)
    } else {
      document.insertBefore(converted, documentElement)
    }
  }
  source.childNodes.length = 0
  flushComments()

  return document
}

function populateDocumentElement(
  source: Parse5Element,
  documentElement: Element,
  head: Element,
  body: Element,
  state: ConversionState
): void {
  while (documentElement.firstChild) {
    documentElement.removeChild(documentElement.firstChild)
  }

  let hasHead = false
  let hasBodyOrFrameset = false

  const sourceChildren = source.childNodes
  for (let index = 0; index < sourceChildren.length; index++) {
    const child = takeChild(sourceChildren, index)
    if (!child) continue

    if (isHTMLElement(child, 'head')) {
      validateSourceNode(child, 2, state)
      copyAttributes(child, head)
      appendConvertedChildren(child, head, 2, state)
      documentElement.appendChild(head)
      hasHead = true
      continue
    }

    if (isHTMLElement(child, 'body')) {
      validateSourceNode(child, 2, state)
      copyAttributes(child, body)
      appendConvertedChildren(child, body, 2, state)
      documentElement.appendChild(body)
      hasBodyOrFrameset = true
      continue
    }

    if (isHTMLElement(child, 'frameset')) {
      const frameset = convertSubtree(child, 2, state)
      if (frameset) documentElement.appendChild(frameset)
      hasBodyOrFrameset = true
      continue
    }

    const converted = convertSubtree(child, 2, state)
    if (converted) documentElement.appendChild(converted)
  }
  sourceChildren.length = 0

  if (!hasHead) documentElement.insertBefore(head, documentElement.firstChild)
  if (!hasBodyOrFrameset) documentElement.appendChild(body)
}

/** Convert and release a parse5 subtree with O(depth) auxiliary storage. */
function convertSubtree(
  source: Parse5Child,
  depth: number,
  state: ConversionState
): Node | null {
  const root = convertShallow(source, depth, state)
  if (!(root instanceof Element) || !('tagName' in source)) return root

  const stack: ConversionFrame[] = [
    {
      children: getConvertibleChildren(source),
      target: getConversionTarget(root),
      depth,
      childIndex: 0,
    },
  ]

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    if (!frame) continue

    if (frame.childIndex >= frame.children.length) {
      frame.children.length = 0
      stack.pop()
      continue
    }

    const child = takeChild(frame.children, frame.childIndex)
    frame.childIndex++
    if (!child) continue

    const childDepth = frame.depth + 1
    const converted = convertShallow(child, childDepth, state)
    if (!converted) continue

    frame.target.appendChild(converted)
    if (converted instanceof Element && 'tagName' in child) {
      const children = getConvertibleChildren(child)
      if (children.length > 0) {
        stack.push({
          children,
          target: getConversionTarget(converted),
          depth: childDepth,
          childIndex: 0,
        })
      }
    }
  }

  return root
}

function convertShallow(
  source: Parse5Child,
  depth: number,
  state: ConversionState
): Node | null {
  validateSourceNode(source, depth, state)

  if (source.nodeName === '#text' && 'value' in source) {
    return new Text(source.value)
  }
  if (source.nodeName === '#comment' && 'data' in source) {
    return new Comment(source.data)
  }
  if (source.nodeName === '#documentType' && 'name' in source) {
    return new DocumentType(source.name, source.publicId, source.systemId)
  }
  if (!('tagName' in source)) return null

  const template = source as Parse5Template
  if (source.tagName === 'template' && template.content) {
    countConvertedNode(state)
  }

  const element = createParsedElement(source.tagName, source.namespaceURI)
  copyAttributes(source, element)
  return element
}

function appendConvertedChildren(
  source: Parse5Element,
  target: Element,
  sourceDepth: number,
  state: ConversionState
): void {
  const children = getConvertibleChildren(source)
  for (let index = 0; index < children.length; index++) {
    const child = takeChild(children, index)
    if (!child) continue

    const converted = convertSubtree(child, sourceDepth + 1, state)
    if (converted) target.appendChild(converted)
  }
  children.length = 0
}

function validateSourceNode(
  source: Parse5Child,
  depth: number,
  state: ConversionState
): void {
  countConvertedNode(state)
  if (depth > state.limits.maxDepth) {
    throw new RangeError(
      `DOMParser maxDepth exceeded: parsed depth ${depth} is greater than limit ${state.limits.maxDepth}`
    )
  }
  if ('attrs' in source && source.attrs.length > state.limits.maxAttributesPerElement) {
    throw new RangeError(
      `DOMParser maxAttributesPerElement exceeded: <${source.tagName}> has ${source.attrs.length} attributes; limit ${state.limits.maxAttributesPerElement}`
    )
  }
}

function countConvertedNode(state: ConversionState): void {
  state.nodeCount++
  if (state.nodeCount > state.limits.maxNodes) {
    throw new RangeError(
      `DOMParser maxNodes exceeded: parsed node count is greater than limit ${state.limits.maxNodes}`
    )
  }
}

/** Remove a processed source reference without shifting a wide sibling array. */
function takeChild(children: Parse5Child[], index: number): Parse5Child | null {
  const child = children[index] ?? null
  children[index] = null as unknown as Parse5Child
  return child
}

function getConvertibleChildren(source: Parse5Child): Parse5Child[] {
  if ('tagName' in source) {
    const template = source as Parse5Template
    if (source.tagName === 'template' && template.content) {
      return template.content.childNodes
    }
    return source.childNodes
  }
  return []
}

function getConversionTarget(element: Element): Element | DocumentFragment {
  return element instanceof HTMLTemplateElement ? element.content : element
}

function copyAttributes(source: Parse5Element, target: Element): void {
  for (const attribute of source.attrs) {
    const name = attribute.prefix
      ? `${attribute.prefix}:${attribute.name}`
      : attribute.name
    setParsedAttribute(target, name, attribute.value)
  }
}

function isDocumentElement(child: Parse5Child): child is Parse5Element {
  return isHTMLElement(child, 'html')
}

function isHTMLElement(child: Parse5Child, tagName: string): child is Parse5Element {
  return 'namespaceURI' in child &&
    child.nodeName === tagName &&
    child.namespaceURI === 'http://www.w3.org/1999/xhtml'
}
