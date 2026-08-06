import { describe, expect, it, vi } from 'vitest'
import { DOMParser, Element, NodeFilter, TreeWalker } from '../../src/index.js'
import type { Node as INode } from '../../src/types.js'

function elementNames(nodes: INode[]): string[] {
  return nodes.map(node => (node as Element).localName)
}

describe('TreeWalker conformance', () => {
  const parser = new DOMParser()

  it('walks forward and backward in document order', () => {
    const document = parser.parseFromString(
      '<div><span><strong><em>deep</em></strong></span><p>next</p></div>',
      'text/html'
    )
    const root = document.body.firstChild!
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT)

    const forward: INode[] = []
    let node: INode | null
    while ((node = walker.nextNode())) forward.push(node)
    expect(elementNames(forward)).toEqual(['span', 'strong', 'em', 'p'])

    walker.currentNode = forward.at(-1)!
    expect((walker.previousNode() as Element).localName).toBe('em')
    expect((walker.previousNode() as Element).localName).toBe('strong')
    expect((walker.previousNode() as Element).localName).toBe('span')
    expect(walker.previousNode()).toBe(root)
    expect(walker.previousNode()).toBeNull()
  })

  it('returns the deepest accepted node in the preceding subtree', () => {
    const document = parser.parseFromString(
      '<div><span><strong><em></em></strong></span><p></p></div>',
      'text/html'
    )
    const root = document.body.firstChild!
    const paragraph = root.lastChild!
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT)
    walker.currentNode = paragraph

    expect((walker.previousNode() as Element).localName).toBe('em')
  })

  it('promotes FILTER_SKIP descendants and prunes FILTER_REJECT subtrees', () => {
    const document = parser.parseFromString(
      '<div><section data-filter="skip"><a></a><b></b></section>' +
      '<nav data-filter="reject"><i></i></nav><footer></footer></div>',
      'text/html'
    )
    const root = document.body.firstChild!
    const filter = (node: INode): number => {
      const mode = (node as Element).getAttribute?.('data-filter')
      if (mode === 'skip') return NodeFilter.FILTER_SKIP
      if (mode === 'reject') return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT, filter)

    expect((walker.firstChild() as Element).localName).toBe('a')
    expect((walker.nextSibling() as Element).localName).toBe('b')
    expect((walker.nextSibling() as Element).localName).toBe('footer')
    expect((walker.previousSibling() as Element).localName).toBe('b')

    walker.currentNode = root
    const visited: INode[] = []
    let node: INode | null
    while ((node = walker.nextNode())) visited.push(node)
    expect(elementNames(visited)).toEqual(['a', 'b', 'footer'])
  })

  it('returns promoted logical children rather than their descendants', () => {
    const document = parser.parseFromString(
      '<div><header></header><section data-skip><em><strong></strong></em></section></div>',
      'text/html'
    )
    const root = document.body.firstChild!
    const walker = new TreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      node => (node as Element).hasAttribute?.('data-skip')
        ? NodeFilter.FILTER_SKIP
        : NodeFilter.FILTER_ACCEPT
    )

    expect((walker.lastChild() as Element).localName).toBe('em')
  })

  it('navigates to accepted parents through skipped ancestors', () => {
    const document = parser.parseFromString(
      '<div><section data-skip><article data-skip><p></p></article></section></div>',
      'text/html'
    )
    const root = document.body.firstChild!
    const paragraph = root.firstChild?.firstChild?.firstChild!
    const walker = new TreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      node => (node as Element).hasAttribute?.('data-skip')
        ? NodeFilter.FILTER_SKIP
        : NodeFilter.FILTER_ACCEPT
    )
    walker.currentNode = paragraph

    expect(walker.parentNode()).toBe(root)
    expect(walker.parentNode()).toBeNull()
  })

  it('is available through the Document factory in ESM code', () => {
    const document = parser.parseFromString('<div><p></p></div>', 'text/html')
    const root = document.body.firstChild! as Element
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)

    expect(walker.root).toBe(root)
    expect((walker.nextNode() as Element).localName).toBe('p')
  })

  it('reads sibling pointers without scanning the parent NodeList', () => {
    const parent = new Element('div')
    for (let index = 0; index < 1_000; index++) {
      parent.appendChild(new Element('span'))
    }
    const itemSpy = vi.spyOn(parent.childNodes, 'item')

    let count = 0
    let node = parent.firstChild
    while (node) {
      count++
      node = node.nextSibling
    }

    expect(count).toBe(1_000)
    expect(itemSpy).not.toHaveBeenCalled()
  })

  it('keeps sibling pointers correct across removal and reordering', () => {
    const parent = new Element('div')
    const a = new Element('a')
    const b = new Element('b')
    const c = new Element('c')
    parent.appendChild(a)
    parent.appendChild(b)
    parent.appendChild(c)

    parent.insertBefore(c, a)
    expect(c.previousSibling).toBeNull()
    expect(c.nextSibling).toBe(a)
    expect(a.previousSibling).toBe(c)
    expect(a.nextSibling).toBe(b)

    parent.removeChild(a)
    expect(a.previousSibling).toBeNull()
    expect(a.nextSibling).toBeNull()
    expect(c.nextSibling).toBe(b)
    expect(b.previousSibling).toBe(c)
  })
})
