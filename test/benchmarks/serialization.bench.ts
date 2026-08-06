/**
 * DOM Serialization Benchmarks
 *
 * Tests innerHTML and serialization performance
 */

import { bench, describe } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { serializeElement } from '../../src/utils/serializer.js'
import type { Element as IElement, Node as INode } from '../../src/types.js'
import { NodeType } from '../../src/utils/constants.js'

let benchmarkSink = 0

function firstElementChild(parent: INode): IElement {
  for (const child of parent.childNodes) {
    if (child.nodeType === NodeType.ELEMENT_NODE) return child as IElement
  }
  throw new Error('Benchmark fixture does not contain an element child')
}

describe('HTML Serialization Performance', () => {
  const parser = new DOMParser()

  // Simple element
  const simpleDoc = parser.parseFromString('<div><p>Hello World</p></div>', 'text/html')
  const simpleElement = firstElementChild(simpleDoc.body)

  bench('Serialize simple element (neo.dom)', () => {
    benchmarkSink ^= serializeElement(simpleElement).length
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
  const complexElement = firstElementChild(complexDoc.body)
  if (complexElement.localName !== 'div' || complexElement.getAttribute('class') !== 'container') {
    throw new Error('Complex serialization benchmark selected the wrong fixture node')
  }

  bench('Serialize complex element (neo.dom)', () => {
    benchmarkSink ^= serializeElement(complexElement).length
  })

  // Element with many attributes
  const attrsHTML = '<div id="test" class="foo bar" data-x="1" data-y="2" style="color: red">Content</div>'
  const attrsDoc = parser.parseFromString(attrsHTML, 'text/html')
  const attrsElement = firstElementChild(attrsDoc.body)

  bench('Serialize element with attributes (neo.dom)', () => {
    benchmarkSink ^= serializeElement(attrsElement).length
  })

  // Large document
  const largeHTML = '<div>' + Array.from({ length: 100 }, (_, i) => `<p>Paragraph ${i}</p>`).join('') + '</div>'
  const largeDoc = parser.parseFromString(largeHTML, 'text/html')
  const largeElement = firstElementChild(largeDoc.body)

  bench('Serialize large document - 100 elements (neo.dom)', () => {
    benchmarkSink ^= serializeElement(largeElement).length
  })

  // innerHTML getter
  bench('element.innerHTML getter, uncached (neo.dom)', () => {
    benchmarkSink ^= complexElement.innerHTML.length
  })
})
