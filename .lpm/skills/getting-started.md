---
name: getting-started
description: How to import and use neo.dom — DOMParser, Document/Element/Node APIs, DOM manipulation, TreeWalker and NodeIterator traversal with whatToShow filters, serialization, entity handling, auto-closing tags, constants, and TypeScript types
version: "1.0.0"
globs:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.tsx"
  - "**/*.jsx"
---

# Getting Started with @lpm.dev/neo.dom

## Overview

neo.dom is a lightweight (~20KB), zero-dependency, security-focused DOM parser for Node.js. It provides HTML parsing, DOM tree manipulation, and traversal APIs. Designed as the parsing layer for sanitization pipelines (works with `@lpm.dev/neo.sanitize`).

## Parsing HTML

```typescript
import { DOMParser } from '@lpm.dev/neo.dom'

const parser = new DOMParser()
const doc = parser.parseFromString('<div><p>Hello</p></div>', 'text/html')

// Access the parsed tree
const body = doc.body
console.log(body.firstChild.tagName)  // 'DIV'
console.log(body.textContent)         // 'Hello'
```

Only `'text/html'` MIME type is supported. All parsed content goes under `document.body`.

## Creating Nodes

```typescript
const doc = parser.parseFromString('', 'text/html')

const div = doc.createElement('div')
const text = doc.createTextNode('Hello world')
const comment = doc.createComment('this is a comment')
const fragment = doc.createDocumentFragment()

div.appendChild(text)
fragment.appendChild(div)
doc.body.appendChild(fragment)
```

## Node Manipulation

All Node types share these methods:

```typescript
// Append a child
parent.appendChild(child)

// Insert before a reference node
parent.insertBefore(newChild, referenceChild)

// Remove a child
parent.removeChild(child)

// Replace a child
parent.replaceChild(newChild, oldChild)

// Clone (shallow or deep)
const shallow = node.cloneNode()       // Node only, no children
const deep = node.cloneNode(true)      // Node + all descendants
```

### Node properties

```typescript
node.nodeType        // 1 (Element), 3 (Text), 8 (Comment), 9 (Document), 11 (Fragment)
node.nodeName        // Tag name for elements, '#text' for text, '#comment' for comments
node.nodeValue       // Text content for text/comment nodes, null for elements
node.parentNode      // Parent node or null
node.childNodes      // NodeList of children
node.firstChild      // First child or null
node.lastChild       // Last child or null
node.nextSibling     // Next sibling or null
node.previousSibling // Previous sibling or null
node.textContent     // All descendant text concatenated
```

## Element API

```typescript
const div = doc.createElement('div')

// Attributes
div.setAttribute('class', 'container')
div.getAttribute('class')        // 'container'
div.hasAttribute('class')        // true
div.removeAttribute('class')

// Convenience methods
div.remove()                     // Remove from parent
div.replaceWith(otherElement)    // Replace in parent

// innerHTML getter — serializes children to HTML string
const html = div.innerHTML       // '<p>Hello</p>'

// innerHTML setter — creates a TEXT NODE, does NOT parse HTML
div.innerHTML = '<b>bold</b>'    // Creates text node with literal "<b>bold</b>"
```

**Important:** The `innerHTML` setter does not parse HTML. See Anti-patterns for workarounds.

## Traversal

### NodeIterator — flat linear scan

```typescript
import { NodeFilter } from '@lpm.dev/neo.dom'

const iterator = doc.createNodeIterator(
  doc.body,                  // Root node
  NodeFilter.SHOW_ELEMENT,  // What to show (bitmask)
  null                       // Optional custom filter
)

let node
while ((node = iterator.nextNode())) {
  console.log(node.tagName)
}

// Go backward
iterator.previousNode()
```

### TreeWalker — directional navigation

```typescript
const walker = doc.createTreeWalker(
  doc.body,
  NodeFilter.SHOW_ELEMENT,
  (node) => {
    // Custom filter — skip script elements and their children
    if (node.tagName === 'SCRIPT') return NodeFilter.FILTER_REJECT
    return NodeFilter.FILTER_ACCEPT
  }
)

walker.firstChild()       // Navigate to first child element
walker.nextSibling()      // Navigate to next sibling
walker.parentNode()       // Navigate to parent
walker.nextNode()         // Next in document order
walker.previousNode()     // Previous in document order
walker.currentNode        // Current position (readable and writable)
```

### whatToShow bitmask

| Constant | Value | Matches |
|----------|-------|---------|
| `SHOW_ALL` | `0xFFFFFFFF` | All nodes |
| `SHOW_ELEMENT` | `0x1` | Elements only |
| `SHOW_TEXT` | `0x4` | Text nodes only |
| `SHOW_COMMENT` | `0x80` | Comment nodes only |

Combine with bitwise OR: `NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT`

### Filter return values

| Value | TreeWalker | NodeIterator |
|-------|-----------|-------------|
| `FILTER_ACCEPT` | Visit this node | Visit this node |
| `FILTER_SKIP` | Skip node, enter children | Skip node, enter children |
| `FILTER_REJECT` | Skip node **and entire subtree** | Same as SKIP |

## Serialization

```typescript
import { serializeNode, serializeChildren, escapeHTML, escapeAttr } from '@lpm.dev/neo.dom'

// Serialize a node and all descendants to HTML
const html = serializeNode(element)
// '<div class="container"><p>Hello</p></div>'

// Serialize only children (no outer element)
const inner = serializeChildren(element)
// '<p>Hello</p>'

// Escape text content
escapeHTML('1 < 2 & 3 > 0')  // '1 &lt; 2 &amp; 3 &gt; 0'

// Escape attribute values
escapeAttr('say "hello"')     // 'say &quot;hello&quot;'
```

### Serialization normalizations

- Void elements serialize as `<br />` (XHTML-style with space before slash)
- Tag names are lowercased: `<DIV>` → `<div>`
- Attributes are always double-quoted: `class=foo` → `class="foo"`
- Text content is escaped: `&`, `<`, `>` → `&amp;`, `&lt;`, `&gt;`

## Entity Handling

The tokenizer decodes 5 named entities + all numeric entities:

| Entity | Decoded |
|--------|---------|
| `&lt;` | `<` |
| `&gt;` | `>` |
| `&amp;` | `&` |
| `&quot;` | `"` |
| `&#39;` | `'` |
| `&#NNN;` | Character by decimal code point |
| `&#xHHH;` | Character by hex code point |

Other named entities (`&nbsp;`, `&copy;`, `&mdash;`) are **not decoded** — use numeric form instead (`&#160;`, `&#169;`, `&#8212;`).

## Auto-Closing Tags

The parser automatically closes certain tags when encountering specific elements (matching browser behavior for common patterns):

```html
<!-- Input -->
<p>First<p>Second

<!-- Parsed as -->
<p>First</p><p>Second</p>
```

Auto-close rules apply to: `<p>`, `<li>`, `<dt>`/`<dd>`, `<th>`/`<td>`, `<tr>`, `<thead>`/`<tbody>`/`<tfoot>`, `<option>`/`<optgroup>`.

## Constants

```typescript
import { VOID_ELEMENTS, AUTO_CLOSE_TAGS, INLINE_ELEMENTS, BLOCK_ELEMENTS, NodeType } from '@lpm.dev/neo.dom'

VOID_ELEMENTS    // Set: area, br, col, embed, hr, img, input, link, meta, source, track, wbr
NodeType.ELEMENT_NODE          // 1
NodeType.TEXT_NODE             // 3
NodeType.COMMENT_NODE          // 8
NodeType.DOCUMENT_NODE         // 9
NodeType.DOCUMENT_FRAGMENT_NODE // 11
```

## Sub-Path Imports

```typescript
import { DOMParser } from '@lpm.dev/neo.dom/parser'
import { Element, Node, Document } from '@lpm.dev/neo.dom/dom'
import { NodeIterator, TreeWalker, NodeFilter } from '@lpm.dev/neo.dom/traversal'
```
