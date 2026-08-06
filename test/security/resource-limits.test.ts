import { describe, expect, it } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { serializeNode } from '../../src/utils/serializer.js'

describe('parser resource limits', () => {
  it('rejects input longer than maxInputLength before parsing', () => {
    const parser = new DOMParser({ maxInputLength: 5 })
    expect(() => parser.parseFromString('123456', 'text/html')).toThrow('maxInputLength')
  })

  it('rejects a parsed tree larger than maxNodes', () => {
    const parser = new DOMParser({ maxNodes: 2 })
    expect(() => parser.parseFromString('', 'text/html')).toThrow('maxNodes')
  })

  it('rejects a parsed tree deeper than maxDepth', () => {
    const parser = new DOMParser({ maxDepth: 2 })
    expect(() => parser.parseFromString('<p>x</p>', 'text/html')).toThrow('maxDepth')
  })

  it('rejects elements with too many attributes', () => {
    const parser = new DOMParser({ maxAttributesPerElement: 1 })
    expect(() => parser.parseFromString('<p a="1" b="2">x</p>', 'text/html'))
      .toThrow('maxAttributesPerElement')
  })

  it('rejects invalid option values at construction', () => {
    expect(() => new DOMParser({ maxNodes: 0 })).toThrow('positive safe integer')
    expect(() => new DOMParser({ maxDepth: Number.POSITIVE_INFINITY })).toThrow('positive safe integer')
  })

  it('rejects extreme nesting at the default depth limit with a RangeError', () => {
    const depth = 2_100
    const html = '<div>'.repeat(depth) + 'x' + '</div>'.repeat(depth)

    expect(() => new DOMParser().parseFromString(html, 'text/html'))
      .toThrowError(/maxDepth/)
  })

  it('parses, reads, serializes, and clones 5,000 levels without call-stack exhaustion', () => {
    const depth = 5_000
    const html = '<div>'.repeat(depth) + 'deep' + '</div>'.repeat(depth)
    const parser = new DOMParser({
      maxDepth: depth + 10,
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
