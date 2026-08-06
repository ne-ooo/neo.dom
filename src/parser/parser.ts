/**
 * @lpm.dev/neo.dom - DOMParser
 *
 * Main entry point for parsing HTML strings into DOM trees
 */

import type {
  DOMParser as IDOMParser,
  DOMParserOptions,
  Document,
} from '../types.js'
import { parseHTMLDocument } from './parse5-adapter.js'

export const DEFAULT_DOM_PARSER_OPTIONS: Readonly<Required<DOMParserOptions>> = Object.freeze({
  maxInputLength: 10 * 1024 * 1024,
  maxNodes: 100_000,
  maxDepth: 2_048,
  maxAttributesPerElement: 1_024,
})

/**
 * DOMParser
 *
 * Parses HTML strings into Document objects
 */
export class DOMParser implements IDOMParser {
  private readonly options: Required<DOMParserOptions>

  constructor(options: DOMParserOptions = {}) {
    this.options = {
      ...DEFAULT_DOM_PARSER_OPTIONS,
      ...options,
    }

    for (const [name, value] of Object.entries(this.options)) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new RangeError(`DOMParser option ${name} must be a positive safe integer`)
      }
    }
  }

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

    if (html.length > this.options.maxInputLength) {
      throw new RangeError(
        `DOMParser maxInputLength exceeded: input length ${html.length} is greater than limit ${this.options.maxInputLength}`
      )
    }

    return parseHTMLDocument(html, this.options)
  }
}
