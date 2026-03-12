/**
 * Security Edge Cases Tests
 *
 * Tests for:
 * - Deeply nested HTML
 * - Malformed HTML security
 * - Resource exhaustion resistance
 * - Special character handling
 */

import { describe, it, expect } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { serializeElement } from '../../src/utils/serializer.js'
import { NodeIterator } from '../../src/traversal/iterator.js'
import { NodeFilter } from '../../src/utils/constants.js'

describe('Security Edge Cases', () => {
  const parser = new DOMParser()

  describe('Deeply Nested HTML', () => {
    it('should handle deeply nested divs without stack overflow', () => {
      // Create 100 levels of nesting
      const depth = 100
      let html = ''
      for (let i = 0; i < depth; i++) {
        html += '<div>'
      }
      html += 'Content'
      for (let i = 0; i < depth; i++) {
        html += '</div>'
      }

      const doc = parser.parseFromString(html, 'text/html')
      const root = doc.body.firstChild! as any

      // Should parse successfully
      expect(root.tagName.toLowerCase()).toBe('div')

      // Should be able to traverse
      let currentNode = root
      let count = 0
      while (currentNode.firstChild?.nodeType === 1) {
        currentNode = currentNode.firstChild
        count++
      }

      expect(count).toBe(depth - 1)
    })

    it('should serialize deeply nested structure without stack overflow', () => {
      const depth = 50
      let html = ''
      for (let i = 0; i < depth; i++) {
        html += '<div>'
      }
      html += 'Deep'
      for (let i = 0; i < depth; i++) {
        html += '</div>'
      }

      const doc = parser.parseFromString(html, 'text/html')
      const root = doc.body.firstChild! as any

      // Should serialize without stack overflow
      const serialized = serializeElement(root)
      expect(serialized).toContain('Deep')
      expect(serialized).toContain('<div>')
      expect(serialized).toContain('</div>')
    })

    it('should iterate through deeply nested structure', () => {
      const depth = 50
      let html = ''
      for (let i = 0; i < depth; i++) {
        html += '<div>'
      }
      for (let i = 0; i < depth; i++) {
        html += '</div>'
      }

      const doc = parser.parseFromString(html, 'text/html')
      const root = doc.body.firstChild! as any

      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, null)

      const nodes: any[] = []
      let node
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should have depth number of divs
      expect(nodes.length).toBe(depth)
      expect(nodes.every(n => n.tagName.toLowerCase() === 'div')).toBe(true)
    })
  })

  describe('Malformed HTML Security', () => {
    it('should handle unclosed tags safely', () => {
      const html = '<div><p>Test<span>Unclosed'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // Should auto-close tags
      const serialized = serializeElement(div)
      expect(serialized).toContain('</p>')
      expect(serialized).toContain('</span>')
    })

    it('should handle mismatched tags', () => {
      const html = '<div><p>Test</span></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // Should handle gracefully
      expect(div.tagName.toLowerCase()).toBe('div')

      const serialized = serializeElement(div)
      expect(serialized).toBeTruthy()
    })

    it('should handle tags with invalid names', () => {
      const html = '<div><123>Invalid</123></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // Should parse (browsers are lenient with tag names)
      const serialized = serializeElement(div)
      expect(serialized).toBeTruthy()
    })

    it('should handle empty tag names', () => {
      const html = '<>Empty</>'
      const doc = parser.parseFromString(html, 'text/html')

      // Should handle gracefully without crashing
      expect(doc.body).toBeTruthy()
    })

    it('should handle malformed attributes', () => {
      const html = '<div attr="value attr2=value2"></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // Should parse attributes reasonably
      const serialized = serializeElement(div)
      expect(serialized).toBeTruthy()
    })

    it('should handle attributes without values', () => {
      const html = '<input disabled readonly />'
      const doc = parser.parseFromString(html, 'text/html')
      const input = doc.body.firstChild! as any

      expect(input.getAttribute('disabled')).toBe('')
      expect(input.getAttribute('readonly')).toBe('')

      const serialized = serializeElement(input)
      expect(serialized).toContain('disabled=""')
      expect(serialized).toContain('readonly=""')
    })
  })

  describe('Resource Exhaustion Resistance', () => {
    it('should handle very long text content', () => {
      const longText = 'A'.repeat(10000)
      const html = `<div>${longText}</div>`

      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      expect(div.textContent).toBe(longText)

      const serialized = serializeElement(div)
      expect(serialized.length).toBeGreaterThan(10000)
    })

    it('should handle many attributes', () => {
      let html = '<div '
      for (let i = 0; i < 100; i++) {
        html += `data-${i}="value${i}" `
      }
      html += '></div>'

      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // Should parse all attributes
      expect(div.attributes.length).toBe(100)

      const serialized = serializeElement(div)
      expect(serialized).toContain('data-0="value0"')
      expect(serialized).toContain('data-99="value99"')
    })

    it('should handle many sibling elements', () => {
      let html = '<div>'
      for (let i = 0; i < 1000; i++) {
        html += `<p>Para ${i}</p>`
      }
      html += '</div>'

      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      expect(div.childNodes.length).toBe(1000)

      // Should be able to iterate
      const iterator = new NodeIterator(div, NodeFilter.SHOW_ELEMENT, null)
      const nodes: any[] = []
      let node
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // div + 1000 p elements
      expect(nodes.length).toBe(1001)
    })

    it('should handle very long attribute values', () => {
      const longValue = 'x'.repeat(10000)
      const html = `<div data-long="${longValue}"></div>`

      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const attr = div.getAttribute('data-long')
      expect(attr?.length).toBe(10000)

      const serialized = serializeElement(div)
      expect(serialized).toContain(longValue)
    })
  })

  describe('Special Characters', () => {
    it('should handle null bytes in content', () => {
      const html = '<div>Test\x00Content</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const text = div.textContent
      expect(text).toContain('Test')
      expect(text).toContain('Content')
    })

    it('should handle unicode characters', () => {
      const html = '<div>Hello 世界 🌍 مرحبا</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const text = div.textContent
      expect(text).toBe('Hello 世界 🌍 مرحبا')

      const serialized = serializeElement(div)
      expect(serialized).toContain('世界')
      expect(serialized).toContain('🌍')
      expect(serialized).toContain('مرحبا')
    })

    it('should handle emoji in attributes', () => {
      const html = '<div title="Test 🔥 Emoji"></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const title = div.getAttribute('title')
      expect(title).toBe('Test 🔥 Emoji')

      const serialized = serializeElement(div)
      expect(serialized).toContain('🔥')
    })

    it('should handle right-to-left text', () => {
      const html = '<div dir="rtl">مرحبا بك في العالم</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const text = div.textContent
      expect(text).toBe('مرحبا بك في العالم')

      const serialized = serializeElement(div)
      expect(serialized).toContain('dir="rtl"')
      expect(serialized).toContain('مرحبا')
    })

    it('should handle zero-width characters', () => {
      // Zero-width space, zero-width joiner, etc.
      const html = '<div>Test\u200BContent\u200D</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const text = div.textContent
      expect(text.length).toBeGreaterThan('TestContent'.length)
    })

    it('should handle combining characters', () => {
      // é as e + combining acute accent
      const html = '<div>e\u0301</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const text = div.textContent
      expect(text).toBe('e\u0301')
    })
  })

  describe('Whitespace Handling', () => {
    it('should preserve whitespace in text nodes', () => {
      const html = '<div>  Multiple   spaces  </div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const text = div.textContent
      expect(text).toBe('  Multiple   spaces  ')
    })

    it('should preserve newlines and tabs', () => {
      const html = '<div>Line1\nLine2\tTabbed</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const text = div.textContent
      expect(text).toBe('Line1\nLine2\tTabbed')
    })

    it('should handle whitespace-only text nodes', () => {
      const html = '<div>   </div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      expect(div.childNodes.length).toBe(1)
      expect(div.textContent).toBe('   ')
    })
  })

  describe('CDATA and Processing Instructions', () => {
    it('should handle CDATA-like content as text', () => {
      const html = '<div><![CDATA[Content]]></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // HTML parser doesn't support CDATA, should be text or ignored
      const serialized = serializeElement(div)
      expect(serialized).toBeTruthy()
    })

    it('should handle processing instruction-like content', () => {
      const html = '<div><?xml version="1.0"?></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const serialized = serializeElement(div)
      expect(serialized).toBeTruthy()
    })
  })

  describe('DOCTYPE and Meta Tags', () => {
    it('should handle DOCTYPE declarations without crashing', () => {
      const html = '<!DOCTYPE html><div>Content</div>'
      const doc = parser.parseFromString(html, 'text/html')

      // DOCTYPE handling varies - just ensure parser doesn't crash
      expect(doc.body).toBeTruthy()
      expect(doc.body.childNodes.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle meta charset', () => {
      const html = '<meta charset="UTF-8" /><div>Content</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const body = doc.body

      // Meta should be parsed (might be in head, but simplified parser may put in body)
      expect(body).toBeTruthy()
    })
  })

  describe('Comment Edge Cases', () => {
    it('should handle nested comment-like syntax', () => {
      const html = '<div><!-- Outer <!-- Inner --> Outer --></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const serialized = serializeElement(div)
      expect(serialized).toBeTruthy()
    })

    it('should handle comment with dashes', () => {
      const html = '<div><!-- Comment -- with -- dashes --></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const serialized = serializeElement(div)
      expect(serialized).toContain('<!--')
      expect(serialized).toContain('-->')
    })

    it('should handle empty comments', () => {
      const html = '<div><!----></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      expect(div.childNodes.length).toBe(1)
      expect(div.firstChild?.nodeType).toBe(8) // COMMENT_NODE

      const serialized = serializeElement(div)
      expect(serialized).toBe('<div><!----></div>')
    })
  })

  describe('Round-trip Stability', () => {
    it('should be stable through multiple parse-serialize cycles', () => {
      const html = '<div class="test"><p>Content <strong>bold</strong></p></div>'

      let current = html
      for (let i = 0; i < 5; i++) {
        const doc = parser.parseFromString(current, 'text/html')
        const element = doc.body.firstChild! as any
        current = serializeElement(element)
      }

      // Should stabilize (may not be identical due to auto-corrections)
      const doc1 = parser.parseFromString(current, 'text/html')
      const element1 = doc1.body.firstChild! as any
      const serialized1 = serializeElement(element1)

      const doc2 = parser.parseFromString(serialized1, 'text/html')
      const element2 = doc2.body.firstChild! as any
      const serialized2 = serializeElement(element2)

      expect(serialized2).toBe(serialized1)
    })
  })
})
