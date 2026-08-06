/**
 * DOM Parsing Benchmarks
 *
 * Compares @lpm.dev/neo.dom against jsdom for HTML parsing performance
 */

import { bench, describe } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'

let benchmarkSink = 0

describe('HTML Parsing Performance', () => {
  const parser = new DOMParser()

  // Simple HTML
  const simpleHTML = '<div><p>Hello World</p></div>'

  bench('Simple HTML (neo.dom)', () => {
    const doc = parser.parseFromString(simpleHTML, 'text/html')
    benchmarkSink ^= doc.body.childNodes.length
  })

  // Complex HTML with attributes
  const complexHTML = `
    <div class="container" id="main" data-test="value">
      <header>
        <h1>Title</h1>
        <nav>
          <a href="/home">Home</a>
          <a href="/about">About</a>
        </nav>
      </header>
      <main>
        <article>
          <h2>Article Title</h2>
          <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </article>
      </main>
      <footer>
        <p>&copy; 2024 Company</p>
      </footer>
    </div>
  `

  bench('Complex HTML (neo.dom)', () => {
    const doc = parser.parseFromString(complexHTML, 'text/html')
    benchmarkSink ^= doc.body.childNodes.length
  })

  // HTML with entities
  const entitiesHTML = '<div>&lt;script&gt;alert()&lt;/script&gt; &amp; &quot;quotes&quot;</div>'

  bench('HTML with entities (neo.dom)', () => {
    const doc = parser.parseFromString(entitiesHTML, 'text/html')
    benchmarkSink ^= doc.body.childNodes.length
  })

  // Large HTML (100 paragraphs)
  const largeHTML = '<div>' + Array.from({ length: 100 }, (_, i) => `<p>Paragraph ${i}</p>`).join('') + '</div>'

  bench('Large HTML - 100 elements (neo.dom)', () => {
    const doc = parser.parseFromString(largeHTML, 'text/html')
    benchmarkSink ^= doc.body.childNodes.length
  })

  // Deeply nested HTML
  const deepHTML = '<div>'.repeat(20) + 'Content' + '</div>'.repeat(20)

  bench('Deeply nested HTML - 20 levels (neo.dom)', () => {
    const doc = parser.parseFromString(deepHTML, 'text/html')
    benchmarkSink ^= doc.body.childNodes.length
  })

  // HTML with many attributes
  const manyAttrsHTML = '<div ' + Array.from({ length: 20 }, (_, i) => `data-${i}="value${i}"`).join(' ') + '>Content</div>'

  bench('Many attributes - 20 attrs (neo.dom)', () => {
    const doc = parser.parseFromString(manyAttrsHTML, 'text/html')
    benchmarkSink ^= doc.body.childNodes.length
  })
})
