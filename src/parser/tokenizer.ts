/**
 * @lpm.dev/neo.dom - HTML Tokenizer
 *
 * Legacy simplified tokenizer retained for direct compatibility and tests.
 * DOMParser uses parse5 and does not use this tokenizer in production.
 */

import type { Token, TokenType } from '../types.js'

/**
 * HTML Tokenizer
 *
 * Parses HTML string into tokens (tags, text, comments)
 */
export class Tokenizer {
  private html: string
  private pos: number
  private length: number

  constructor(html: string) {
    this.html = html
    this.pos = 0
    this.length = html.length
  }

  /**
   * Get next token
   */
  nextToken(): Token {
    // EOF
    if (this.pos >= this.length) {
      return { type: 'EOF' }
    }

    const char = this.html[this.pos]

    // Start of tag
    if (char === '<') {
      return this.readTag()
    }

    // Text content
    return this.readText()
  }

  /**
   * Read all tokens
   */
  tokenize(): Token[] {
    const tokens: Token[] = []
    let token: Token

    while ((token = this.nextToken()).type !== 'EOF') {
      tokens.push(token)
    }

    return tokens
  }

  /**
   * Read a tag (start tag, end tag, or comment)
   */
  private readTag(): Token {
    // Consume '<'
    this.pos++

    // Check for comment (<!--)
    if (this.peek() === '!' && this.peek(1) === '-' && this.peek(2) === '-') {
      return this.readComment()
    }

    // Check for end tag
    const isEndTag = this.peek() === '/'
    if (isEndTag) {
      this.pos++
    }

    // Read tag name
    const tagName = this.readTagName()

    if (!tagName) {
      // Malformed tag, treat as text
      return {
        type: 'Text',
        data: '<',
      }
    }

    if (isEndTag) {
      // Consume closing '>'
      this.skipWhitespace()
      if (this.peek() === '>') {
        this.pos++
      }

      return {
        type: 'EndTag',
        name: tagName.toLowerCase(),
      }
    }

    // Read attributes for start tags
    const attributes = this.readAttributes()

    // Consume closing '>' or '/>'
    this.skipWhitespace()
    const isSelfClosing = this.peek() === '/' && this.peek(1) === '>'
    if (isSelfClosing) {
      this.pos += 2
    } else if (this.peek() === '>') {
      this.pos++
    }

    return {
      type: 'StartTag',
      name: tagName.toLowerCase(),
      attributes,
    }
  }

  /**
   * Read tag name
   */
  private readTagName(): string {
    const start = this.pos

    while (this.pos < this.length) {
      const char = this.html[this.pos]

      if (
        char === ' ' ||
        char === '\t' ||
        char === '\n' ||
        char === '\r' ||
        char === '>' ||
        char === '/'
      ) {
        break
      }

      this.pos++
    }

    return this.html.slice(start, this.pos)
  }

  /**
   * Read attributes
   */
  private readAttributes(): Map<string, string> {
    const attributes = new Map<string, string>()

    while (this.pos < this.length) {
      this.skipWhitespace()

      const char = this.peek()

      // End of tag
      if (char === '>' || char === '/') {
        break
      }

      // Read attribute name
      const name = this.readAttributeName()
      if (!name) {
        break
      }

      this.skipWhitespace()

      // Check for '='
      if (this.peek() === '=') {
        this.pos++ // Consume '='
        this.skipWhitespace()

        // Read attribute value
        const value = this.readAttributeValue()
        attributes.set(name.toLowerCase(), value)
      } else {
        // Boolean attribute (no value)
        attributes.set(name.toLowerCase(), '')
      }
    }

    return attributes
  }

  /**
   * Read attribute name
   */
  private readAttributeName(): string {
    const start = this.pos

    while (this.pos < this.length) {
      const char = this.html[this.pos]

      if (
        char === ' ' ||
        char === '\t' ||
        char === '\n' ||
        char === '\r' ||
        char === '=' ||
        char === '>' ||
        char === '/'
      ) {
        break
      }

      this.pos++
    }

    return this.html.slice(start, this.pos)
  }

  /**
   * Read attribute value (quoted or unquoted)
   */
  private readAttributeValue(): string {
    const quote = this.peek()

    // Quoted value
    if (quote === '"' || quote === "'") {
      this.pos++ // Consume opening quote
      const start = this.pos

      while (this.pos < this.length) {
        const char = this.html[this.pos]

        if (char === quote) {
          const value = this.html.slice(start, this.pos)
          this.pos++ // Consume closing quote
          return this.decodeHTMLEntities(value)
        }

        // Unclosed quote - stop at '>' to handle malformed HTML
        if (char === '>') {
          return this.decodeHTMLEntities(this.html.slice(start, this.pos))
        }

        this.pos++
      }

      // Unclosed quote at EOF, return what we have
      return this.decodeHTMLEntities(this.html.slice(start, this.pos))
    }

    // Unquoted value
    const start = this.pos

    while (this.pos < this.length) {
      const char = this.html[this.pos]

      if (
        char === ' ' ||
        char === '\t' ||
        char === '\n' ||
        char === '\r' ||
        char === '>'
      ) {
        break
      }

      this.pos++
    }

    return this.decodeHTMLEntities(this.html.slice(start, this.pos))
  }

  /**
   * Read text content
   */
  private readText(): Token {
    const start = this.pos

    while (this.pos < this.length && this.html[this.pos] !== '<') {
      this.pos++
    }

    const data = this.html.slice(start, this.pos)

    return {
      type: 'Text',
      data: this.decodeHTMLEntities(data),
    }
  }

  /**
   * Read comment
   */
  private readComment(): Token {
    // Consume '!--'
    this.pos += 3

    const start = this.pos

    // Find closing '-->'
    while (this.pos < this.length) {
      if (
        this.html[this.pos] === '-' &&
        this.html[this.pos + 1] === '-' &&
        this.html[this.pos + 2] === '>'
      ) {
        const data = this.html.slice(start, this.pos)
        this.pos += 3 // Consume '-->'
        return {
          type: 'Comment',
          data,
        }
      }
      this.pos++
    }

    // Unclosed comment
    return {
      type: 'Comment',
      data: this.html.slice(start, this.pos),
    }
  }

  /**
   * Peek ahead n characters
   */
  private peek(n: number = 0): string {
    return this.html[this.pos + n] ?? ''
  }

  /**
   * Skip whitespace
   */
  private skipWhitespace(): void {
    while (this.pos < this.length) {
      const char = this.html[this.pos]

      if (
        char !== ' ' &&
        char !== '\t' &&
        char !== '\n' &&
        char !== '\r'
      ) {
        break
      }

      this.pos++
    }
  }

  /**
   * Decode HTML entities (basic implementation)
   *
   * We only decode the most common entities for security:
   * - &lt; &gt; &amp; &quot; &#39;
   * - Numeric entities (&#...; &#x...;)
   */
  private decodeHTMLEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
  }
}
