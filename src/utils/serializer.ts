/**
 * @lpm.dev/neo.dom - HTML Serializer
 *
 * Stack-safe serialization for the supported DOM subset.
 */

import type { Node as INode, Element as IElement, Attr } from '../types.js'
import { getStoredAttributes } from '../dom/element-state.js'
import { HTML_NAMESPACE, NodeType, VOID_ELEMENTS } from './constants.js'

const RAW_TEXT_ELEMENTS = new Set([
  'script',
  'style',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'plaintext',
])

type SerializationTask =
  | { kind: 'node'; node: INode }
  | { kind: 'markup'; value: string }

/** Serialize one node without using the JavaScript call stack for descendants. */
export function serializeNode(node: INode): string {
  return serializeTasks([{ kind: 'node', node }])
}

/** Serialize an element and its descendants. */
export function serializeElement(element: IElement): string {
  return serializeNode(element)
}

/** Serialize the direct children of a node. */
export function serializeChildren(node: INode): string {
  const tasks: SerializationTask[] = []
  pushChildren(tasks, node)
  return serializeTasks(tasks)
}

function serializeTasks(initialTasks: SerializationTask[]): string {
  const chunks: string[] = []
  const stack = [...initialTasks]

  while (stack.length > 0) {
    const task = stack.pop()
    if (!task) continue

    if (task.kind === 'markup') {
      chunks.push(task.value)
      continue
    }

    const node = task.node
    if (node.nodeType === NodeType.TEXT_NODE) {
      const value = node.nodeValue ?? ''
      chunks.push(isRawTextNode(node) ? value : escapeHTML(value))
      continue
    }

    if (node.nodeType === NodeType.COMMENT_NODE) {
      chunks.push(`<!--${node.nodeValue ?? ''}-->`)
      continue
    }

    if (node.nodeType === NodeType.DOCUMENT_TYPE_NODE) {
      chunks.push(serializeDocumentType(node))
      continue
    }

    if (node.nodeType === NodeType.ELEMENT_NODE) {
      const element = node as IElement
      const tagName = element.namespaceURI === HTML_NAMESPACE
        ? element.localName
        : element.localName || element.tagName
      const openingTag = serializeOpeningTag(element, tagName)
      chunks.push(openingTag)

      if (element.namespaceURI === HTML_NAMESPACE && VOID_ELEMENTS.has(tagName)) {
        continue
      }

      stack.push({ kind: 'markup', value: `</${tagName}>` })
      pushChildren(stack, node)
      continue
    }

    if (
      node.nodeType === NodeType.DOCUMENT_NODE ||
      node.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      pushChildren(stack, node)
    }
  }

  return chunks.join('')
}

function pushChildren(stack: SerializationTask[], node: INode): void {
  for (let child = node.lastChild; child; child = child.previousSibling) {
    stack.push({ kind: 'node', node: child })
  }
}

function serializeOpeningTag(element: IElement, tagName: string): string {
  const chunks = [`<${tagName}`]
  for (const attribute of getAttributesForSerialization(element)) {
    chunks.push(` ${attribute.name}=\"${escapeAttr(attribute.value)}\"`)
  }
  chunks.push(
    element.namespaceURI === HTML_NAMESPACE && VOID_ELEMENTS.has(tagName)
      ? ' />'
      : '>'
  )
  return chunks.join('')
}

function getAttributesForSerialization(element: IElement): Iterable<Attr> {
  return getStoredAttributes(element) ?? element.attributes
}

function serializeDocumentType(node: INode): string {
  const documentType = node as INode & {
    name: string
    publicId: string
    systemId: string
  }

  if (documentType.publicId) {
    const systemId = documentType.systemId ? ` \"${documentType.systemId}\"` : ''
    return `<!DOCTYPE ${documentType.name} PUBLIC \"${documentType.publicId}\"${systemId}>`
  }
  if (documentType.systemId) {
    return `<!DOCTYPE ${documentType.name} SYSTEM \"${documentType.systemId}\">`
  }
  return `<!DOCTYPE ${documentType.name}>`
}

function isRawTextNode(node: INode): boolean {
  const parent = node.parentNode
  if (!parent || parent.nodeType !== NodeType.ELEMENT_NODE) return false

  const element = parent as IElement
  return element.namespaceURI === HTML_NAMESPACE && RAW_TEXT_ELEMENTS.has(element.localName)
}

/** Escape HTML special characters in text content. */
export function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Escape an HTML attribute value. */
export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/\"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
