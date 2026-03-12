/**
 * DOM Serialization Benchmarks
 *
 * Tests innerHTML and serialization performance
 */

import { bench, describe } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { serializeElement } from '../../src/utils/serializer.js'

describe('HTML Serialization Performance', () => {
  const parser = new DOMParser()

  // Simple element
  const simpleDoc = parser.parseFromString('<div><p>Hello World</p></div>', 'text/html')
  const simpleElement = simpleDoc.body.firstChild! as any

  bench('Serialize simple element (neo.dom)', () => {
    serializeElement(simpleElement)
  })

  // Complex nested structure
  const complexHTML = `
    <div class="container">
      <header><h1>Title</h1></header>
      <main>
        <article>
          <p>Text with <strong>bold</strong> and <em>italic</em></p>
          <ul><li>One</li><li>Two</li><li>Three</li></ul>
        </article>
      </main>
    </div>
  `
  const complexDoc = parser.parseFromString(complexHTML, 'text/html')
  const complexElement = complexDoc.body.firstChild! as any

  bench('Serialize complex element (neo.dom)', () => {
    serializeElement(complexElement)
  })

  // Element with many attributes
  const attrsHTML = '<div id="test" class="foo bar" data-x="1" data-y="2" style="color: red">Content</div>'
  const attrsDoc = parser.parseFromString(attrsHTML, 'text/html')
  const attrsElement = attrsDoc.body.firstChild! as any

  bench('Serialize element with attributes (neo.dom)', () => {
    serializeElement(attrsElement)
  })

  // Large document
  const largeHTML = '<div>' + Array.from({ length: 100 }, (_, i) => `<p>Paragraph ${i}</p>`).join('') + '</div>'
  const largeDoc = parser.parseFromString(largeHTML, 'text/html')
  const largeElement = largeDoc.body.firstChild! as any

  bench('Serialize large document - 100 elements (neo.dom)', () => {
    serializeElement(largeElement)
  })

  // innerHTML getter
  bench('element.innerHTML getter (neo.dom)', () => {
    complexElement.innerHTML
  })
})
