/**
 * @lpm.dev/neo.dom - HTML Serializer
 *
 * Serializes DOM nodes back to HTML strings
 * Used for innerHTML property
 */

import type { Node as INode, Element as IElement } from '../types.js'
import { NodeType, VOID_ELEMENTS } from './constants.js'

/**
 * Serialize a node to HTML string
 *
 * @param node - Node to serialize
 * @returns HTML string
 */
export function serializeNode(node: INode): string {
  if (node.nodeType === NodeType.TEXT_NODE) {
    return escapeHTML(node.nodeValue ?? '')
  }

  if (node.nodeType === NodeType.COMMENT_NODE) {
    return `<!--${node.nodeValue ?? ''}-->`
  }

  if (node.nodeType === NodeType.ELEMENT_NODE) {
    return serializeElement(node as IElement)
  }

  if (node.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE) {
    return serializeChildren(node)
  }

  return ''
}

/**
 * Serialize an element to HTML string
 *
 * @param element - Element to serialize
 * @returns HTML string
 */
export function serializeElement(element: IElement): string {
  const tagName = element.tagName.toLowerCase()
  let html = `<${tagName}`

  // Add attributes
  const attrs = Array.from(element.attributes)
  for (const attr of attrs) {
    html += ` ${attr.name}="${escapeAttr(attr.value)}"`
  }

  // Void elements don't have closing tags
  if (VOID_ELEMENTS.has(tagName)) {
    html += ' />'
    return html
  }

  html += '>'

  // Add children
  html += serializeChildren(element)

  html += `</${tagName}>`

  return html
}

/**
 * Serialize children of a node
 *
 * @param node - Parent node
 * @returns HTML string of children
 */
export function serializeChildren(node: INode): string {
  let html = ''

  const children = Array.from(node.childNodes)
  for (const child of children) {
    html += serializeNode(child)
  }

  return html
}

/**
 * Escape HTML special characters in text content
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Escape attribute value
 *
 * @param value - Attribute value to escape
 * @returns Escaped value
 */
export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
