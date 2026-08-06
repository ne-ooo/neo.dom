import { describe, expect, it } from 'vitest'
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
})
