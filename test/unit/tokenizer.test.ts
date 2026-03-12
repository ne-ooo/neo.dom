/**
 * Tokenizer Tests
 *
 * Tests HTML tokenization - parsing HTML strings into tokens
 */

import { describe, it, expect } from 'vitest'
import { Tokenizer } from '../../src/parser/tokenizer.js'

describe('Tokenizer', () => {
  describe('Basic tag parsing', () => {
    it('should tokenize a simple start tag', () => {
      const tokenizer = new Tokenizer('<div>')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]?.type).toBe('StartTag')
      expect(tokens[0]?.name).toBe('div')
    })

    it('should tokenize a simple end tag', () => {
      const tokenizer = new Tokenizer('</div>')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]?.type).toBe('EndTag')
      expect(tokens[0]?.name).toBe('div')
    })

    it('should tokenize paired tags', () => {
      const tokenizer = new Tokenizer('<p></p>')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(2)
      expect(tokens[0]?.type).toBe('StartTag')
      expect(tokens[0]?.name).toBe('p')
      expect(tokens[1]?.type).toBe('EndTag')
      expect(tokens[1]?.name).toBe('p')
    })

    it('should normalize tag names to lowercase', () => {
      const tokenizer = new Tokenizer('<DIV></DIV>')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.name).toBe('div')
      expect(tokens[1]?.name).toBe('div')
    })

    it('should tokenize self-closing tag', () => {
      const tokenizer = new Tokenizer('<img />')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]?.type).toBe('StartTag')
      expect(tokens[0]?.name).toBe('img')
    })
  })

  describe('Attribute parsing', () => {
    it('should parse attribute with double quotes', () => {
      const tokenizer = new Tokenizer('<div id="test">')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('id')).toBe('test')
    })

    it('should parse attribute with single quotes', () => {
      const tokenizer = new Tokenizer("<div id='test'>")
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('id')).toBe('test')
    })

    it('should parse attribute without quotes', () => {
      const tokenizer = new Tokenizer('<div id=test>')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('id')).toBe('test')
    })

    it('should parse boolean attribute (no value)', () => {
      const tokenizer = new Tokenizer('<input disabled>')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('disabled')).toBe('')
    })

    it('should parse multiple attributes', () => {
      const tokenizer = new Tokenizer('<div id="test" class="foo bar" data-value="123">')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('id')).toBe('test')
      expect(tokens[0]?.attributes?.get('class')).toBe('foo bar')
      expect(tokens[0]?.attributes?.get('data-value')).toBe('123')
    })

    it('should normalize attribute names to lowercase', () => {
      const tokenizer = new Tokenizer('<div ID="test" CLASS="foo">')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('id')).toBe('test')
      expect(tokens[0]?.attributes?.get('class')).toBe('foo')
    })

    it('should handle empty attribute value', () => {
      const tokenizer = new Tokenizer('<div id="">')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('id')).toBe('')
    })

    it('should handle attributes with special characters', () => {
      const tokenizer = new Tokenizer('<a href="https://example.com?foo=bar&baz=qux">')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('href')).toBe('https://example.com?foo=bar&baz=qux')
    })
  })

  describe('Text content parsing', () => {
    it('should parse text content', () => {
      const tokenizer = new Tokenizer('Hello world')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]?.type).toBe('Text')
      expect(tokens[0]?.data).toBe('Hello world')
    })

    it('should parse text with tags', () => {
      const tokenizer = new Tokenizer('<p>Hello</p>')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(3)
      expect(tokens[0]?.type).toBe('StartTag')
      expect(tokens[1]?.type).toBe('Text')
      expect(tokens[1]?.data).toBe('Hello')
      expect(tokens[2]?.type).toBe('EndTag')
    })

    it('should decode HTML entities', () => {
      const tokenizer = new Tokenizer('<p>&lt;Hello&gt;</p>')
      const tokens = tokenizer.tokenize()

      expect(tokens[1]?.data).toBe('<Hello>')
    })

    it('should decode &amp; entity', () => {
      const tokenizer = new Tokenizer('<p>Tom &amp; Jerry</p>')
      const tokens = tokenizer.tokenize()

      expect(tokens[1]?.data).toBe('Tom & Jerry')
    })

    it('should decode &quot; entity', () => {
      const tokenizer = new Tokenizer('<p>&quot;Hello&quot;</p>')
      const tokens = tokenizer.tokenize()

      expect(tokens[1]?.data).toBe('"Hello"')
    })

    it('should decode numeric entities (decimal)', () => {
      const tokenizer = new Tokenizer('<p>&#65;</p>')
      const tokens = tokenizer.tokenize()

      expect(tokens[1]?.data).toBe('A')
    })

    it('should decode numeric entities (hexadecimal)', () => {
      const tokenizer = new Tokenizer('<p>&#x41;</p>')
      const tokens = tokenizer.tokenize()

      expect(tokens[1]?.data).toBe('A')
    })
  })

  describe('Comment parsing', () => {
    it('should parse HTML comment', () => {
      const tokenizer = new Tokenizer('<!-- comment -->')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]?.type).toBe('Comment')
      expect(tokens[0]?.data).toBe(' comment ')
    })

    it('should parse comment with special characters', () => {
      const tokenizer = new Tokenizer('<!-- <div>test</div> -->')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.type).toBe('Comment')
      expect(tokens[0]?.data).toBe(' <div>test</div> ')
    })

    it('should handle unclosed comment', () => {
      const tokenizer = new Tokenizer('<!-- unclosed comment')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.type).toBe('Comment')
      expect(tokens[0]?.data).toBe(' unclosed comment')
    })
  })

  describe('Malformed HTML', () => {
    it('should handle unclosed tag', () => {
      const tokenizer = new Tokenizer('<div')
      const tokens = tokenizer.tokenize()

      // Should parse as start tag without closing '>'
      expect(tokens).toHaveLength(1)
      expect(tokens[0]?.type).toBe('StartTag')
      expect(tokens[0]?.name).toBe('div')
    })

    it('should handle tag with no name', () => {
      const tokenizer = new Tokenizer('<>')
      const tokens = tokenizer.tokenize()

      // Should treat as text
      expect(tokens[0]?.type).toBe('Text')
      expect(tokens[0]?.data).toBe('<')
    })

    it('should handle unclosed attribute quote', () => {
      const tokenizer = new Tokenizer('<div id="test>')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('id')).toBe('test')
    })

    it('should handle whitespace in tag name', () => {
      const tokenizer = new Tokenizer('< div >')
      const tokens = tokenizer.tokenize()

      // First < treated as text, 'div >' treated as text
      expect(tokens[0]?.type).toBe('Text')
    })
  })

  describe('Complex HTML', () => {
    it('should tokenize nested tags', () => {
      const tokenizer = new Tokenizer('<div><p>Hello <strong>world</strong></p></div>')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(8)
      expect(tokens[0]?.name).toBe('div')
      expect(tokens[1]?.name).toBe('p')
      expect(tokens[2]?.data).toBe('Hello ')
      expect(tokens[3]?.name).toBe('strong')
      expect(tokens[4]?.data).toBe('world')
      expect(tokens[5]?.name).toBe('strong')
      expect(tokens[6]?.name).toBe('p')
      expect(tokens[7]?.name).toBe('div')
    })

    it('should tokenize mixed content', () => {
      const tokenizer = new Tokenizer('Text <div>Content</div> More text')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(5)
      expect(tokens[0]?.type).toBe('Text')
      expect(tokens[0]?.data).toBe('Text ')
      expect(tokens[1]?.type).toBe('StartTag')
      expect(tokens[2]?.type).toBe('Text')
      expect(tokens[2]?.data).toBe('Content')
      expect(tokens[3]?.type).toBe('EndTag')
      expect(tokens[4]?.type).toBe('Text')
      expect(tokens[4]?.data).toBe(' More text')
    })

    it('should handle real-world HTML', () => {
      const html = `
        <div class="container">
          <h1>Title</h1>
          <p>Paragraph with <a href="https://example.com">link</a>.</p>
          <img src="image.jpg" alt="Image" />
        </div>
      `
      const tokenizer = new Tokenizer(html)
      const tokens = tokenizer.tokenize()

      // Should have tokens for all tags and text nodes
      expect(tokens.length).toBeGreaterThan(10)

      // Check some specific tokens
      const divToken = tokens.find(t => t.name === 'div')
      expect(divToken?.attributes?.get('class')).toBe('container')

      const aToken = tokens.find(t => t.name === 'a')
      expect(aToken?.attributes?.get('href')).toBe('https://example.com')

      const imgToken = tokens.find(t => t.name === 'img')
      expect(imgToken?.attributes?.get('src')).toBe('image.jpg')
      expect(imgToken?.attributes?.get('alt')).toBe('Image')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const tokenizer = new Tokenizer('')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(0)
    })

    it('should handle whitespace-only content', () => {
      const tokenizer = new Tokenizer('   \n\t   ')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]?.type).toBe('Text')
    })

    it('should handle multiple spaces in attributes', () => {
      const tokenizer = new Tokenizer('<div    id="test"    class="foo"    >')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('id')).toBe('test')
      expect(tokens[0]?.attributes?.get('class')).toBe('foo')
    })

    it('should handle newlines in tags', () => {
      const tokenizer = new Tokenizer('<div\n  id="test"\n  class="foo"\n>')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]?.attributes?.get('id')).toBe('test')
      expect(tokens[0]?.attributes?.get('class')).toBe('foo')
    })
  })
})
