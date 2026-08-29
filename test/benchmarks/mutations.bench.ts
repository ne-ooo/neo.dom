import { bench, describe } from 'vitest'
import { Element, Text } from '../../src/index.js'

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
})
