/**
 * Tests for NodeIterator
 */

import { describe, it, expect } from 'vitest'
import { DOMParser } from '../../src/parser/parser.js'
import { NodeIterator } from '../../src/traversal/iterator.js'
import { NodeFilter, NodeType } from '../../src/utils/constants.js'
import type { Node as INode } from '../../src/types.js'

describe('NodeIterator', () => {
  const parser = new DOMParser()

  describe('Basic iteration', () => {
    it('should iterate through all nodes', () => {
      const doc = parser.parseFromString('<div><p>Text</p></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ALL, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include: div, p, text
      expect(nodes.length).toBe(3)
      expect((nodes[0] as any).tagName.toLowerCase()).toBe('div')
      expect((nodes[1] as any).tagName.toLowerCase()).toBe('p')
      expect(nodes[2].nodeType).toBe(NodeType.TEXT_NODE)
    })

    it('should iterate through nested structure', () => {
      const doc = parser.parseFromString('<div><ul><li>A</li><li>B</li></ul></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ALL, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include: div, ul, li, text 'A', li, text 'B'
      expect(nodes.length).toBe(6)
    })

    it('should return null when iteration is complete', () => {
      const doc = parser.parseFromString('<p>Text</p>', 'text/html')
      const root = doc.body.firstChild! // p
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ALL, null)

      // Exhaust the iterator
      while (iterator.nextNode()) {
        // keep iterating
      }

      // Should return null after completion
      expect(iterator.nextNode()).toBeNull()
    })
  })

  describe('whatToShow filtering', () => {
    it('should show only element nodes', () => {
      const doc = parser.parseFromString('<div><p>Text</p><span>More</span></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include: div, p, span (no text nodes)
      expect(nodes.length).toBe(3)
      expect(nodes.every(n => n.nodeType === NodeType.ELEMENT_NODE)).toBe(true)
    })

    it('should show only text nodes', () => {
      const doc = parser.parseFromString('<div><p>First</p><span>Second</span></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_TEXT, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include: 'First', 'Second' (no elements)
      expect(nodes.length).toBe(2)
      expect(nodes.every(n => n.nodeType === NodeType.TEXT_NODE)).toBe(true)
      expect(nodes[0].nodeValue).toBe('First')
      expect(nodes[1].nodeValue).toBe('Second')
    })

    it('should show only comment nodes', () => {
      const doc = parser.parseFromString('<div><!-- comment 1 --><p>Text</p><!-- comment 2 --></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_COMMENT, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include: comment 1, comment 2 (no elements or text)
      expect(nodes.length).toBe(2)
      expect(nodes.every(n => n.nodeType === NodeType.COMMENT_NODE)).toBe(true)
      expect(nodes[0].nodeValue).toBe(' comment 1 ')
      expect(nodes[1].nodeValue).toBe(' comment 2 ')
    })

    it('should show all nodes with SHOW_ALL', () => {
      const doc = parser.parseFromString('<div>Text<!-- comment --><p>Para</p></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ALL, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include: div, text, comment, p, text 'Para'
      expect(nodes.length).toBe(5)
    })
  })

  describe('Custom filter callback', () => {
    it('should filter nodes with custom callback', () => {
      const doc = parser.parseFromString('<div><p>Keep</p><span>Remove</span><p>Keep</p></div>', 'text/html')
      const root = doc.body.firstChild! // div

      // Filter to keep div and <p> elements (reject span)
      const filter = (node: INode) => {
        if (node.nodeType === NodeType.ELEMENT_NODE) {
          const tagName = (node as any).tagName.toLowerCase()
          return tagName === 'div' || tagName === 'p' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }

      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, filter)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include: div, p, p (no span)
      expect(nodes.length).toBe(3)
      expect((nodes[0] as any).tagName.toLowerCase()).toBe('div')
      expect((nodes[1] as any).tagName.toLowerCase()).toBe('p')
      expect((nodes[2] as any).tagName.toLowerCase()).toBe('p')
    })

    it('should filter text nodes with custom callback', () => {
      const doc = parser.parseFromString('<div><p>Short</p><p>This is a longer text that is more than 15 chars</p></div>', 'text/html')
      const root = doc.body.firstChild! // div

      // Filter to only keep text nodes longer than 15 characters
      const filter = (node: INode) => {
        if (node.nodeType === NodeType.TEXT_NODE) {
          const length = (node.nodeValue || '').length
          return length > 15 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }

      const iterator = new NodeIterator(root, NodeFilter.SHOW_TEXT, filter)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should only include the longer text node
      expect(nodes.length).toBe(1)
      expect(nodes[0].nodeValue).toBe('This is a longer text that is more than 15 chars')
    })

    it('should handle filter returning FILTER_REJECT', () => {
      const doc = parser.parseFromString('<div><p>One</p><span>Two</span><p>Three</p></div>', 'text/html')
      const root = doc.body.firstChild! // div

      // Reject all span elements
      const filter = (node: INode) => {
        if (node.nodeType === NodeType.ELEMENT_NODE) {
          const tagName = (node as any).tagName.toLowerCase()
          return tagName === 'span' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        }
        return NodeFilter.FILTER_ACCEPT
      }

      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, filter)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include div, p, p (not span)
      const tagNames = nodes.map(n => (n as any).tagName.toLowerCase())
      expect(tagNames).toEqual(['div', 'p', 'p'])
      expect(tagNames).not.toContain('span')
    })
  })

  describe('previousNode', () => {
    it('should iterate backwards', () => {
      const doc = parser.parseFromString('<div><p>A</p><p>B</p><p>C</p></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, null)

      // First, go forward to the end
      const forward: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        forward.push(node)
      }

      // Then go backward
      const backward: INode[] = []
      while ((node = iterator.previousNode())) {
        backward.push(node)
      }

      // Should be reverse order (excluding the last position)
      expect(backward.length).toBeGreaterThan(0)
      expect((backward[0] as any).tagName.toLowerCase()).toBe('p') // Last p
      expect((backward[backward.length - 1] as any).tagName.toLowerCase()).toBe('div') // div
    })

    it('should return null at beginning', () => {
      const doc = parser.parseFromString('<div><p>Text</p></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, null)

      // Iterate forward once to start
      iterator.nextNode() // div

      // Go backward - should return null (can't go before root)
      expect(iterator.previousNode()).toBeNull()
    })

    it('should alternate between nextNode and previousNode', () => {
      const doc = parser.parseFromString('<div><p>A</p><p>B</p></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, null)

      const node1 = iterator.nextNode() // div
      expect((node1 as any).tagName.toLowerCase()).toBe('div')

      const node2 = iterator.nextNode() // p 'A'
      expect((node2 as any).tagName.toLowerCase()).toBe('p')

      const node3 = iterator.previousNode() // back to div
      expect((node3 as any).tagName.toLowerCase()).toBe('div')

      const node4 = iterator.nextNode() // forward to p 'A' again
      expect((node4 as any).tagName.toLowerCase()).toBe('p')
    })
  })

  describe('Document order', () => {
    it('should traverse in correct document order', () => {
      const doc = parser.parseFromString(`
        <div>
          <header>
            <h1>Title</h1>
          </header>
          <main>
            <p>Para 1</p>
            <p>Para 2</p>
          </main>
          <footer>
            <span>Footer</span>
          </footer>
        </div>
      `, 'text/html')
      const root = doc.body.firstChild! // div (skip text node)
      const iterator = new NodeIterator(root.nodeType === NodeType.TEXT_NODE ? root.nextSibling! : root, NodeFilter.SHOW_ELEMENT, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      const tagNames = nodes.map(n => (n as any).tagName.toLowerCase())

      // Should be in document order
      expect(tagNames[0]).toBe('div')
      expect(tagNames[1]).toBe('header')
      expect(tagNames[2]).toBe('h1')
      expect(tagNames[3]).toBe('main')
      expect(tagNames[4]).toBe('p')
      expect(tagNames[5]).toBe('p')
      expect(tagNames[6]).toBe('footer')
      expect(tagNames[7]).toBe('span')
    })

    it('should handle deep nesting correctly', () => {
      const doc = parser.parseFromString('<div><a><b><c><d>Text</d></c></b></a></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      const tagNames = nodes.map(n => (n as any).tagName.toLowerCase())
      expect(tagNames).toEqual(['div', 'a', 'b', 'c', 'd'])
    })
  })

  describe('Edge cases', () => {
    it('should handle single node', () => {
      const doc = parser.parseFromString('<p>Solo</p>', 'text/html')
      const root = doc.body.firstChild! // p
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ALL, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include: p, text 'Solo'
      expect(nodes.length).toBe(2)
    })

    it('should handle node with no children', () => {
      const doc = parser.parseFromString('<div></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should only include the div itself
      expect(nodes.length).toBe(1)
      expect((nodes[0] as any).tagName.toLowerCase()).toBe('div')
    })

    it('should handle mixed content types', () => {
      const doc = parser.parseFromString('<div>Text 1<!-- comment --><p>Text 2</p>Text 3</div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ALL, null)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      const types = nodes.map(n => n.nodeType)
      expect(types).toContain(NodeType.ELEMENT_NODE)
      expect(types).toContain(NodeType.TEXT_NODE)
      expect(types).toContain(NodeType.COMMENT_NODE)
    })

    it('should handle filter that accepts nothing', () => {
      const doc = parser.parseFromString('<div><p>Text</p></div>', 'text/html')
      const root = doc.body.firstChild! // div

      // Filter that rejects everything
      const filter = (node: INode) => {
        return NodeFilter.FILTER_REJECT
      }

      const iterator = new NodeIterator(root, NodeFilter.SHOW_ALL, filter)

      const nodes: INode[] = []
      let node: INode | null
      while ((node = iterator.nextNode())) {
        nodes.push(node)
      }

      // Should include nothing (all rejected)
      expect(nodes.length).toBe(0)
    })
  })

  describe('Root element', () => {
    it('should include root in iteration', () => {
      const doc = parser.parseFromString('<div><p>Child</p></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, null)

      const firstNode = iterator.nextNode()
      expect((firstNode as any).tagName.toLowerCase()).toBe('div')
    })

    it('should not go above root with previousNode', () => {
      const doc = parser.parseFromString('<div><p>Text</p></div>', 'text/html')
      const root = doc.body.firstChild! // div
      const iterator = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, null)

      iterator.nextNode() // div

      // Try to go before root
      const beforeRoot = iterator.previousNode()
      expect(beforeRoot).toBeNull()
    })
  })
})
