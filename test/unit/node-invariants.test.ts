import { describe, expect, it } from 'vitest'
import {
  Comment,
  Document,
  DocumentFragment,
  DocumentType,
  Element,
  NodeType,
  Text,
} from '../../src/index.js'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

describe('tree mutation invariants', () => {
  it('rejects self and ancestor insertion without changing either tree', () => {
    const parent = new Element('div')
    const child = new Element('span')
    parent.appendChild(child)

    expect(() => parent.appendChild(parent)).toThrow('HierarchyRequestError')
    expect(() => child.appendChild(parent)).toThrow('HierarchyRequestError')
    expect(parent.firstChild).toBe(child)
    expect(parent.parentNode).toBeNull()
    expect(child.parentNode).toBe(parent)
  })

  it('reorders existing children relative to the final child sequence', () => {
    const parent = new Element('div')
    const a = new Element('a')
    const b = new Element('b')
    const c = new Element('c')
    parent.appendChild(a)
    parent.appendChild(b)
    parent.appendChild(c)

    parent.insertBefore(a, c)
    expect(Array.from(parent.childNodes)).toEqual([b, a, c])

    parent.insertBefore(c, b)
    expect(Array.from(parent.childNodes)).toEqual([c, b, a])
  })

  it('replaces a child with an existing sibling without losing nodes', () => {
    const parent = new Element('div')
    const a = new Element('a')
    const b = new Element('b')
    const c = new Element('c')
    parent.appendChild(a)
    parent.appendChild(b)
    parent.appendChild(c)

    expect(parent.replaceChild(a, c)).toBe(c)
    expect(Array.from(parent.childNodes)).toEqual([b, a])
    expect(a.parentNode).toBe(parent)
    expect(b.parentNode).toBe(parent)
    expect(c.parentNode).toBeNull()
  })

  it('treats self insert and self replace as no-ops', () => {
    const parent = new Element('div')
    const child = new Element('span')
    parent.appendChild(child)

    expect(parent.insertBefore(child, child)).toBe(child)
    expect(parent.replaceChild(child, child)).toBe(child)
    expect(Array.from(parent.childNodes)).toEqual([child])
    expect(child.parentNode).toBe(parent)
  })

  it('splices fragment children in order and empties the fragment', () => {
    const parent = new Element('div')
    const reference = new Element('footer')
    const fragment = new DocumentFragment()
    const first = new Element('p')
    const second = new Text('tail')
    parent.appendChild(reference)
    fragment.appendChild(first)
    fragment.appendChild(second)

    expect(parent.insertBefore(fragment, reference)).toBe(fragment)
    expect(Array.from(parent.childNodes)).toEqual([first, second, reference])
    expect(fragment.childNodes.length).toBe(0)
    expect(first.parentNode).toBe(parent)
    expect(second.parentNode).toBe(parent)
  })

  it('validates document structure before moving fragment children', () => {
    const document = new Document()
    const fragment = new DocumentFragment()
    const extraElement = new Element('main')
    fragment.appendChild(extraElement)

    expect(() => document.appendChild(fragment)).toThrow('only one document element')
    expect(fragment.firstChild).toBe(extraElement)
    expect(extraElement.parentNode).toBe(fragment)
    expect(document.documentElement.parentNode).toBe(document)
  })

  it('rejects invalid child types and invalid document ordering', () => {
    const text = new Text('text')
    expect(() => text.appendChild(new Element('b'))).toThrow('HierarchyRequestError')
    expect(() => new Comment('note').appendChild(new Text('bad'))).toThrow('HierarchyRequestError')
    expect(() => new DocumentType('html').appendChild(new Comment('bad'))).toThrow('HierarchyRequestError')
    expect(() => new Element('div').appendChild(new DocumentType('html'))).toThrow('HierarchyRequestError')

    const document = new Document()
    expect(() => document.appendChild(new Text('bad'))).toThrow('HierarchyRequestError')
    expect(() => document.appendChild(new DocumentType('html'))).toThrow('must precede')
    expect(document.childNodes.length).toBe(1)
  })
})

describe('core DOM semantics', () => {
  it('clears former parent links and keeps cached NodeList objects live', () => {
    const parent = new Element('div')
    const first = new Element('a')
    const second = new Element('b')
    parent.appendChild(first)
    parent.appendChild(second)
    const children = parent.childNodes

    parent.textContent = 'replacement'

    expect(children.length).toBe(1)
    expect(children[0]).toBe(parent.firstChild)
    expect(children[0]).toBeInstanceOf(Text)
    expect(children[0]?.nodeType).toBe(NodeType.TEXT_NODE)
    expect(first.parentNode).toBeNull()
    expect(second.parentNode).toBeNull()
  })

  it('updates Text and Comment data through textContent', () => {
    const text = new Text('old')
    const comment = new Comment('old note')

    text.textContent = 'new'
    comment.textContent = 'new note'

    expect(text.data).toBe('new')
    expect(text.nodeValue).toBe('new')
    expect(comment.data).toBe('new note')
    expect(comment.nodeValue).toBe('new note')
  })

  it('preserves concrete types, attributes, and namespaces when cloning', () => {
    const svg = new Element('svg', SVG_NAMESPACE)
    const gradient = new Element('linearGradient', SVG_NAMESPACE)
    const text = new Text('color')
    const comment = new Comment('note')
    svg.setAttribute('viewBox', '0 0 10 10')
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse')
    gradient.appendChild(text)
    svg.appendChild(gradient)
    svg.appendChild(comment)

    const clone = svg.cloneNode(true)
    expect(clone).toBeInstanceOf(Element)
    expect((clone as Element).namespaceURI).toBe(SVG_NAMESPACE)
    expect((clone as Element).getAttribute('viewBox')).toBe('0 0 10 10')
    expect(clone.firstChild).toBeInstanceOf(Element)
    expect((clone.firstChild as Element).localName).toBe('linearGradient')
    expect((clone.firstChild as Element).getAttribute('gradientUnits')).toBe('userSpaceOnUse')
    expect(clone.firstChild?.firstChild).toBeInstanceOf(Text)
    expect(clone.lastChild).toBeInstanceOf(Comment)
  })

  it('clones fragments and doctypes but rejects unsupported document cloning', () => {
    const fragment = new DocumentFragment()
    fragment.appendChild(new Element('p'))
    const doctype = new DocumentType('html', 'public', 'system')

    expect(fragment.cloneNode(true)).toBeInstanceOf(DocumentFragment)
    const doctypeClone = doctype.cloneNode() as DocumentType
    expect(doctypeClone).toBeInstanceOf(DocumentType)
    expect(doctypeClone.publicId).toBe('public')
    expect(doctypeClone.systemId).toBe('system')
    expect(() => new Document().cloneNode(true)).toThrow('not supported')
  })

  it('uses case-insensitive HTML attributes and case-sensitive foreign attributes', () => {
    const html = new Element('div')
    html.setAttribute('DATA-ID', 'one')
    expect(html.getAttribute('data-id')).toBe('one')
    expect(html.hasAttribute('Data-Id')).toBe(true)
    expect(html.attributes.item(0)?.name).toBe('data-id')
    html.removeAttribute('DATA-id')
    expect(html.hasAttribute('data-id')).toBe(false)

    const svg = new Element('svg', SVG_NAMESPACE)
    svg.setAttribute('viewBox', '0 0 1 1')
    expect(svg.getAttribute('viewBox')).toBe('0 0 1 1')
    expect(svg.getAttribute('viewbox')).toBeNull()
  })
})
