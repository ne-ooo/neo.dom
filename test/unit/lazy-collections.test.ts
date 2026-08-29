import { describe, expect, it } from 'vitest'
import { Element, Text } from '../../src/index.js'
import { serializeElement } from '../../src/utils/serializer.js'

describe('lazy DOM collections', () => {
  it('creates one live NodeList only when childNodes is read', () => {
    const parent = new Element('div')
    const child = new Text('value')
    parent.appendChild(child)

    expect(Reflect.get(parent, '_childNodesList')).toBeNull()
    expect(Reflect.get(child, '_childNodesList')).toBeNull()

    const children = parent.childNodes
    expect(children.item(0)).toBe(child)
    expect(parent.childNodes).toBe(children)
    expect(Reflect.get(child, '_childNodesList')).toBeNull()
  })

  it('rejects numeric writes to a live NodeList', () => {
    const parent = new Element('div')
    const child = new Text('value')
    const replacement = new Text('replacement')
    parent.appendChild(child)
    const children = parent.childNodes

    expect(Reflect.set(children, '0', replacement)).toBe(false)
    expect(children[0]).toBe(child)
    expect(parent.firstChild).toBe(child)
    expect(replacement.parentNode).toBeNull()
  })

  it('does not create an attribute collection for empty reads or cloning', () => {
    const element = new Element('div')

    expect(element.getAttribute('missing')).toBeNull()
    expect(element.hasAttribute('missing')).toBe(false)
    element.removeAttribute('missing')
    const clone = element.cloneNode() as Element

    expect(Reflect.get(element, '_attributes')).toBeNull()
    expect(Reflect.get(clone, '_attributes')).toBeNull()

    const attributes = element.attributes
    expect(attributes.length).toBe(0)
    expect(element.attributes).toBe(attributes)
  })

  it('serializes without materializing child or attribute collections', () => {
    const root = new Element('div')
    const children = Array.from({ length: 100 }, () => new Element('i'))
    for (const child of children) root.appendChild(child)

    expect(serializeElement(root)).toBe(`<div>${'<i></i>'.repeat(children.length)}</div>`)
    expect(Reflect.get(root, '_childNodesList')).toBeNull()
    expect(Reflect.get(root, '_attributes')).toBeNull()
    for (const child of children) {
      expect(Reflect.get(child, '_childNodesList')).toBeNull()
      expect(Reflect.get(child, '_attributes')).toBeNull()
    }
  })
})
