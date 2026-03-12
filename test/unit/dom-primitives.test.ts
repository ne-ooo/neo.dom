/**
 * DOM Primitives Tests
 *
 * Tests for Text, Comment, DocumentFragment, Document creation methods,
 * Node manipulation (appendChild, removeChild, replaceChild, insertBefore, cloneNode),
 * and NodeType constants.
 */

import { describe, it, expect } from 'vitest'
import { Node, Text, Comment, DocumentFragment, Document, Element, NodeType } from '../../src/index.js'

// ─── NodeType constants ──────────────────────────────────────────────────────

describe('NodeType constants', () => {
  it('ELEMENT_NODE is 1', () => {
    expect(NodeType.ELEMENT_NODE).toBe(1)
  })

  it('TEXT_NODE is 3', () => {
    expect(NodeType.TEXT_NODE).toBe(3)
  })

  it('COMMENT_NODE is 8', () => {
    expect(NodeType.COMMENT_NODE).toBe(8)
  })

  it('DOCUMENT_NODE is 9', () => {
    expect(NodeType.DOCUMENT_NODE).toBe(9)
  })

  it('DOCUMENT_FRAGMENT_NODE is 11', () => {
    expect(NodeType.DOCUMENT_FRAGMENT_NODE).toBe(11)
  })
})

// ─── Text node ───────────────────────────────────────────────────────────────

describe('Text node', () => {
  it('has nodeType TEXT_NODE', () => {
    const t = new Text('hello')
    expect(t.nodeType).toBe(NodeType.TEXT_NODE)
  })

  it('has nodeName "#text"', () => {
    const t = new Text('hello')
    expect(t.nodeName).toBe('#text')
  })

  it('stores text in data property', () => {
    const t = new Text('hello world')
    expect(t.data).toBe('hello world')
  })

  it('nodeValue equals the text content', () => {
    const t = new Text('foo')
    expect(t.nodeValue).toBe('foo')
  })

  it('setting nodeValue updates data', () => {
    const t = new Text('original')
    t.nodeValue = 'changed'
    expect(t.data).toBe('changed')
  })

  it('setting nodeValue to null sets data to empty string', () => {
    const t = new Text('original')
    t.nodeValue = null
    expect(t.data).toBe('')
  })

  it('textContent returns the text', () => {
    const t = new Text('content')
    expect(t.textContent).toBe('content')
  })

  it('starts with no parent', () => {
    const t = new Text('hello')
    expect(t.parentNode).toBeNull()
  })

  it('starts with no children', () => {
    const t = new Text('hello')
    expect(t.childNodes.length).toBe(0)
    expect(t.firstChild).toBeNull()
    expect(t.lastChild).toBeNull()
  })
})

// ─── Comment node ────────────────────────────────────────────────────────────

describe('Comment node', () => {
  it('has nodeType COMMENT_NODE', () => {
    const c = new Comment('my comment')
    expect(c.nodeType).toBe(NodeType.COMMENT_NODE)
  })

  it('has nodeName "#comment"', () => {
    const c = new Comment('my comment')
    expect(c.nodeName).toBe('#comment')
  })

  it('stores text in data property', () => {
    const c = new Comment('this is a comment')
    expect(c.data).toBe('this is a comment')
  })

  it('nodeValue equals the comment data', () => {
    const c = new Comment('comment text')
    expect(c.nodeValue).toBe('comment text')
  })

  it('setting nodeValue updates data', () => {
    const c = new Comment('old')
    c.nodeValue = 'new'
    expect(c.data).toBe('new')
  })

  it('setting nodeValue to null sets data to empty string', () => {
    const c = new Comment('data')
    c.nodeValue = null
    expect(c.data).toBe('')
  })

  it('works with empty string comment', () => {
    const c = new Comment('')
    expect(c.data).toBe('')
  })
})

// ─── DocumentFragment ────────────────────────────────────────────────────────

describe('DocumentFragment', () => {
  it('has nodeType DOCUMENT_FRAGMENT_NODE', () => {
    const frag = new DocumentFragment()
    expect(frag.nodeType).toBe(NodeType.DOCUMENT_FRAGMENT_NODE)
  })

  it('has nodeName "#document-fragment"', () => {
    const frag = new DocumentFragment()
    expect(frag.nodeName).toBe('#document-fragment')
  })

  it('starts empty', () => {
    const frag = new DocumentFragment()
    expect(frag.childNodes.length).toBe(0)
    expect(frag.firstChild).toBeNull()
  })

  it('can have children appended', () => {
    const frag = new DocumentFragment()
    const el = new Element('p')
    frag.appendChild(el)
    expect(frag.childNodes.length).toBe(1)
    expect(frag.firstChild).toBe(el)
  })

  it('children property returns only element nodes', () => {
    const frag = new DocumentFragment()
    const el = new Element('div')
    const text = new Text('hello')
    frag.appendChild(el)
    frag.appendChild(text)
    expect(frag.children.length).toBe(1)
    expect(frag.children[0]).toBe(el)
  })

  it('can hold multiple elements', () => {
    const frag = new DocumentFragment()
    frag.appendChild(new Element('p'))
    frag.appendChild(new Element('span'))
    expect(frag.childNodes.length).toBe(2)
  })
})

// ─── Document creation methods ───────────────────────────────────────────────

describe('Document creation methods', () => {
  it('createTextNode creates a Text node', () => {
    const doc = new Document()
    const t = doc.createTextNode('hello')
    expect(t.nodeType).toBe(NodeType.TEXT_NODE)
    expect(t.data).toBe('hello')
  })

  it('createElement creates an Element with the given tag name', () => {
    const doc = new Document()
    const el = doc.createElement('div')
    expect(el.nodeType).toBe(NodeType.ELEMENT_NODE)
    expect(el.nodeName.toLowerCase()).toBe('div')
  })

  it('createComment creates a Comment node', () => {
    const doc = new Document()
    const c = doc.createComment('my comment')
    expect(c.nodeType).toBe(NodeType.COMMENT_NODE)
    expect(c.data).toBe('my comment')
  })

  it('createDocumentFragment creates a DocumentFragment', () => {
    const doc = new Document()
    const frag = doc.createDocumentFragment()
    expect(frag.nodeType).toBe(NodeType.DOCUMENT_FRAGMENT_NODE)
  })

  it('document body is an element', () => {
    const doc = new Document()
    expect(doc.body).toBeDefined()
    expect(doc.body.nodeType).toBe(NodeType.ELEMENT_NODE)
  })

  it('document documentElement returns an element', () => {
    const doc = new Document()
    expect(doc.documentElement).toBeDefined()
    expect(doc.documentElement.nodeType).toBe(NodeType.ELEMENT_NODE)
  })
})

// ─── Node manipulation ────────────────────────────────────────────────────────

describe('Node.appendChild', () => {
  it('adds child to parent', () => {
    const parent = new Element('div')
    const child = new Element('span')
    parent.appendChild(child)
    expect(parent.childNodes.length).toBe(1)
    expect(parent.firstChild).toBe(child)
  })

  it('sets parentNode on the child', () => {
    const parent = new Element('div')
    const child = new Element('span')
    parent.appendChild(child)
    expect(child.parentNode).toBe(parent)
  })

  it('appends multiple children in order', () => {
    const parent = new Element('div')
    const c1 = new Element('p')
    const c2 = new Element('span')
    parent.appendChild(c1)
    parent.appendChild(c2)
    expect(parent.childNodes.length).toBe(2)
    expect(parent.firstChild).toBe(c1)
    expect(parent.lastChild).toBe(c2)
  })

  it('moves child from previous parent when re-appended', () => {
    const parent1 = new Element('div')
    const parent2 = new Element('section')
    const child = new Element('p')
    parent1.appendChild(child)
    parent2.appendChild(child)
    expect(parent1.childNodes.length).toBe(0)
    expect(parent2.childNodes.length).toBe(1)
    expect(child.parentNode).toBe(parent2)
  })
})

describe('Node.removeChild', () => {
  it('removes the child from parent', () => {
    const parent = new Element('div')
    const child = new Element('span')
    parent.appendChild(child)
    parent.removeChild(child)
    expect(parent.childNodes.length).toBe(0)
  })

  it('sets parentNode to null on removed child', () => {
    const parent = new Element('div')
    const child = new Element('span')
    parent.appendChild(child)
    parent.removeChild(child)
    expect(child.parentNode).toBeNull()
  })

  it('throws when child is not in parent', () => {
    const parent = new Element('div')
    const orphan = new Element('span')
    expect(() => parent.removeChild(orphan)).toThrow('Node not found')
  })
})

describe('Node.replaceChild', () => {
  it('replaces old child with new child', () => {
    const parent = new Element('div')
    const oldChild = new Element('p')
    const newChild = new Element('span')
    parent.appendChild(oldChild)
    parent.replaceChild(newChild, oldChild)
    expect(parent.firstChild).toBe(newChild)
    expect(parent.childNodes.length).toBe(1)
  })

  it('clears parentNode on old child', () => {
    const parent = new Element('div')
    const oldChild = new Element('p')
    const newChild = new Element('span')
    parent.appendChild(oldChild)
    parent.replaceChild(newChild, oldChild)
    expect(oldChild.parentNode).toBeNull()
  })

  it('sets parentNode on new child', () => {
    const parent = new Element('div')
    const oldChild = new Element('p')
    const newChild = new Element('span')
    parent.appendChild(oldChild)
    parent.replaceChild(newChild, oldChild)
    expect(newChild.parentNode).toBe(parent)
  })

  it('throws when old child not found', () => {
    const parent = new Element('div')
    const newChild = new Element('span')
    const orphan = new Element('p')
    expect(() => parent.replaceChild(newChild, orphan)).toThrow('Node not found')
  })
})

describe('Node.insertBefore', () => {
  it('inserts before the reference node', () => {
    const parent = new Element('div')
    const existing = new Element('p')
    const newNode = new Element('span')
    parent.appendChild(existing)
    parent.insertBefore(newNode, existing)
    expect(parent.firstChild).toBe(newNode)
    expect(parent.childNodes.length).toBe(2)
  })

  it('insertBefore(node, null) appends to end', () => {
    const parent = new Element('div')
    const c1 = new Element('p')
    const c2 = new Element('span')
    parent.appendChild(c1)
    parent.insertBefore(c2, null)
    expect(parent.lastChild).toBe(c2)
  })

  it('throws when refNode not found', () => {
    const parent = new Element('div')
    const newNode = new Element('span')
    const orphan = new Element('p')
    expect(() => parent.insertBefore(newNode, orphan)).toThrow('Reference node not found')
  })

  it('sets parentNode on inserted node', () => {
    const parent = new Element('div')
    const existing = new Element('p')
    const newNode = new Element('span')
    parent.appendChild(existing)
    parent.insertBefore(newNode, existing)
    expect(newNode.parentNode).toBe(parent)
  })
})

describe('Node.cloneNode', () => {
  it('shallow clone does not include children', () => {
    const parent = new Element('div')
    parent.appendChild(new Element('span'))
    const clone = parent.cloneNode(false)
    expect(clone.childNodes.length).toBe(0)
  })

  it('deep clone includes children recursively', () => {
    const parent = new Element('div')
    const child = new Element('span')
    child.appendChild(new Text('hello'))
    parent.appendChild(child)
    const clone = parent.cloneNode(true)
    expect(clone.childNodes.length).toBe(1)
    expect(clone.firstChild?.firstChild?.textContent).toBe('hello')
  })

  it('clone has same nodeType and nodeName', () => {
    const node = new Text('content')
    const clone = node.cloneNode(false)
    expect(clone.nodeType).toBe(NodeType.TEXT_NODE)
    expect(clone.nodeName).toBe('#text')
  })

  it('clone has no parentNode', () => {
    const parent = new Element('div')
    const child = new Element('span')
    parent.appendChild(child)
    const clone = child.cloneNode(false)
    expect(clone.parentNode).toBeNull()
  })
})

// ─── Node sibling navigation ──────────────────────────────────────────────────

describe('Node sibling navigation', () => {
  it('nextSibling returns null for only child', () => {
    const parent = new Element('div')
    const child = new Element('p')
    parent.appendChild(child)
    expect(child.nextSibling).toBeNull()
  })

  it('nextSibling returns the next sibling', () => {
    const parent = new Element('div')
    const c1 = new Element('p')
    const c2 = new Element('span')
    parent.appendChild(c1)
    parent.appendChild(c2)
    expect(c1.nextSibling).toBe(c2)
  })

  it('previousSibling returns null for first child', () => {
    const parent = new Element('div')
    const c1 = new Element('p')
    const c2 = new Element('span')
    parent.appendChild(c1)
    parent.appendChild(c2)
    expect(c1.previousSibling).toBeNull()
  })

  it('previousSibling returns the previous sibling', () => {
    const parent = new Element('div')
    const c1 = new Element('p')
    const c2 = new Element('span')
    parent.appendChild(c1)
    parent.appendChild(c2)
    expect(c2.previousSibling).toBe(c1)
  })

  it('returns null for nextSibling/previousSibling when no parent', () => {
    const orphan = new Element('p')
    expect(orphan.nextSibling).toBeNull()
    expect(orphan.previousSibling).toBeNull()
  })
})

// ─── Node.textContent ────────────────────────────────────────────────────────

describe('Node.textContent', () => {
  it('returns concatenated text of all text descendants', () => {
    const div = new Element('div')
    const p = new Element('p')
    p.appendChild(new Text('Hello '))
    p.appendChild(new Text('world'))
    div.appendChild(p)
    expect(div.textContent).toBe('Hello world')
  })

  it('setting textContent removes all children and adds text node', () => {
    const div = new Element('div')
    div.appendChild(new Element('span'))
    div.textContent = 'plain text'
    expect(div.childNodes.length).toBe(1)
    expect(div.textContent).toBe('plain text')
  })

  it('setting textContent to null removes all children', () => {
    const div = new Element('div')
    div.appendChild(new Text('something'))
    div.textContent = null
    expect(div.childNodes.length).toBe(0)
  })

  it('setting textContent to empty string removes all children', () => {
    const div = new Element('div')
    div.appendChild(new Text('something'))
    div.textContent = ''
    expect(div.childNodes.length).toBe(0)
  })
})
