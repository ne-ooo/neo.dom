/**
 * mXSS (Mutation XSS) Resistance Tests
 *
 * Tests that neo.dom doesn't introduce XSS vulnerabilities through:
 * - HTML entity mutations
 * - Backslash escaping tricks
 * - Namespace confusion
 * - Attribute mutation
 * - CSS encoding issues
 */

import { describe, it, expect } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { serializeElement } from '../../src/utils/serializer.js'

describe('mXSS Resistance', () => {
  const parser = new DOMParser()

  describe('HTML Entity Mutation', () => {
    it('should not mutate already-encoded entities in attributes', () => {
      // Attack: &lt;script&gt; should not become <script>
      const html = '<div title="&lt;script&gt;alert()&lt;/script&gt;"></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any

      const serialized = serializeElement(element)

      // Should remain encoded in attribute
      expect(serialized).toContain('&lt;script&gt;')
      expect(serialized).not.toContain('<script>')
    })

    it('should not mutate entities in text content', () => {
      const html = '<div>&lt;img src=x onerror=alert()&gt;</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any

      const serialized = serializeElement(element)

      // Should keep entities escaped in text
      expect(serialized).toContain('&lt;img')
      expect(serialized).toContain('&gt;')
      expect(serialized).not.toContain('<img')
    })

    it('should handle double-encoded entities safely', () => {
      // &amp;lt; should decode to &lt; not <
      const html = '<div>&amp;lt;script&amp;gt;</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any

      const text = element.textContent
      expect(text).toBe('&lt;script&gt;')
      expect(text).not.toContain('<script>')
    })

    it('should handle numeric character references', () => {
      // &#60; is < (less than)
      const html = '<div>&#60;script&#62;alert()&#60;/script&#62;</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any

      const text = element.textContent
      expect(text).toBe('<script>alert()</script>')

      // But when serialized, should be escaped again
      const serialized = serializeElement(element)
      expect(serialized).toContain('&lt;script&gt;')
    })

    it('should handle hex character references', () => {
      // &#x3C; is < (less than)
      const html = '<div>&#x3C;img src=x&#x3E;</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any

      const text = element.textContent
      expect(text).toBe('<img src=x>')

      // Serialized should escape
      const serialized = serializeElement(element)
      expect(serialized).toContain('&lt;img')
    })
  })

  describe('Backslash Escaping Tricks', () => {
    it('should handle backslash in attributes correctly', () => {
      const html = '<div data-value="test\\"></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any

      const attr = element.getAttribute('data-value')
      expect(attr).toBe('test\\')

      const serialized = serializeElement(element)
      expect(serialized).toContain('data-value="test\\"')
    })

    it('should not allow backslash to escape quotes', () => {
      // Attempt: \" should not allow breaking out of attribute
      const html = '<div title="test\\" onclick="alert()"></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.body.firstChild! as any

      // Should have both attributes
      const title = element.getAttribute('title')
      const onclick = element.getAttribute('onclick')

      expect(title).toBe('test\\')
      expect(onclick).toBe('alert()')
    })
  })

  describe('Namespace Confusion', () => {
    it('should handle SVG-like tags as regular HTML', () => {
      // SVG namespace can cause mXSS in some parsers
      const html = '<svg><script>alert()</script></svg>'
      const doc = parser.parseFromString(html, 'text/html')
      const svg = doc.body.firstChild! as any

      expect(svg.tagName.toLowerCase()).toBe('svg')
      expect(svg.firstChild?.tagName?.toLowerCase()).toBe('script')

      // Should serialize correctly
      const serialized = serializeElement(svg)
      expect(serialized).toContain('<svg>')
      expect(serialized).toContain('<script>')
    })

    it('should handle MathML-like tags', () => {
      const html = '<math><mi>x</mi></math>'
      const doc = parser.parseFromString(html, 'text/html')
      const math = doc.body.firstChild! as any

      expect(math.tagName.toLowerCase()).toBe('math')

      const serialized = serializeElement(math)
      expect(serialized).toContain('<math>')
      expect(serialized).toContain('<mi>')
    })
  })

  describe('Attribute Mutation', () => {
    it('should not mutate href attributes', () => {
      const html = '<a href="javascript:alert()">Click</a>'
      const doc = parser.parseFromString(html, 'text/html')
      const anchor = doc.body.firstChild! as any

      const href = anchor.getAttribute('href')
      expect(href).toBe('javascript:alert()')

      const serialized = serializeElement(anchor)
      expect(serialized).toContain('href="javascript:alert()"')
    })

    it('should preserve data URIs in src attributes', () => {
      const html = '<img src="data:text/html,<script>alert()</script>" />'
      const doc = parser.parseFromString(html, 'text/html')
      const img = doc.body.firstChild! as any

      const src = img.getAttribute('src')
      expect(src).toContain('data:text/html')

      const serialized = serializeElement(img)
      expect(serialized).toContain('src="data:text/html')
    })

    it('should handle form action attributes', () => {
      const html = '<form action="javascript:alert()"><input /></form>'
      const doc = parser.parseFromString(html, 'text/html')
      const form = doc.body.firstChild! as any

      const action = form.getAttribute('action')
      expect(action).toBe('javascript:alert()')
    })
  })

  describe('CSS-based mXSS', () => {
    it('should preserve style attribute content', () => {
      const html = '<div style="color: red; background: url(javascript:alert())"></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const style = div.getAttribute('style')
      expect(style).toContain('color: red')
      expect(style).toContain('javascript:alert()')
    })

    it('should handle expression() in CSS', () => {
      // IE-specific attack vector
      const html = '<div style="width: expression(alert())"></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const style = div.getAttribute('style')
      expect(style).toContain('expression(alert())')
    })

    it('should handle CSS escaped characters', () => {
      const html = '<div style="color: \\72 ed"></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const style = div.getAttribute('style')
      // Should preserve CSS escapes as-is
      expect(style).toContain('\\72 ed')
    })
  })

  describe('Tag Mutation', () => {
    it('should not create script tags from text', () => {
      const html = '<div>&lt;script&gt;alert()&lt;/script&gt;</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // Should have only text node, no script element
      expect(div.childNodes.length).toBe(1)
      expect(div.firstChild?.nodeType).toBe(3) // TEXT_NODE

      const serialized = serializeElement(div)
      expect(serialized).toBe('<div>&lt;script&gt;alert()&lt;/script&gt;</div>')
    })

    it('should handle unclosed tags safely', () => {
      const html = '<div><p>Test'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // Auto-close should work
      const serialized = serializeElement(div)
      expect(serialized).toContain('<p>Test</p>')
    })

    it('should handle self-closing script tags', () => {
      // <script /> should still be treated as script
      const html = '<script src="evil.js" />'
      const doc = parser.parseFromString(html, 'text/html')
      const script = doc.body.firstChild! as any

      expect(script?.tagName?.toLowerCase()).toBe('script')
      expect(script?.getAttribute('src')).toBe('evil.js')
    })
  })

  describe('Comment-based mXSS', () => {
    it('should not interpret HTML inside comments', () => {
      const html = '<div><!-- <script>alert()</script> --></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // Should have one comment node, no script
      expect(div.childNodes.length).toBe(1)
      expect(div.firstChild?.nodeType).toBe(8) // COMMENT_NODE

      const serialized = serializeElement(div)
      expect(serialized).toContain('<!-- <script>alert()</script> -->')
    })

    it('should handle malformed comment syntax', () => {
      const html = '<div><!---><script>alert()</script>--></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const serialized = serializeElement(div)
      // Should preserve comment structure
      expect(serialized).toContain('<!--')
    })

    it('should not allow comment breakout', () => {
      const html = '<div><!-- --><script>alert()</script><!-- --></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      // Should have: comment, script, comment
      const children = Array.from(div.childNodes)
      expect(children.length).toBe(3)
      expect(children[0].nodeType).toBe(8) // COMMENT_NODE
      expect((children[1] as any).tagName?.toLowerCase()).toBe('script')
      expect(children[2].nodeType).toBe(8) // COMMENT_NODE
    })
  })

  describe('Mixed Content', () => {
    it('should handle mixed text and entities', () => {
      const html = '<div>Hello &lt;script&gt; World</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const text = div.textContent
      expect(text).toBe('Hello <script> World')

      const serialized = serializeElement(div)
      expect(serialized).toBe('<div>Hello &lt;script&gt; World</div>')
    })

    it('should handle entities adjacent to tags', () => {
      const html = '<div>&lt;b&gt;<b>bold</b>&lt;/b&gt;</div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const serialized = serializeElement(div)
      expect(serialized).toContain('&lt;b&gt;')
      expect(serialized).toContain('<b>bold</b>')
      expect(serialized).toContain('&lt;/b&gt;')
    })
  })

  describe('Quote and Delimiter Confusion', () => {
    it('should handle different quote styles in attributes', () => {
      const html = `<div data-single='test' data-double="test"></div>`
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      expect(div.getAttribute('data-single')).toBe('test')
      expect(div.getAttribute('data-double')).toBe('test')
    })

    it('should handle unquoted attribute values', () => {
      const html = '<div class=test data-id=123></div>'
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      expect(div.getAttribute('class')).toBe('test')
      expect(div.getAttribute('data-id')).toBe('123')
    })

    it('should handle quotes inside attribute values', () => {
      const html = `<div title="It's a &quot;test&quot;"></div>`
      const doc = parser.parseFromString(html, 'text/html')
      const div = doc.body.firstChild! as any

      const title = div.getAttribute('title')
      expect(title).toBe('It\'s a "test"')

      const serialized = serializeElement(div)
      expect(serialized).toContain('&quot;')
    })
  })

  describe('Round-trip Security', () => {
    it('should maintain safety through parse-serialize-parse cycle', () => {
      const dangerous = '<div>&lt;script&gt;alert()&lt;/script&gt;</div>'

      // First parse
      const doc1 = parser.parseFromString(dangerous, 'text/html')
      const div1 = doc1.body.firstChild! as any

      // Serialize
      const serialized1 = serializeElement(div1)

      // Second parse
      const doc2 = parser.parseFromString(serialized1, 'text/html')
      const div2 = doc2.body.firstChild! as any

      // Should still be text, not script element
      expect(div2.childNodes.length).toBe(1)
      expect(div2.firstChild?.nodeType).toBe(3) // TEXT_NODE

      // Third serialize should match second
      const serialized2 = serializeElement(div2)
      expect(serialized2).toBe(serialized1)
    })

    it('should maintain attribute safety through cycles', () => {
      const dangerous = '<a href="javascript:alert()">link</a>'

      const doc1 = parser.parseFromString(dangerous, 'text/html')
      const a1 = doc1.body.firstChild! as any
      const serialized1 = serializeElement(a1)

      const doc2 = parser.parseFromString(serialized1, 'text/html')
      const a2 = doc2.body.firstChild! as any
      const serialized2 = serializeElement(a2)

      // Should remain identical
      expect(serialized2).toBe(serialized1)
      expect(a2.getAttribute('href')).toBe('javascript:alert()')
    })
  })
})
