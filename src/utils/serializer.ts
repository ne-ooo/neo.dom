/**
 * @lpm.dev/neo.dom - HTML Serializer
 *
 * Stack-safe serialization for the supported DOM subset.
 */

import type { Node as INode, Element as IElement, Attr } from '../types.js'
import {
  type CanonicalElementSerializationState,
  ElementMetadataField,
  getCanonicalElementMetadataField,
  getTemplateContent,
  populateCanonicalElementSerializationState,
} from '../dom/element-state.js'
import {
  getCanonicalLastChild,
  getCanonicalNodeType,
  getCanonicalParentNode,
  getCanonicalPreviousSibling,
} from '../dom/node-state.js'
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
  const nodeType = getCanonicalNodeType(node)
  const childContainer = nodeType === NodeType.ELEMENT_NODE &&
    getCanonicalElementMetadataField(
      node as IElement,
      ElementMetadataField.LOCAL_NAME
    ) === 'template'
    ? getTemplateContent(node as IElement) ?? node
    : node
  pushChildren(tasks, childContainer)
  return serializeTasks(tasks)
}

function serializeTasks(initialTasks: SerializationTask[]): string {
  const chunks: string[] = []
  const stack = [...initialTasks]
  const elementState: CanonicalElementSerializationState = {
    tagName: '',
    localName: '',
    namespaceURI: '',
    attributes: [],
  }

  while (stack.length > 0) {
    const task = stack.pop()
    if (!task) continue

    if (task.kind === 'markup') {
      chunks.push(task.value)
      continue
    }

    const node = task.node
    const nodeType = getCanonicalNodeType(node)
    if (nodeType === undefined) {
      throw new TypeError('Cannot serialize a non-canonical neo.dom node')
    }

    if (nodeType === NodeType.TEXT_NODE) {
      const value = node.nodeValue ?? ''
      chunks.push(isRawTextNode(node) ? value : escapeHTML(value))
      continue
    }

    if (nodeType === NodeType.COMMENT_NODE) {
      chunks.push(serializeComment(node))
      continue
    }

    if (nodeType === NodeType.DOCUMENT_TYPE_NODE) {
      chunks.push(serializeDocumentType(node))
      continue
    }

    if (nodeType === NodeType.ELEMENT_NODE) {
      const element = node as IElement
      if (!populateCanonicalElementSerializationState(element, elementState)) {
        throw new TypeError('Cannot serialize an element without canonical neo.dom metadata')
      }
      const { namespaceURI, localName } = elementState
      const tagName = namespaceURI === HTML_NAMESPACE
        ? localName
        : localName || elementState.tagName
      const openingTag = serializeOpeningTag(elementState.attributes, tagName)
      chunks.push(openingTag)

      if (namespaceURI === HTML_NAMESPACE && VOID_ELEMENTS.has(tagName)) {
        continue
      }

      stack.push({ kind: 'markup', value: `</${tagName}>` })
      const childContainer = namespaceURI === HTML_NAMESPACE && tagName === 'template'
        ? getTemplateContent(element) ?? node
        : node
      pushChildren(stack, childContainer)
      continue
    }

    if (
      nodeType === NodeType.DOCUMENT_NODE ||
      nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      pushChildren(stack, node)
    }
  }

  return chunks.join('')
}

function pushChildren(stack: SerializationTask[], node: INode): void {
  for (
    let child = getCanonicalLastChild<INode>(node) ?? null;
    child;
    child = getCanonicalPreviousSibling<INode>(child) ?? null
  ) {
    stack.push({ kind: 'node', node: child })
  }
}

function serializeOpeningTag(
  attributes: Iterable<Attr>,
  tagName: string
): string {
  const chunks = [`<${tagName}`]
  for (const attribute of attributes) {
    chunks.push(` ${attribute.name}=\"${escapeAttr(attribute.value)}\"`)
  }
  chunks.push('>')
  return chunks.join('')
}

function serializeDocumentType(node: INode): string {
  const documentType = node as INode & {
    name: string
    publicId: string
    systemId: string
  }

  validateDocumentTypeName(documentType.name)

  if (documentType.publicId) {
    const publicId = quoteDocumentTypeIdentifier(documentType.publicId, 'publicId')
    const systemId = documentType.systemId
      ? ` ${quoteDocumentTypeIdentifier(documentType.systemId, 'systemId')}`
      : ''
    return `<!DOCTYPE ${documentType.name} PUBLIC ${publicId}${systemId}>`
  }
  if (documentType.systemId) {
    const systemId = quoteDocumentTypeIdentifier(documentType.systemId, 'systemId')
    return `<!DOCTYPE ${documentType.name} SYSTEM ${systemId}>`
  }
  return `<!DOCTYPE ${documentType.name}>`
}

function serializeComment(node: INode): string {
  const value = node.nodeValue ?? ''
  if (/^(?:>|->)|--!?>/.test(value)) {
    throw new TypeError('Cannot serialize comment data that contains a closing delimiter')
  }
  return `<!--${value}-->`
}

function quoteDocumentTypeIdentifier(value: string, name: string): string {
  if (/[>\0]/.test(value) || (value.includes('"') && value.includes("'"))) {
    throw new TypeError(`Cannot serialize DocumentType ${name} with a markup delimiter`)
  }
  return value.includes('"') ? `'${value}'` : `"${value}"`
}

function validateDocumentTypeName(value: string): void {
  if (/[\t\n\f\r >\0]/.test(value)) {
    throw new TypeError('Cannot serialize a DocumentType name with a markup delimiter')
  }
}

function isRawTextNode(node: INode): boolean {
  const parent = getCanonicalParentNode<INode>(node)
  if (!parent || getCanonicalNodeType(parent) !== NodeType.ELEMENT_NODE) return false

  const element = parent as IElement
  const namespaceURI = requireCanonicalElementMetadataField(
    element,
    ElementMetadataField.NAMESPACE_URI
  )
  const localName = requireCanonicalElementMetadataField(
    element,
    ElementMetadataField.LOCAL_NAME
  )
  return namespaceURI === HTML_NAMESPACE && RAW_TEXT_ELEMENTS.has(localName)
}

function requireCanonicalElementMetadataField(element: IElement, field: number): string {
  const value = getCanonicalElementMetadataField(element, field)
  if (value === undefined) {
    throw new TypeError('Cannot serialize an element without canonical neo.dom metadata')
  }
  return value
}

/** Escape HTML special characters in text content. */
export function escapeHTML(text: string): string {
  return text.replace(/[&<>\u00a0]/g, character => {
    if (character === '&') return '&amp;'
    if (character === '<') return '&lt;'
    if (character === '\u00a0') return '&nbsp;'
    return '&gt;'
  })
}

/** Escape an HTML attribute value. */
export function escapeAttr(value: string): string {
  return value.replace(/[&\"<>\u00a0]/g, character => {
    if (character === '&') return '&amp;'
    if (character === '"') return '&quot;'
    if (character === '<') return '&lt;'
    if (character === '\u00a0') return '&nbsp;'
    return '&gt;'
  })
}
