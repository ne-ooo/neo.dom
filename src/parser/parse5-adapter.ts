/**
 * Converts parse5's HTML5 tree into neo.dom nodes.
 */

import { parse, type DefaultTreeAdapterTypes } from 'parse5'
import { Comment, Document, DocumentType, Text } from '../dom/document.js'
import { Element } from '../dom/element.js'
import type { Node } from '../dom/node.js'
import type { DOMParserOptions } from '../types.js'

type Parse5Document = DefaultTreeAdapterTypes.Document
type Parse5Child = DefaultTreeAdapterTypes.ChildNode
type Parse5Element = DefaultTreeAdapterTypes.Element
type Parse5Template = DefaultTreeAdapterTypes.Template
type ResolvedDOMParserOptions = Required<DOMParserOptions>

/** Parse a complete HTML document with browser-compatible tree construction. */
export function parseHTMLDocument(
  html: string,
  limits: ResolvedDOMParserOptions
): Document {
  const source = parse(html, { scriptingEnabled: false })
  enforceTreeLimits(source, limits)
  return convertDocument(source)
}

function enforceTreeLimits(source: Parse5Document, limits: ResolvedDOMParserOptions): void {
  let nodeCount = 0
  const stack: Array<{ node: Parse5Child; depth: number }> = []

  for (let index = source.childNodes.length - 1; index >= 0; index--) {
    const child = source.childNodes[index]
    if (child) stack.push({ node: child, depth: 1 })
  }

  while (stack.length > 0) {
    const frame = stack.pop()
    if (!frame) continue

    nodeCount++
    if (nodeCount > limits.maxNodes) {
      throw new RangeError(
        `DOMParser maxNodes exceeded: parsed node count is greater than limit ${limits.maxNodes}`
      )
    }
    if (frame.depth > limits.maxDepth) {
      throw new RangeError(
        `DOMParser maxDepth exceeded: parsed depth ${frame.depth} is greater than limit ${limits.maxDepth}`
      )
    }

    if ('attrs' in frame.node && frame.node.attrs.length > limits.maxAttributesPerElement) {
      throw new RangeError(
        `DOMParser maxAttributesPerElement exceeded: <${frame.node.tagName}> has ${frame.node.attrs.length} attributes; limit ${limits.maxAttributesPerElement}`
      )
    }

    const children = getConvertibleChildren(frame.node)
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index]
      if (child) stack.push({ node: child, depth: frame.depth + 1 })
    }
  }
}

function convertDocument(source: Parse5Document): Document {
  const document = new Document()
  const documentElement = document.documentElement as Element
  const head = document.head as Element
  const body = document.body as Element

  const sourceDocumentElement = source.childNodes.find(isDocumentElement)
  if (sourceDocumentElement) {
    copyAttributes(sourceDocumentElement, documentElement)
    populateDocumentElement(sourceDocumentElement, documentElement, head, body)
  }

  let passedDocumentElement = false
  for (const child of source.childNodes) {
    if (child === sourceDocumentElement) {
      passedDocumentElement = true
      continue
    }

    const converted = convertSubtree(child)
    if (!converted) continue

    if (passedDocumentElement) {
      document.appendChild(converted)
    } else {
      document.insertBefore(converted, documentElement)
    }
  }

  return document
}

function populateDocumentElement(
  source: Parse5Element,
  documentElement: Element,
  head: Element,
  body: Element
): void {
  while (documentElement.firstChild) {
    documentElement.removeChild(documentElement.firstChild)
  }

  let hasHead = false
  let hasBody = false

  for (const child of source.childNodes) {
    if (isHTMLElement(child, 'head')) {
      copyAttributes(child, head)
      appendConvertedChildren(child, head)
      documentElement.appendChild(head)
      hasHead = true
      continue
    }

    if (isHTMLElement(child, 'body')) {
      copyAttributes(child, body)
      appendConvertedChildren(child, body)
      documentElement.appendChild(body)
      hasBody = true
      continue
    }

    const converted = convertSubtree(child)
    if (converted) documentElement.appendChild(converted)
  }

  if (!hasHead) documentElement.insertBefore(head, documentElement.firstChild)
  if (!hasBody) documentElement.appendChild(body)
}

/** Convert a parse5 subtree with explicit frames so nesting cannot exhaust the call stack. */
function convertSubtree(source: Parse5Child): Node | null {
  const root = convertShallow(source)
  if (!(root instanceof Element) || !('tagName' in source)) return root

  const stack: Array<{ source: Parse5Element; target: Element }> = [
    { source, target: root },
  ]

  while (stack.length > 0) {
    const frame = stack.pop()
    if (!frame) continue

    const childFrames: Array<{ source: Parse5Element; target: Element }> = []
    for (const child of getConvertibleChildren(frame.source)) {
      const converted = convertShallow(child)
      if (!converted) continue

      frame.target.appendChild(converted)
      if (converted instanceof Element && 'tagName' in child) {
        childFrames.push({ source: child, target: converted })
      }
    }

    for (let index = childFrames.length - 1; index >= 0; index--) {
      const childFrame = childFrames[index]
      if (childFrame) stack.push(childFrame)
    }
  }

  return root
}

function convertShallow(source: Parse5Child): Node | null {
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

  const element = new Element(source.tagName, source.namespaceURI)
  copyAttributes(source, element)
  return element
}

function appendConvertedChildren(source: Parse5Element, target: Element): void {
  for (const child of getConvertibleChildren(source)) {
    const converted = convertSubtree(child)
    if (converted) target.appendChild(converted)
  }
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

function copyAttributes(source: Parse5Element, target: Element): void {
  for (const attribute of source.attrs) {
    const name = attribute.prefix
      ? `${attribute.prefix}:${attribute.name}`
      : attribute.name
    target.setAttribute(name, attribute.value)
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
