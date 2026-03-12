/**
 * Parser Tests
 *
 * Tests HTML parsing - full pipeline from HTML string to DOM tree
 */

import { describe, it, expect } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { NodeType } from '../../src/utils/constants.js'

// Helper to get first element child (skipping text nodes)
function getFirstElement(node: any): any {
  for (const child of Array.from(node.childNodes)) {
    if ((child as any).nodeType === NodeType.ELEMENT_NODE) {
      return child
    }
  }
  return null
}

describe('DOMParser', () => {
  describe('Basic parsing', () => {
    it('should parse simple HTML', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<p>Hello</p>', 'text/html')

      expect(doc.body).toBeDefined()
      expect(doc.body.childNodes.length).toBe(1)

      const p = doc.body.firstChild
      expect(p?.nodeName).toBe('P')
      expect(p?.textContent).toBe('Hello')
    })

    it('should parse nested HTML', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<div><p>Hello <strong>world</strong></p></div>', 'text/html')

      const div = doc.body.firstChild
      expect(div?.nodeName).toBe('DIV')

      const p = div?.firstChild
      expect(p?.nodeName).toBe('P')

      const strong = p?.childNodes[1]
      expect(strong?.nodeName).toBe('STRONG')
      expect(strong?.textContent).toBe('world')
    })

    it('should parse self-closing tags', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<img src="test.jpg" /><br />', 'text/html')

      expect(doc.body.childNodes.length).toBe(2)

      const img = doc.body.firstChild
      expect(img?.nodeName).toBe('IMG')

      const br = doc.body.childNodes[1]
      expect(br?.nodeName).toBe('BR')
    })

    it('should parse empty string', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('', 'text/html')

      expect(doc.body.childNodes.length).toBe(0)
    })
  })

  describe('Attribute parsing', () => {
    it('should parse element attributes', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<div id="test" class="foo bar"></div>', 'text/html')

      const div = doc.body.firstChild as any
      expect(div.getAttribute('id')).toBe('test')
      expect(div.getAttribute('class')).toBe('foo bar')
    })

    it('should parse boolean attributes', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<input disabled>', 'text/html')

      const input = doc.body.firstChild as any
      expect(input.getAttribute('disabled')).toBe('')
      expect(input.hasAttribute('disabled')).toBe(true)
    })

    it('should parse attributes with various quote styles', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        '<div a="double" b=\'single\' c=unquoted></div>',
        'text/html'
      )

      const div = doc.body.firstChild as any
      expect(div.getAttribute('a')).toBe('double')
      expect(div.getAttribute('b')).toBe('single')
      expect(div.getAttribute('c')).toBe('unquoted')
    })
  })

  describe('Text content', () => {
    it('should parse text nodes', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('Plain text', 'text/html')

      const textNode = doc.body.firstChild
      expect(textNode?.nodeType).toBe(NodeType.TEXT_NODE)
      expect(textNode?.nodeValue).toBe('Plain text')
    })

    it('should parse mixed text and elements', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('Text <strong>bold</strong> more text', 'text/html')

      expect(doc.body.childNodes.length).toBe(3)
      expect(doc.body.childNodes[0]?.nodeValue).toBe('Text ')
      expect(doc.body.childNodes[1]?.nodeName).toBe('STRONG')
      expect(doc.body.childNodes[2]?.nodeValue).toBe(' more text')
    })

    it('should decode HTML entities', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<p>&lt;Hello&gt; &amp; &quot;World&quot;</p>', 'text/html')

      const p = doc.body.firstChild
      expect(p?.textContent).toBe('<Hello> & "World"')
    })
  })

  describe('Comments', () => {
    it('should parse HTML comments', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<!-- comment -->', 'text/html')

      const comment = doc.body.firstChild
      expect(comment?.nodeType).toBe(NodeType.COMMENT_NODE)
      expect(comment?.nodeValue).toBe(' comment ')
    })

    it('should parse comments with content', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<!-- <div>test</div> -->', 'text/html')

      const comment = doc.body.firstChild
      expect(comment?.nodeValue).toBe(' <div>test</div> ')
    })
  })

  describe('Auto-closing tags', () => {
    it('should auto-close <p> when block element encountered', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<p>Para 1<div>Block</div>', 'text/html')

      // <p> should be auto-closed before <div>
      expect(doc.body.childNodes.length).toBe(2)
      expect(doc.body.childNodes[0]?.nodeName).toBe('P')
      expect(doc.body.childNodes[1]?.nodeName).toBe('DIV')
    })

    it('should auto-close <p> when another <p> encountered', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<p>Para 1<p>Para 2', 'text/html')

      // First <p> should be auto-closed
      expect(doc.body.childNodes.length).toBe(2)
      expect(doc.body.childNodes[0]?.nodeName).toBe('P')
      expect(doc.body.childNodes[0]?.textContent).toBe('Para 1')
      expect(doc.body.childNodes[1]?.nodeName).toBe('P')
      expect(doc.body.childNodes[1]?.textContent).toBe('Para 2')
    })

    it('should auto-close <li> when another <li> encountered', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<ul><li>Item 1<li>Item 2</ul>', 'text/html')

      const ul = doc.body.firstChild
      expect(ul?.childNodes.length).toBe(2)
      expect(ul?.childNodes[0]?.nodeName).toBe('LI')
      expect(ul?.childNodes[1]?.nodeName).toBe('LI')
    })
  })

  describe('Malformed HTML', () => {
    it('should handle unclosed tags', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<div><p>Test', 'text/html')

      // Tags should be auto-closed
      const div = doc.body.firstChild
      expect(div?.nodeName).toBe('DIV')

      const p = div?.firstChild
      expect(p?.nodeName).toBe('P')
      expect(p?.textContent).toBe('Test')
    })

    it('should handle mismatched end tags', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<div><span></div></span>', 'text/html')

      // </div> closes both <span> and <div>
      // </span> is ignored (no matching open tag)
      const div = doc.body.firstChild
      expect(div?.nodeName).toBe('DIV')
    })

    it('should handle end tag with no start tag', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('</div><p>Test</p>', 'text/html')

      // </div> ignored
      expect(doc.body.childNodes.length).toBe(1)
      expect(doc.body.firstChild?.nodeName).toBe('P')
    })
  })

  describe('Real-world HTML', () => {
    it('should parse complex nested structure', () => {
      const html = `
        <div class="container">
          <h1>Title</h1>
          <p>Paragraph with <a href="https://example.com">link</a>.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      const div = getFirstElement(doc.body)
      expect(div.nodeName).toBe('DIV')
      expect(div.getAttribute('class')).toBe('container')

      // Check nested elements exist
      const children = Array.from(div.childNodes).filter((n: any) => n.nodeType === NodeType.ELEMENT_NODE)
      expect(children[0]?.nodeName).toBe('H1')
      expect(children[1]?.nodeName).toBe('P')
      expect(children[2]?.nodeName).toBe('UL')
    })

    it('should handle table structure', () => {
      const html = `
        <table>
          <thead>
            <tr><th>Header</th></tr>
          </thead>
          <tbody>
            <tr><td>Cell</td></tr>
          </tbody>
        </table>
      `
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      const table = getFirstElement(doc.body)
      expect(table.nodeName).toBe('TABLE')

      // Check table structure
      const children = Array.from(table.childNodes).filter((n: any) => n.nodeType === NodeType.ELEMENT_NODE)
      expect(children[0]?.nodeName).toBe('THEAD')
      expect(children[1]?.nodeName).toBe('TBODY')
    })

    it('should handle form elements', () => {
      const html = `
        <form action="/submit" method="post">
          <input type="text" name="username" required />
          <input type="password" name="password" />
          <button type="submit">Submit</button>
        </form>
      `
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      const form = getFirstElement(doc.body)
      expect(form.nodeName).toBe('FORM')
      expect(form.getAttribute('action')).toBe('/submit')
      expect(form.getAttribute('method')).toBe('post')
    })
  })

  describe('DOM manipulation', () => {
    it('should allow querying parsed DOM', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<div><p id="test">Hello</p></div>', 'text/html')

      const div = doc.body.firstChild
      const p = div?.firstChild as any
      expect(p.getAttribute('id')).toBe('test')
      expect(p.textContent).toBe('Hello')
    })

    it('should allow modifying attributes', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<div id="old"></div>', 'text/html')

      const div = doc.body.firstChild as any
      div.setAttribute('id', 'new')
      div.setAttribute('class', 'test')

      expect(div.getAttribute('id')).toBe('new')
      expect(div.getAttribute('class')).toBe('test')
    })

    it('should allow modifying DOM structure', () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString('<div><p>Old</p></div>', 'text/html')

      const div = doc.body.firstChild as any
      const newP = doc.createElement('p')
      newP.textContent = 'New'

      div.appendChild(newP)

      expect(div.childNodes.length).toBe(2)
      expect(div.childNodes[1]?.textContent).toBe('New')
    })
  })

  describe('Error handling', () => {
    it('should throw error for unsupported MIME type', () => {
      const parser = new DOMParser()

      expect(() => {
        parser.parseFromString('<div></div>', 'application/xml' as any)
      }).toThrow('Only text/html MIME type is supported')
    })
  })
})
