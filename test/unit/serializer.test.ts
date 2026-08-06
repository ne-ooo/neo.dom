/**
 * Tests for HTML Serializer
 */

import { describe, it, expect } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { serializeNode, serializeElement, serializeChildren, escapeHTML, escapeAttr } from '../../src/utils/serializer.js'
import { NodeType } from '../../src/utils/constants.js'

describe('HTML Serializer', () => {
  const parser = new DOMParser()

  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHTML('<div>')).toBe('&lt;div&gt;')
      expect(escapeHTML('&')).toBe('&amp;')
      expect(escapeHTML('<>&')).toBe('&lt;&gt;&amp;')
    })

    it('should handle text without special characters', () => {
      expect(escapeHTML('hello world')).toBe('hello world')
      expect(escapeHTML('123')).toBe('123')
    })
  })

  describe('escapeAttr', () => {
    it('should escape attribute special characters', () => {
      expect(escapeAttr('"quoted"')).toBe('&quot;quoted&quot;')
      expect(escapeAttr('&')).toBe('&amp;')
      expect(escapeAttr('<>')).toBe('&lt;&gt;')
    })

    it('should handle attributes without special characters', () => {
      expect(escapeAttr('value')).toBe('value')
      expect(escapeAttr('test-123')).toBe('test-123')
    })
  })

  describe('serializeNode - Text nodes', () => {
    it('should serialize text nodes', () => {
      const doc = parser.parseFromString('Hello World', 'text/html')
      const textNode = doc.body.firstChild!
      expect(serializeNode(textNode)).toBe('Hello World')
    })

    it('should escape HTML in text nodes', () => {
      const doc = parser.parseFromString('<div>&lt;script&gt;</div>', 'text/html')
      const element = doc.body.firstChild! as any
      const textNode = element.firstChild!
      expect(serializeNode(textNode)).toBe('&lt;script&gt;')
    })
  })

  describe('serializeNode - Comment nodes', () => {
    it('should serialize comment nodes', () => {
      const doc = parser.parseFromString('<!-- comment -->', 'text/html')
      const comment = doc.firstChild!
      expect(serializeNode(comment)).toBe('<!-- comment -->')
    })

    it('should serialize empty comments', () => {
      const doc = parser.parseFromString('<!---->', 'text/html')
      const comment = doc.firstChild!
      expect(serializeNode(comment)).toBe('<!---->')
    })
  })

  describe('serializeElement - Basic elements', () => {
    it('should serialize simple elements', () => {
      const doc = parser.parseFromString('<div></div>', 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe('<div></div>')
    })

    it('should serialize elements with text content', () => {
      const doc = parser.parseFromString('<p>Hello</p>', 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe('<p>Hello</p>')
    })

    it('should serialize nested elements', () => {
      const doc = parser.parseFromString('<div><p>Hello</p></div>', 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe('<div><p>Hello</p></div>')
    })
  })

  describe('serializeElement - Void elements', () => {
    it('should serialize void elements (img)', () => {
      const doc = parser.parseFromString('<img src="test.jpg" />', 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe('<img src="test.jpg" />')
    })

    it('should serialize void elements (br)', () => {
      const doc = parser.parseFromString('<br />', 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe('<br />')
    })

    it('should serialize void elements (input)', () => {
      const doc = parser.parseFromString('<input type="text" />', 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe('<input type="text" />')
    })
  })

  describe('serializeElement - Attributes', () => {
    it('should serialize single attribute', () => {
      const doc = parser.parseFromString('<div id="test"></div>', 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe('<div id="test"></div>')
    })

    it('should serialize multiple attributes', () => {
      const doc = parser.parseFromString('<div id="test" class="foo bar"></div>', 'text/html')
      const element = doc.body.firstChild! as any
      const result = serializeElement(element)
      expect(result).toContain('id="test"')
      expect(result).toContain('class="foo bar"')
    })

    it('should escape attribute values', () => {
      const doc = parser.parseFromString('<div title="&quot;quoted&quot;"></div>', 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toContain('title="&quot;quoted&quot;"')
    })

    it('should serialize boolean attributes', () => {
      const doc = parser.parseFromString('<input disabled />', 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toContain('disabled=""')
    })
  })

  describe('serializeChildren', () => {
    it('should serialize multiple text children', () => {
      const doc = parser.parseFromString('<div>Hello World</div>', 'text/html')
      const element = doc.body.firstChild!
      const result = serializeChildren(element)
      expect(result).toBe('Hello World')
    })

    it('should serialize multiple element children', () => {
      const doc = parser.parseFromString('<div><p>A</p><p>B</p></div>', 'text/html')
      const element = doc.body.firstChild!
      const result = serializeChildren(element)
      expect(result).toBe('<p>A</p><p>B</p>')
    })

    it('should serialize mixed children (elements, text, comments)', () => {
      const doc = parser.parseFromString('<div>Text<p>Para</p><!-- comment --></div>', 'text/html')
      const element = doc.body.firstChild!
      const result = serializeChildren(element)
      expect(result).toBe('Text<p>Para</p><!-- comment -->')
    })

    it('should handle empty children', () => {
      const doc = parser.parseFromString('<div></div>', 'text/html')
      const element = doc.body.firstChild!
      const result = serializeChildren(element)
      expect(result).toBe('')
    })
  })

  describe('Element.innerHTML getter', () => {
    it('should get innerHTML for simple element', () => {
      const doc = parser.parseFromString('<div><p>Hello</p></div>', 'text/html')
      const element = doc.body.firstChild! as any
      expect(element.innerHTML).toBe('<p>Hello</p>')
    })

    it('should get innerHTML for nested elements', () => {
      const doc = parser.parseFromString('<div><ul><li>A</li><li>B</li></ul></div>', 'text/html')
      const element = doc.body.firstChild! as any
      expect(element.innerHTML).toBe('<ul><li>A</li><li>B</li></ul>')
    })

    it('should get innerHTML for element with mixed content', () => {
      const doc = parser.parseFromString('<div>Text<span>Span</span>More</div>', 'text/html')
      const element = doc.body.firstChild! as any
      expect(element.innerHTML).toBe('Text<span>Span</span>More')
    })

    it('should return empty string for empty element', () => {
      const doc = parser.parseFromString('<div></div>', 'text/html')
      const element = doc.body.firstChild! as any
      expect(element.innerHTML).toBe('')
    })
  })

  describe('Complex serialization', () => {
    it('should serialize deeply nested structure', () => {
      const html = '<div><section><article><h1>Title</h1><p>Content</p></article></section></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe(html)
    })

    it('should serialize mixed void and regular elements', () => {
      const html = '<div><p>Text</p><img src="test.jpg" /><br /><span>More</span></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe(html)
    })

    it('should serialize with HTML entities preserved', () => {
      const html = '<div>&lt;script&gt;alert()&lt;/script&gt;</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any
      expect(serializeElement(element)).toBe(html)
    })

    it('should handle special characters in attributes and text', () => {
      const doc = parser.parseFromString('<div title="&quot;test&quot;">&amp;&lt;&gt;</div>', 'text/html')
      const element = doc.body.firstChild! as any
      const result = serializeElement(element)
      expect(result).toContain('title="&quot;test&quot;"')
      expect(result).toContain('&amp;&lt;&gt;')
    })
  })

  describe('Round-trip parsing and serialization', () => {
    it('should maintain structure through parse → serialize → parse', () => {
      const original = '<div id="test"><p class="para">Hello <strong>World</strong></p></div>'
      const doc1 = parser.parseFromString(original, 'text/html')
      const element1 = doc1.body.firstChild! as any
      const serialized = serializeElement(element1)

      const doc2 = parser.parseFromString(serialized, 'text/html')
      const element2 = doc2.body.firstChild! as any

      expect(serializeElement(element2)).toBe(serialized)
    })

    it('should preserve void elements through round-trip', () => {
      const original = '<div><img src="test.jpg" /><br /><input type="text" /></div>'
      const doc1 = parser.parseFromString(original, 'text/html')
      const element1 = doc1.body.firstChild! as any
      const serialized = serializeElement(element1)

      const doc2 = parser.parseFromString(serialized, 'text/html')
      const element2 = doc2.body.firstChild! as any

      expect(serializeElement(element2)).toBe(serialized)
    })
  })
})
