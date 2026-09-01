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

  it('finds the previous accepted node without scanning the preceding subtree', () => {
    const root = new Element('div')
    const preceding = new Element('section')
    const current = new Element('p')
    for (let index = 0; index < 50_000; index++) {
      preceding.appendChild(new Element('i'))
    }
    root.appendChild(preceding)
    root.appendChild(current)

    const filter = vi.fn(() => NodeFilter.FILTER_ACCEPT)
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT, filter)
    walker.currentNode = current

    expect(walker.previousNode()).toBe(preceding.lastChild)
    expect(filter).toHaveBeenCalledTimes(2)
  })

  it('walks backward through rejected and skipped rightmost branches', () => {
    const document = parser.parseFromString(
      '<div><section><a></a><aside data-reject><b></b></aside><nav data-skip><em></em></nav></section><p></p></div>',
      'text/html'
    )
    const root = document.body.firstChild!
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT, node => {
      const element = node as Element
      if (element.hasAttribute?.('data-reject')) return NodeFilter.FILTER_REJECT
      if (element.hasAttribute?.('data-skip')) return NodeFilter.FILTER_SKIP
      return NodeFilter.FILTER_ACCEPT
    })
    walker.currentNode = root.lastChild!

    expect((walker.previousNode() as Element).localName).toBe('em')
    expect((walker.previousNode() as Element).localName).toBe('a')
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
    expect(Reflect.defineProperty(parent.childNodes, 'item', {
      value: () => null,
    })).toBe(false)

    let count = 0
    let node = parent.firstChild
    while (node) {
      count++
      node = node.nextSibling
    }

    expect(count).toBe(1_000)
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

  it('uses canonical tree links when public structural getters are shadowed', () => {
    const root = new Element('root')
    const first = new Element('first')
    const nested = new Element('nested')
    const second = new Element('second')
    first.appendChild(nested)
    root.appendChild(first)
    root.appendChild(second)

    Object.defineProperties(root, {
      firstChild: { value: second, configurable: true },
      nodeType: { value: 3, configurable: true },
    })
    Object.defineProperties(first, {
      parentNode: { value: null, configurable: true },
      firstChild: { value: null, configurable: true },
      nextSibling: { value: null, configurable: true },
    })
    Object.defineProperties(nested, {
      parentNode: { value: null, configurable: true },
      previousSibling: { value: second, configurable: true },
    })

    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT)
    expect(walker.firstChild()).toBe(first)
    expect(walker.firstChild()).toBe(nested)
    expect(walker.parentNode()).toBe(first)
    expect(walker.nextSibling()).toBe(second)
  })
})
