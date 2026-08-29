/**
 * @lpm.dev/neo.dom - Tree Builder
 *
 * Builds DOM tree from tokens
 * Implements simplified HTML parsing with auto-correction
 */

import type { Token } from '../types.js'
import { Document, Text, Comment } from '../dom/document.js'
import { Element } from '../dom/element.js'
import { Node } from '../dom/node.js'
import { VOID_ELEMENTS, AUTO_CLOSE_TAGS } from '../utils/constants.js'

/**
 * TreeBuilder
 *
 * Converts a stream of tokens into a DOM tree
 */
export class TreeBuilder {
  private document: Document
  private openElements: Element[] = []

  constructor() {
    this.document = new Document()
  }

  /**
   * Build DOM tree from tokens
   */
  build(tokens: Token[]): Document {
    for (const token of tokens) {
      this.processToken(token)
    }

    // Close any remaining open elements
    while (this.openElements.length > 0) {
      this.openElements.pop()
    }

    return this.document
  }

  /**
   * Process a single token
   */
  private processToken(token: Token): void {
    switch (token.type) {
      case 'StartTag':
        this.handleStartTag(token)
        break

      case 'EndTag':
        this.handleEndTag(token)
        break

      case 'Text':
        this.handleText(token)
        break

      case 'Comment':
        this.handleComment(token)
        break
    }
  }

  /**
   * Handle start tag token
   */
  private handleStartTag(token: Token): void {
    const tagName = token.name!

    // Auto-close tags if needed
    this.autoCloseTags(tagName)

    // Create element
    const element = new Element(tagName)

    // Add attributes
    if (token.attributes) {
      for (const [name, value] of token.attributes) {
        element.setAttribute(name, value)
      }
    }

    // Append to current parent
    this.currentParent.appendChild(element)

    // Add to open elements stack (unless it's a void element)
    if (!VOID_ELEMENTS.has(tagName)) {
      this.openElements.push(element)
    }
  }

  /**
   * Handle end tag token
   */
  private handleEndTag(token: Token): void {
    const tagName = token.name!

    // Find matching start tag in open elements
    for (let i = this.openElements.length - 1; i >= 0; i--) {
      const element = this.openElements[i]!

      if (element.tagName.toLowerCase() === tagName) {
        // Close this element and all elements above it
        this.openElements.splice(i)
        return
      }
    }

    // No matching start tag found - ignore end tag
  }

  /**
   * Handle text token
   */
  private handleText(token: Token): void {
    const text = new Text(token.data ?? '')
    this.currentParent.appendChild(text)
  }

  /**
   * Handle comment token
   */
  private handleComment(token: Token): void {
    const comment = new Comment(token.data ?? '')
    this.currentParent.appendChild(comment)
  }

  /**
   * Auto-close tags based on HTML rules
   *
   * Some tags auto-close when certain other tags are encountered
   * Example: <p> auto-closes when another <p> or block element is encountered
   */
  private autoCloseTags(tagName: string): void {
    if (this.openElements.length === 0) {
      return
    }

    const currentElement = this.openElements[this.openElements.length - 1]!
    const currentTag = currentElement.tagName.toLowerCase()

    // Check if current tag should auto-close
    const autoCloseTags = AUTO_CLOSE_TAGS[currentTag]
    if (autoCloseTags && autoCloseTags.includes(tagName)) {
      this.openElements.pop()

      // Recursively check parent
      this.autoCloseTags(tagName)
    }
  }

  /**
   * Get current parent element
   */
  private get currentParent(): Node {
    if (this.openElements.length > 0) {
      return this.openElements[this.openElements.length - 1]!
    }

    // Default to body (Element extends Node)
    return this.document.body! as unknown as Node
  }
}
