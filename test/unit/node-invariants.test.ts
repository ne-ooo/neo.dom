import { describe, expect, it, vi } from 'vitest'
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

  it('rejects a fragment that contains the insertion target without changing either tree', () => {
    const fragment = new DocumentFragment()
    const target = new Element('div')
    fragment.appendChild(target)

    expect(() => target.appendChild(fragment)).toThrow('HierarchyRequestError')
    expect(fragment.firstChild).toBe(target)
    expect(fragment.childNodes.length).toBe(1)
    expect(target.parentNode).toBe(fragment)
    expect(target.firstChild).toBeNull()
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

  it('treats replaceWith self replacement as a no-op', () => {
    const parent = new Element('div')
    const element = new Element('p')
    parent.appendChild(element)

    element.replaceWith(element)

    expect(Array.from(parent.childNodes)).toEqual([element])
    expect(element.parentNode).toBe(parent)
  })

  it('batches replaceWith arguments and preserves final order', () => {
    const parent = new Element('div')
    const target = new Element('target')
    const second = new Element('second')
    const third = new Element('third')
    const tail = new Element('tail')
    parent.appendChild(target)
    parent.appendChild(second)
    parent.appendChild(third)
    parent.appendChild(tail)

    target.replaceWith(third, 'middle', target, second)

    const children = Array.from(parent.childNodes)
    expect(children).toHaveLength(5)
    expect(children[0]).toBe(third)
    expect(children[1]).toBeInstanceOf(Text)
    expect(children[1]?.nodeValue).toBe('middle')
    expect(children[2]).toBe(target)
    expect(children[3]).toBe(second)
    expect(children[4]).toBe(tail)
  })

  it('uses one parent replacement for a large replaceWith batch', () => {
    const parent = new Element('div')
    const target = new Element('target')
    const replacements = Array.from({ length: 5_000 }, () => new Element('i'))
    parent.appendChild(target)
    const replaceChild = vi.spyOn(parent, 'replaceChild')

    target.replaceWith(...replacements)

    expect(replaceChild).toHaveBeenCalledTimes(1)
    expect(parent.childNodes.length).toBe(replacements.length)
    expect(parent.firstChild).toBe(replacements[0])
    expect(parent.lastChild).toBe(replacements.at(-1))
  })

  it('detaches existing replaceWith siblings without repeated public removals', () => {
    const parent = new Element('div')
    const target = new Element('target')
    const replacements = Array.from({ length: 5_000 }, () => new Element('i'))
    parent.appendChild(target)
    for (const replacement of replacements) parent.appendChild(replacement)
    const removeChild = vi.spyOn(parent, 'removeChild')

    target.replaceWith(...replacements)

    expect(removeChild).not.toHaveBeenCalled()
    expect(Array.from(parent.childNodes)).toEqual(replacements)
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

  it('moves very large fragments without argument overflow and preserves links', () => {
    const count = 130_000
    const parent = new Element('div')
    const fragment = new DocumentFragment()
    for (let index = 0; index < count; index++) {
      fragment.appendChild(new Element('i'))
    }

    expect(() => parent.appendChild(fragment)).not.toThrow()
    expect(fragment.childNodes.length).toBe(0)
    expect(parent.childNodes.length).toBe(count)
    expect(parent.firstChild?.parentNode).toBe(parent)
    expect(parent.firstChild?.previousSibling).toBeNull()
    expect(parent.firstChild?.nextSibling).toBe(parent.childNodes.item(1))
    expect(parent.lastChild?.previousSibling).toBe(parent.childNodes.item(count - 2))
    expect(parent.lastChild?.nextSibling).toBeNull()
  }, 20_000)

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

  it('rejects forged node objects before changing the tree', () => {
    const parent = new Element('div')
    const child = new Element('span')
    const forged = {
      nodeType: NodeType.ELEMENT_NODE,
      nodeName: 'FORGED',
      parentNode: null,
      childNodes: [],
    }
    parent.appendChild(child)

    expect(() => parent.appendChild(forged as never)).toThrow('canonical neo.dom Node')
    expect(() => parent.insertBefore(forged as never, child)).toThrow('canonical neo.dom Node')
    expect(() => parent.replaceChild(forged as never, child)).toThrow('canonical neo.dom Node')
    expect(() => parent.removeChild(forged as never)).toThrow('canonical neo.dom Node')
    expect(Array.from(parent.childNodes)).toEqual([child])
    expect(child.parentNode).toBe(parent)
  })

  it('uses canonical metadata when public parent access is shadowed', () => {
    const parent = new Element('div')
    const child = new Element('span')
    parent.appendChild(child)
    Object.defineProperty(child, 'parentNode', {
      value: null,
      configurable: true,
    })

    expect(() => child.appendChild(parent)).toThrow('create a cycle')
    expect(child.firstChild).toBeNull()
    expect(parent.firstChild).toBe(child)

    expect(Reflect.deleteProperty(child, 'parentNode')).toBe(true)
    expect(child.parentNode).toBe(parent)
    expect(parent.parentNode).toBeNull()
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

  it('keeps structural node metadata read-only', () => {
    const parent = new Element('div')
    const child = new Element('span')
    parent.appendChild(child)

    expect(Reflect.set(child, 'nodeType', NodeType.TEXT_NODE)).toBe(false)
    expect(Reflect.set(child, 'nodeName', '#text')).toBe(false)
    expect(Reflect.set(child, 'parentNode', null)).toBe(false)
    expect(child.nodeType).toBe(NodeType.ELEMENT_NODE)
    expect(child.nodeName).toBe('SPAN')
    expect(child.parentNode).toBe(parent)
  })

  it('ignores nodeValue writes on structural nodes', () => {
    const element = new Element('div')
    const doctype = new DocumentType('html')

    element.nodeValue = 'changed'
    doctype.nodeValue = 'changed'

    expect(element.nodeValue).toBeNull()
    expect(doctype.nodeValue).toBeNull()
  })

  it('derives document structure getters from the current tree', () => {
    const document = new Document()
    const oldRoot = document.documentElement!
    const oldHead = document.head!
    const oldBody = document.body!

    oldRoot.removeChild(oldHead)
    oldRoot.removeChild(oldBody)
    expect(document.head).toBeNull()
    expect(document.body).toBeNull()

    document.removeChild(oldRoot)
    expect(document.documentElement).toBeNull()

    const newRoot = new Element('main')
    document.appendChild(newRoot)
    expect(document.documentElement).toBe(newRoot)
    expect(document.head).toBeNull()
    expect(document.body).toBeNull()
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

  it('keeps attribute indexing and replacement order stable', () => {
    const element = new Element('div')
    element.setAttribute('a', 'one')
    element.setAttribute('b', 'two')
    element.setAttribute('A', 'replacement')

    expect(element.attributes.item(0)).toEqual({ name: 'a', value: 'replacement' })
    expect(element.attributes.item(1)).toEqual({ name: 'b', value: 'two' })
    expect(element.attributes[0]).toBe(element.attributes.item(0))
    expect(element.attributes[1]).toBe(element.attributes.item(1))
    expect(Reflect.set(element.attributes, '0', { name: 'changed', value: 'bad' })).toBe(false)
    expect(element.attributes[0]?.name).toBe('a')
    expect(Array.from(element.attributes).map(attribute => attribute.name)).toEqual(['a', 'b'])
  })

  it('rebuilds numeric attribute indexes after constant-time mutations', () => {
    const element = new Element('div')
    element.setAttribute('a', 'one')
    element.setAttribute('b', 'two')
    element.setAttribute('c', 'three')
    expect(element.attributes.item(0)?.name).toBe('a')

    element.removeAttribute('a')
    expect(element.attributes.item(0)).toEqual({ name: 'b', value: 'two' })
    expect(element.attributes[1]).toEqual({ name: 'c', value: 'three' })

    element.setAttribute('B', 'updated')
    expect(element.attributes.item(0)).toEqual({ name: 'b', value: 'updated' })
    expect(Array.from(element.attributes).map(attribute => attribute.name)).toEqual(['b', 'c'])
  })
})
