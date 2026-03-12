/**
 * @lpm.dev/neo.dom - DOMParser
 *
 * Main entry point for parsing HTML strings into DOM trees
 */

import type { DOMParser as IDOMParser, Document } from '../types.js'
import { Tokenizer } from './tokenizer.js'
import { TreeBuilder } from './tree-builder.js'

/**
 * DOMParser
 *
 * Parses HTML strings into Document objects
 */
export class DOMParser implements IDOMParser {
  /**
   * Parse HTML string to Document
   *
   * @param html - HTML string to parse
   * @param mimeType - MIME type (only 'text/html' supported)
   * @returns Document object
   *
   * @example
   * const parser = new DOMParser()
   * const doc = parser.parseFromString('<p>Hello</p>', 'text/html')
   * console.log(doc.body.innerHTML) // '<p>Hello</p>'
   */
  parseFromString(html: string, mimeType: 'text/html'): Document {
    if (mimeType !== 'text/html') {
      throw new Error('Only text/html MIME type is supported')
    }

    // Tokenize HTML
    const tokenizer = new Tokenizer(html)
    const tokens = tokenizer.tokenize()

    // Build DOM tree
    const treeBuilder = new TreeBuilder()
    const document = treeBuilder.build(tokens)

    return document
  }
}
