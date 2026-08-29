import { describe, expect, it } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { serializeNode } from '../../src/utils/serializer.js'

describe('parser resource limits', () => {
  it('rejects input longer than maxInputLength before parsing', () => {
    const parser = new DOMParser({ maxInputLength: 5 })
    expect(() => parser.parseFromString('123456', 'text/html')).toThrow('maxInputLength')
  })

  it('rejects token-heavy markup before tree construction', () => {
    const html = '</ul>'.repeat(100)
    const parser = new DOMParser({ maxMarkupStarts: 20 })

    expect(() => parser.parseFromString(html, 'text/html')).toThrow('maxMarkupStarts')
  })

  it('rejects a parsed tree larger than maxNodes', () => {
    const parser = new DOMParser({ maxNodes: 2 })
    expect(() => parser.parseFromString('', 'text/html')).toThrow('maxNodes')
  })

  it('stops parse5 construction near maxNodes instead of building the full input tree', () => {
    const html = '<i></i>'.repeat(50_000)
    const parser = new DOMParser({
      maxInputLength: html.length + 1,
      maxNodes: 20,
    })

    expect(() => parser.parseFromString(html, 'text/html')).toThrow('maxNodes')
  })

  it('rejects a parsed tree deeper than maxDepth', () => {
    const parser = new DOMParser({ maxDepth: 2 })
    expect(() => parser.parseFromString('<p>x</p>', 'text/html')).toThrow('maxDepth')
  })

  it('applies maxDepth to the final tree instead of the transient parser stack', () => {
    const parser = new DOMParser({ maxDepth: 3 })
    const document = parser.parseFromString('<select><select><table><svg>', 'text/html')

    expect(document.body?.childNodes.length).toBe(3)
  })

  it('limits the transient parser stack independently', () => {
    const parser = new DOMParser({
      maxDepth: 20,
      maxOpenElements: 3,
    })

    expect(() => parser.parseFromString('<div><span><b><i>x</i></b></span></div>', 'text/html'))
      .toThrow('maxOpenElements')
  })

  it('rejects elements with too many attributes', () => {
    const parser = new DOMParser({ maxAttributesPerElement: 1 })
    expect(() => parser.parseFromString('<p a="1" b="2">x</p>', 'text/html'))
      .toThrow('maxAttributesPerElement')
  })

  it('rejects a wide start tag before duplicate-name lookup becomes quadratic', () => {
    const attributes = Array.from({ length: 32_000 }, (_, index) => ` a${index}=""`).join('')
    const html = `<p${attributes}>x</p>`
    const parser = new DOMParser({
      maxInputLength: html.length + 1,
      maxAttributesPerElement: 1,
    })

    expect(() => parser.parseFromString(html, 'text/html'))
      .toThrow('maxAttributesPerElement')
  })

  it('does not count duplicate names as additional element attributes', () => {
    const document = new DOMParser({ maxAttributesPerElement: 1 })
      .parseFromString('<p a="first" a="second"></p>', 'text/html')

    expect(document.body?.firstChild?.nodeName).toBe('P')
  })

  it('enforces adopted html and body attributes during tree construction', () => {
    const parser = new DOMParser({ maxAttributesPerElement: 1 })
    expect(() => parser.parseFromString('<html a="1" b="2"></html>', 'text/html'))
      .toThrow('maxAttributesPerElement')
    expect(() => parser.parseFromString('<body a="1" b="2"></body>', 'text/html'))
      .toThrow('maxAttributesPerElement')
  })

  it('counts a frameset document exactly without adding a synthetic body', () => {
    const document = new DOMParser({ maxNodes: 3 })
      .parseFromString('<frameset></frameset>', 'text/html')

    expect(document.body?.nodeName).toBe('FRAMESET')
    expect(Array.from(document.documentElement?.childNodes ?? []).map(node => node.nodeName))
      .toEqual(['HEAD', 'FRAMESET'])
  })

  it('rejects invalid option values at construction', () => {
    expect(() => new DOMParser({ maxNodes: 0 })).toThrow('positive safe integer')
    expect(() => new DOMParser({ maxMarkupStarts: -1 })).toThrow('positive safe integer')
    expect(() => new DOMParser({ maxDepth: Number.POSITIVE_INFINITY })).toThrow('positive safe integer')
  })

  it('rejects extreme nesting at the default depth limit with a RangeError', () => {
    const depth = 2_100
    const html = '<div>'.repeat(depth) + 'x' + '</div>'.repeat(depth)

    expect(() => new DOMParser().parseFromString(html, 'text/html'))
      .toThrowError(/maxOpenElements/)
  })

  it('parses, reads, serializes, and clones 5,000 levels without call-stack exhaustion', () => {
    const depth = 5_000
    const html = '<div>'.repeat(depth) + 'deep' + '</div>'.repeat(depth)
    const parser = new DOMParser({
      maxDepth: depth + 10,
      maxOpenElements: depth + 10,
      maxNodes: depth + 10,
    })

    const document = parser.parseFromString(html, 'text/html')
    const root = document.body.firstChild!

    expect(root.textContent).toBe('deep')
    expect(serializeNode(root)).toBe(html)

    const clone = root.cloneNode(true)
    expect(clone.textContent).toBe('deep')
    expect(serializeNode(clone)).toBe(html)
  }, 20_000)
})
