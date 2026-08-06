/**
 * DOM Traversal Benchmarks
 *
 * Tests NodeIterator and tree traversal performance
 */

import { bench, describe } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { NodeIterator } from '../../src/traversal/iterator.js'
import { NodeFilter } from '../../src/utils/constants.js'

let benchmarkSink = 0

describe('DOM Traversal Performance', () => {
  const parser = new DOMParser()

  // Medium-sized document
  const mediumHTML = `
    <div>
      <header><h1>Title</h1><nav><a>Link1</a><a>Link2</a></nav></header>
      <main>
        <article><h2>H2</h2><p>Para1</p><p>Para2</p></article>
        <article><h2>H2</h2><p>Para3</p><p>Para4</p></article>
      </main>
      <footer><p>Footer</p></footer>
    </div>
  `
  const mediumDoc = parser.parseFromString(mediumHTML, 'text/html')
  const mediumRoot = mediumDoc.body.firstChild!

  bench('Iterate all nodes - medium tree (neo.dom)', () => {
    const iterator = new NodeIterator(mediumRoot, NodeFilter.SHOW_ALL, null)
    let count = 0
    while (iterator.nextNode()) {
      count++
    }
    benchmarkSink ^= count
  })

  bench('Iterate elements only - medium tree (neo.dom)', () => {
    const iterator = new NodeIterator(mediumRoot, NodeFilter.SHOW_ELEMENT, null)
    let count = 0
    while (iterator.nextNode()) {
      count++
    }
    benchmarkSink ^= count
  })

  // Large tree (100 elements)
  const largeHTML = '<div>' + Array.from({ length: 100 }, (_, i) => `<p>Text ${i}</p>`).join('') + '</div>'
  const largeDoc = parser.parseFromString(largeHTML, 'text/html')
  const largeRoot = largeDoc.body.firstChild!

  bench('Iterate large tree - 100 elements (neo.dom)', () => {
    const iterator = new NodeIterator(largeRoot, NodeFilter.SHOW_ELEMENT, null)
    let count = 0
    while (iterator.nextNode()) {
      count++
    }
    benchmarkSink ^= count
  })

  // Deep tree (20 levels)
  const deepHTML = '<div>'.repeat(20) + 'Content' + '</div>'.repeat(20)
  const deepDoc = parser.parseFromString(deepHTML, 'text/html')
  const deepRoot = deepDoc.body.firstChild!

  bench('Iterate deep tree - 20 levels (neo.dom)', () => {
    const iterator = new NodeIterator(deepRoot, NodeFilter.SHOW_ELEMENT, null)
    let count = 0
    while (iterator.nextNode()) {
      count++
    }
    benchmarkSink ^= count
  })

  // With custom filter
  bench('Iterate with filter - medium tree (neo.dom)', () => {
    const filter = (node: any) => {
      return node.tagName?.toLowerCase() === 'p' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    }
    const iterator = new NodeIterator(mediumRoot, NodeFilter.SHOW_ELEMENT, filter)
    let count = 0
    while (iterator.nextNode()) {
      count++
    }
    benchmarkSink ^= count
  })

  // Bidirectional iteration
  bench('Bidirectional iteration (neo.dom)', () => {
    const iterator = new NodeIterator(mediumRoot, NodeFilter.SHOW_ELEMENT, null)
    let count = 0

    // Go forward
    while (iterator.nextNode()) count++

    // Go backward
    while (iterator.previousNode()) count++
    benchmarkSink ^= count
  })

  const wideHTML = '<div>' + '<span></span>'.repeat(20_000) + '</div>'
  const wideDoc = parser.parseFromString(wideHTML, 'text/html')
  const wideRoot = wideDoc.body.firstChild!

  bench('Follow nextSibling links - 20,000 siblings (neo.dom)', () => {
    let count = 0
    let node = wideRoot.firstChild
    while (node) {
      count++
      node = node.nextSibling
    }
    benchmarkSink ^= count
  })
})
