import { describe, expect, it } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { HTMLTemplateElement } from '../../src/dom/element.js'
import { NodeFilter, NodeType } from '../../src/utils/constants.js'
import { serializeElement, serializeNode } from '../../src/utils/serializer.js'

describe('HTML5 parser integration', () => {
  const parser = new DOMParser()

  it('creates a real document element, head, body, and doctype', () => {
    const doc = parser.parseFromString(
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><p>x</p></body></html>',
      'text/html'
    )

    expect(doc.firstChild?.nodeType).toBe(NodeType.DOCUMENT_TYPE_NODE)
    expect(doc.documentElement.nodeName).toBe('HTML')
    expect(doc.documentElement.getAttribute('lang')).toBe('en')
    expect(doc.head.nodeName).toBe('HEAD')
    expect(doc.head.firstChild?.nodeName).toBe('TITLE')
    expect(doc.body.nodeName).toBe('BODY')
    expect(doc.body.firstChild?.nodeName).toBe('P')
    expect(serializeNode(doc)).toBe(
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><p>x</p></body></html>'
    )
  })

  it('uses the raw-text tokenizer state for script content', () => {
    const doc = parser.parseFromString(
      '<script>if(a<b)c()</script><p>ok</p>',
      'text/html'
    )
    const script = doc.head.firstChild as any

    expect(script.nodeName).toBe('SCRIPT')
    expect(script.childNodes.length).toBe(1)
    expect(script.textContent).toBe('if(a<b)c()')
    expect(serializeElement(script)).toBe('<script>if(a<b)c()</script>')
    expect(doc.body.firstChild?.nodeName).toBe('P')
  })

  it('applies HTML5 table tree construction', () => {
    const doc = parser.parseFromString(
      '<table><tr><td>cell</td></tr></table>',
      'text/html'
    )
    const table = doc.body.firstChild!

    expect(table.firstChild?.nodeName).toBe('TBODY')
    expect(table.firstChild?.firstChild?.nodeName).toBe('TR')
  })

  it('keeps foster-parented text and elements before the table in source order', () => {
    const doc = parser.parseFromString(
      '<main><table>x<div>y</div>z</table></main>',
      'text/html'
    )

    expect(serializeElement(doc.body?.firstChild as any)).toBe(
      '<main>x<div>y</div>z<table></table></main>'
    )
  })

  it('decodes named and astral numeric character references', () => {
    const doc = parser.parseFromString('<p>&copy; &#x1F600;</p>', 'text/html')
    expect(doc.body.textContent).toBe('© 😀')
  })

  it('preserves foreign-content namespace and casing', () => {
    const doc = parser.parseFromString(
      '<svg viewBox="0 0 1 1"><linearGradient></linearGradient></svg>',
      'text/html'
    )
    const svg = doc.body.firstChild as any
    const gradient = svg.firstChild as any

    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('viewBox')).toBe('0 0 1 1')
    expect(gradient.localName).toBe('linearGradient')
    expect(serializeElement(svg)).toContain('<linearGradient></linearGradient>')
  })

  it('keeps document-level comments outside the body', () => {
    const doc = parser.parseFromString(
      '<!--before--><html><body><p>x</p></body></html><!--after-->',
      'text/html'
    )

    expect(doc.firstChild?.nodeType).toBe(NodeType.COMMENT_NODE)
    expect(doc.lastChild?.nodeType).toBe(NodeType.COMMENT_NODE)
    expect(doc.body.childNodes.length).toBe(1)
  })

  it('stores template descendants in inert content and excludes them from document traversal', () => {
    const doc = parser.parseFromString(
      '<body><template id="fixture"><p>x</p></template><span>tail</span></body>',
      'text/html'
    )
    const template = doc.body.firstChild as HTMLTemplateElement

    expect(template).toBeInstanceOf(HTMLTemplateElement)
    expect(template.firstChild).toBeNull()
    expect(template.content.firstChild?.nodeName).toBe('P')
    expect(template.content.textContent).toBe('x')
    expect(template.textContent).toBe('')
    expect(template.innerHTML).toBe('<p>x</p>')
    expect(serializeElement(template)).toBe('<template id="fixture"><p>x</p></template>')

    const iterator = doc.createNodeIterator(doc.body, NodeFilter.SHOW_ELEMENT)
    const names: string[] = []
    let node
    while ((node = iterator.nextNode())) names.push(node.nodeName)
    expect(names).toEqual(['BODY', 'TEMPLATE', 'SPAN'])

    const clone = template.cloneNode(true) as HTMLTemplateElement
    expect(clone).toBeInstanceOf(HTMLTemplateElement)
    expect(clone.firstChild).toBeNull()
    expect(clone.content.firstChild?.nodeName).toBe('P')
    expect(clone.innerHTML).toBe('<p>x</p>')

    const created = doc.createElement('TEMPLATE') as HTMLTemplateElement
    expect(created).toBeInstanceOf(HTMLTemplateElement)
    created.innerHTML = '<b>text</b>'
    expect(created.firstChild).toBeNull()
    expect(created.content.firstChild?.nodeType).toBe(NodeType.TEXT_NODE)
    expect(created.innerHTML).toBe('&lt;b&gt;text&lt;/b&gt;')

    const ordinaryChild = doc.createElement('span')
    created.appendChild(ordinaryChild)
    const cloneWithBothChildGroups = created.cloneNode(true) as HTMLTemplateElement
    expect(cloneWithBothChildGroups.firstChild?.nodeName).toBe('SPAN')
    expect(cloneWithBothChildGroups.content.firstChild?.nodeType).toBe(NodeType.TEXT_NODE)
  })

  it('uses frameset as the document body without adding a body element', () => {
    const doc = parser.parseFromString(
      '<frameset cols="50%,50%"><frame src="one"><frame src="two"></frameset>',
      'text/html'
    )

    expect(doc.body?.nodeName).toBe('FRAMESET')
    expect(Array.from(doc.documentElement?.childNodes ?? []).map(node => node.nodeName))
      .toEqual(['HEAD', 'FRAMESET'])
    expect(serializeNode(doc)).toBe(
      '<html><head></head><frameset cols="50%,50%"><frame src="one"><frame src="two"></frameset></html>'
    )
  })
})
