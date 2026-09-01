import { bench, describe } from 'vitest'
import { Document, DocumentFragment, Element, Text } from '../../src/index.js'

let benchmarkSink = 0

describe('DOM Mutation Performance', () => {
  bench('Construct 10,000 text leaves without collection access', () => {
    const nodes = Array.from({ length: 10_000 }, () => new Text('value'))
    benchmarkSink ^= nodes[0]?.nodeName.length ?? 0
    benchmarkSink ^= nodes.length
  })

  bench('Construct 10,000 attribute-less elements', () => {
    const elements = Array.from({ length: 10_000 }, () => new Element('div'))
    benchmarkSink ^= elements[0]?.tagName.length ?? 0
    benchmarkSink ^= elements.length
  })

  const document = new Document()
  bench('Create 10,000 common elements through Document', () => {
    const elements = Array.from({ length: 10_000 }, () => document.createElement('div'))
    benchmarkSink ^= elements.length
  })

  const detached = new Element('div')
  const unusedReplacements = Array.from({ length: 50_000 }, () => 'unused')
  bench('Ignore 50,000 replacements for a detached element', () => {
    detached.replaceWith(...unusedReplacements)
    benchmarkSink ^= detached.nodeName.length
  })

  bench('Set and remove 4,000 attributes in insertion order', () => {
    const element = new Element('div')
    for (let index = 0; index < 4_000; index++) {
      element.setAttribute(`data-${index}`, `value-${index}`)
    }
    for (let index = 0; index < 4_000; index++) {
      element.removeAttribute(`data-${index}`)
    }
    benchmarkSink ^= element.attributes.length
  })

  bench('Replace one node with 2,000 nodes as one batch', () => {
    const parent = new Element('div')
    const target = new Element('target')
    const replacements = Array.from({ length: 2_000 }, () => new Element('i'))
    parent.appendChild(target)
    target.replaceWith(...replacements)
    benchmarkSink ^= parent.childNodes.length
  })

  bench('Replace one node with 2,000 existing siblings as one batch', () => {
    const parent = new Element('div')
    const target = new Element('target')
    const replacements = Array.from({ length: 2_000 }, () => new Element('i'))
    parent.appendChild(target)
    for (const replacement of replacements) parent.appendChild(replacement)
    target.replaceWith(...replacements)
    benchmarkSink ^= parent.childNodes.length
  })

  bench('Replace with 100 occurrences of one 10,000-child fragment', () => {
    const parent = new Element('div')
    const target = new Element('target')
    const fragment = new DocumentFragment()
    parent.appendChild(target)
    for (let index = 0; index < 10_000; index++) {
      fragment.appendChild(new Element('i'))
    }
    target.replaceWith(...Array.from({ length: 100 }, () => fragment))
    benchmarkSink ^= parent.childNodes.length
  })

  const wideParent = new Element('div')
  for (let index = 0; index < 100_000; index++) {
    wideParent.appendChild(new Element('i'))
  }

  bench('Re-append an unchanged tail in 100,000 siblings', () => {
    benchmarkSink ^= wideParent.appendChild(wideParent.lastChild!).nodeName.length
  })

  const wideCloneSource = new Element('div')
  for (let index = 0; index < 50_000; index++) {
    wideCloneSource.appendChild(new Element('i'))
  }

  bench('Deep-clone 50,000 wide leaves without leaf-group allocations', () => {
    const clone = wideCloneSource.cloneNode(true)
    benchmarkSink ^= clone.childNodes.length
  })
})
