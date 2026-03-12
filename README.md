# @lpm.dev/neo.dom

Lightweight, security-focused DOM parser for Node.js. Zero dependencies, full TypeScript support, tree-shakeable.

## Install

```bash
lpm install @lpm.dev/neo.dom
```

## Quick Start

```typescript
import { DOMParser } from '@lpm.dev/neo.dom'

const parser = new DOMParser()
const doc = parser.parseFromString('<p>Hello <strong>world</strong></p>', 'text/html')

console.log(doc.body?.innerHTML)
// '<p>Hello <strong>world</strong></p>'

const p = doc.querySelector('p')
console.log(p?.textContent)
// 'Hello world'
```

## Features

- **Full DOM API** — `Document`, `Element`, `Text`, `Comment`, `DocumentFragment`
- **Parsing** — Parse HTML strings server-side with `DOMParser`
- **Querying** — `querySelector`, `querySelectorAll`, `getElementById`, `getElementsByTagName`, `getElementsByClassName`
- **Traversal** — `NodeIterator` and `TreeWalker` with filter support
- **Security** — XSS protection, mXSS prevention, attribute sanitization
- **Zero dependencies** — no external runtime dependencies
- **TypeScript** — full type declarations included
- **Tree-shakeable** — sub-path exports for each module

## API

### DOMParser

```typescript
import { DOMParser } from '@lpm.dev/neo.dom'

const parser = new DOMParser()
const doc = parser.parseFromString('<html><body><p>Hello</p></body></html>', 'text/html')
```

### Document

```typescript
// Create elements
const div = doc.createElement('div')
const text = doc.createTextNode('Hello')
const comment = doc.createComment('a comment')
const fragment = doc.createDocumentFragment()

// Query
const el = doc.getElementById('my-id')
const els = doc.getElementsByTagName('p')
const cls = doc.getElementsByClassName('my-class')
const found = doc.querySelector('.selector')
const all = doc.querySelectorAll('p, div')
```

### Element

```typescript
// Attributes
el.getAttribute('href')
el.setAttribute('class', 'active')
el.removeAttribute('disabled')
el.hasAttribute('hidden')
el.toggleAttribute('checked')

// Content
el.innerHTML = '<span>new content</span>'
el.textContent = 'plain text'
console.log(el.outerHTML)

// ClassList
el.classList.add('foo')
el.classList.remove('bar')
el.classList.toggle('active')
el.classList.contains('foo')   // true

// Query
el.matches('.selector')
el.closest('.parent')
el.querySelector('span')
el.querySelectorAll('span')
```

### Node

```typescript
// Manipulation
parent.appendChild(child)
parent.insertBefore(newNode, referenceNode)
parent.removeChild(child)
parent.replaceChild(newNode, oldNode)
node.cloneNode(true)   // deep clone
node.contains(other)
node.normalize()       // merge adjacent text nodes
```

### NodeIterator

```typescript
import { DOMParser, NodeFilter } from '@lpm.dev/neo.dom'

const doc = new DOMParser().parseFromString('<div><p>one</p><p>two</p></div>', 'text/html')

const iter = doc.createNodeIterator(
  doc,
  NodeFilter.SHOW_ELEMENT,
  (node) => node.nodeName === 'P' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
)

let node
while ((node = iter.nextNode())) {
  console.log(node.textContent)
}
// 'one'
// 'two'
```

### TreeWalker

```typescript
import { DOMParser, NodeFilter } from '@lpm.dev/neo.dom'

const doc = new DOMParser().parseFromString('<div><p>one</p><p>two</p></div>', 'text/html')

const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT)

walker.firstChild()                   // <html>
walker.nextNode()                     // <head>
walker.nextSibling()                  // <body>
console.log(walker.currentNode.nodeName)  // 'BODY'
```

### Sub-path Imports

```typescript
// Parser only
import { DOMParser } from '@lpm.dev/neo.dom/parser'

// DOM classes only
import { Document, Element, Node } from '@lpm.dev/neo.dom/dom'

// Traversal only
import { NodeIterator, TreeWalker, NodeFilter } from '@lpm.dev/neo.dom/traversal'
```

## Node Types

```typescript
import { NodeType } from '@lpm.dev/neo.dom'

NodeType.ELEMENT_NODE           // 1
NodeType.TEXT_NODE              // 3
NodeType.COMMENT_NODE           // 8
NodeType.DOCUMENT_NODE          // 9
NodeType.DOCUMENT_FRAGMENT_NODE // 11
```

## NodeFilter Constants

```typescript
import { NodeFilter } from '@lpm.dev/neo.dom'

NodeFilter.SHOW_ALL       // 0xFFFFFFFF
NodeFilter.SHOW_ELEMENT   // 0x1
NodeFilter.SHOW_TEXT      // 0x4
NodeFilter.FILTER_ACCEPT  // 1
NodeFilter.FILTER_REJECT  // 2
NodeFilter.FILTER_SKIP    // 3
```

## Security

`@lpm.dev/neo.dom` includes built-in XSS protection:

- Script tags and `javascript:` URLs are neutralized during parsing
- Event handler attributes (`onclick`, `onerror`, etc.) are sanitized
- mXSS (mutation-based XSS) attacks are prevented
- Malformed HTML is handled safely

## License

MIT
