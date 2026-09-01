import { describe, expect, it } from 'vitest'
import {
  Document,
  DocumentType,
  Element,
  HTML_NAMESPACE,
  Node,
  NodeType,
} from '../../src/index.js'
import { DOMParser } from '../../src/parser/parser.js'
import { serializeElement } from '../../src/utils/serializer.js'

describe('Parser security contract', () => {
  it('preserves executable markup instead of pretending to sanitize it', () => {
    const doc = new DOMParser().parseFromString(
      '<script>alert(1)</script><a href="javascript:alert(2)" onclick="alert(3)">link</a>',
      'text/html'
    )
    const script = doc.head.firstChild as any
    const anchor = doc.body.firstChild as any

    expect(script.nodeName).toBe('SCRIPT')
    expect(script.textContent).toBe('alert(1)')
    expect(anchor.getAttribute('href')).toBe('javascript:alert(2)')
    expect(anchor.getAttribute('onclick')).toBe('alert(3)')
    expect(serializeElement(anchor)).toContain('javascript:alert(2)')
  })

  it('parses scripts as inert data inside neo.dom', () => {
    ;(globalThis as { neoDomExecuted?: boolean }).neoDomExecuted = false

    new DOMParser().parseFromString(
      '<script>globalThis.neoDomExecuted = true</script>',
      'text/html'
    )

    expect((globalThis as { neoDomExecuted?: boolean }).neoDomExecuted).toBe(false)
    delete (globalThis as { neoDomExecuted?: boolean }).neoDomExecuted
  })

  it('rejects structural names that could inject serialized markup', () => {
    const document = new Document()
    const element = new Element('div')
    const invalidNames = [
      '',
      'img src=x',
      'data-user onmouseover',
      'name" onclick="alert(1)',
      'name<svg',
      'name>tail',
      'name/value',
      'name=value',
      '1invalid',
      'control\u0000name',
    ]

    for (const name of invalidNames) {
      expect(() => document.createElement(name)).toThrowError(/InvalidCharacterError/)
      expect(() => element.setAttribute(name, 'value')).toThrowError(/InvalidCharacterError/)
      expect(() => element.attributes.setNamedItem({ name, value: 'value' }))
        .toThrowError(/InvalidCharacterError/)
    }

    expect(element.attributes.length).toBe(0)
  })

  it('rejects base Node instances that impersonate concrete element nodes', () => {
    const host = new Element('div')
    const forged = Object.assign(
      new Node(NodeType.ELEMENT_NODE, 'FORGED'),
      {
        namespaceURI: HTML_NAMESPACE,
        localName: 'img src=x onerror=alert(1)',
        attributes: [],
      }
    )

    expect(() => host.appendChild(forged)).toThrow('concrete neo.dom node')
    expect(host.innerHTML).toBe('')
    expect(forged.parentNode).toBeNull()
  })

  it('rejects base Node instances as mutation parents', () => {
    const forgedParent = new Node(NodeType.ELEMENT_NODE, 'FORGED')
    const child = new Element('span')

    expect(() => forgedParent.appendChild(child)).toThrow('concrete neo.dom node')
    expect(() => forgedParent.insertBefore(child, null)).toThrow('concrete neo.dom node')
    expect(child.parentNode).toBeNull()
    expect(forgedParent.firstChild).toBeNull()
  })

  it('preserves valid custom, Unicode, and namespace-prefixed names', () => {
    const custom = new Element('custom-element')
    const unicode = new Element('étiquette')
    custom.setAttribute('xlink:href', '#target')
    unicode.setAttribute('données', 'ok')

    expect(custom.localName).toBe('custom-element')
    expect(custom.getAttribute('xlink:href')).toBe('#target')
    expect(unicode.localName).toBe('étiquette')
    expect(unicode.getAttribute('données')).toBe('ok')
  })

  it('changes only ASCII letters when normalizing HTML names', () => {
    const document = new DOMParser().parseFromString(
      '<div İ="one" i̇="two"></div>',
      'text/html'
    )
    const element = document.body?.firstChild as Element
    const unicode = new Element('x-É')

    expect(element.attributes.length).toBe(2)
    expect(element.getAttribute('İ')).toBe('one')
    expect(element.getAttribute('i̇')).toBe('two')
    expect(unicode.localName).toBe('x-É')
    expect(unicode.tagName).toBe('X-É')
  })

  it('keeps validated element and attribute names immutable at runtime', () => {
    const element = new Element('div')
    element.setAttribute('data-safe', 'value')
    const attribute = element.attributes.item(0)!

    expect(Reflect.set(element, 'localName', 'img onerror=alert(1)')).toBe(false)
    expect(Reflect.set(element, 'tagName', 'IMG ONERROR=ALERT(1)')).toBe(false)
    expect(Reflect.set(element, 'attributes', { length: 0 })).toBe(false)
    expect(Reflect.set(attribute, 'name', 'x onmouseover')).toBe(false)
    expect(element.localName).toBe('div')
    expect(attribute.name).toBe('data-safe')
  })

  it('keeps doctype metadata immutable at runtime', () => {
    const declaration = new DocumentType('html', 'public-id', 'system-id')

    expect(Reflect.set(declaration, 'name', 'svg')).toBe(false)
    expect(Reflect.set(declaration, 'publicId', 'changed')).toBe(false)
    expect(Reflect.set(declaration, 'systemId', 'changed')).toBe(false)
    expect(declaration.name).toBe('html')
    expect(declaration.publicId).toBe('public-id')
    expect(declaration.systemId).toBe('system-id')
    expect(declaration.nodeName).toBe('html')
  })

  it('stores a validated copy of attributes supplied through NamedNodeMap', () => {
    const element = new Element('div')
    const supplied = { name: 'data-safe', value: 'one' }

    expect(element.attributes.setNamedItem(supplied)).toBeNull()
    const stored = element.attributes.item(0)!
    expect(stored).not.toBe(supplied)

    supplied.name = 'x onmouseover'
    supplied.value = 'two'
    expect(stored.name).toBe('data-safe')
    expect(stored.value).toBe('one')
    expect(serializeElement(element)).toBe('<div data-safe="one"></div>')
  })

  it('continues to parse HTML tokenizer names that public DOM mutation rejects', () => {
    const document = new DOMParser().parseFromString('<foo"bar data<part="x"></foo"bar>', 'text/html')
    const element = document.body.firstChild as Element

    expect(element.localName).toBe('foo"bar')
    expect(element.getAttribute('data<part')).toBe('x')
    expect(() => new Element('foo"bar')).toThrowError(/InvalidCharacterError/)
    expect(() => new Element('div').setAttribute('data<part', 'x'))
      .toThrowError(/InvalidCharacterError/)
  })
})
