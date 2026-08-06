---
name: getting-started
description: How to parse HTML with neo.dom, inspect the HTML/head/body document structure, manipulate the supported DOM subset, traverse nodes, and serialize content safely
version: "1.0.0"
globs:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.tsx"
  - "**/*.jsx"
---

# Get started with @lpm.dev/neo.dom

## Parse HTML

```typescript
import { DOMParser } from '@lpm.dev/neo.dom'

const parser = new DOMParser()
const document = parser.parseFromString('<p>Hello</p>', 'text/html')

document.documentElement.nodeName // 'HTML'
document.head.nodeName            // 'HEAD'
document.body.innerHTML           // '<p>Hello</p>'
```

The production parser uses `parse5` for HTML5 tokenization and tree construction. Head content is placed in `document.head`; body content is placed in `document.body`; comments and doctypes can be direct document children.

The default parser limits are 10 MiB of input, 100,000 nodes, 2,048 levels, and 1,024 attributes per element. Pass `maxInputLength`, `maxNodes`, `maxDepth`, or `maxAttributesPerElement` to the `DOMParser` constructor to use tighter application limits.

## Security contract

neo.dom is not a sanitizer. It preserves scripts, event-handler attributes, dangerous URLs, CSS, and data URLs. Parsing does not execute scripts, but serialized untrusted output must pass through a dedicated allowlist sanitizer before browser insertion.

## Create and manipulate nodes

```typescript
const div = document.createElement('div')
const text = document.createTextNode('Hello')
const comment = document.createComment('note')

div.setAttribute('class', 'container')
div.appendChild(text)
div.insertBefore(comment, text)
div.removeChild(comment)

document.body.appendChild(div)
```

Supported node operations include `appendChild`, `removeChild`, `replaceChild`, `insertBefore`, `cloneNode`, and `textContent`. Supported attribute operations include `getAttribute`, `setAttribute`, `hasAttribute`, and `removeAttribute`.

Mutations reject cycles and invalid parent/child combinations. Inserting a `DocumentFragment` moves all of its children and leaves the fragment empty.

The `innerHTML` getter serializes children. The setter creates a text node and does not parse markup.

## Traverse nodes

```typescript
import { NodeFilter } from '@lpm.dev/neo.dom'

const iterator = document.createNodeIterator(
  document.body,
  NodeFilter.SHOW_ELEMENT
)

let node
while ((node = iterator.nextNode())) {
  console.log(node.nodeName)
}
```

Use `TreeWalker` for directional navigation and subtree-pruning filters. Use `NodeIterator` for a linear document-order scan.
`TreeWalker` promotes descendants of `FILTER_SKIP` nodes and prunes descendants of `FILTER_REJECT` nodes in both traversal directions.

## Known scope

neo.dom does not provide selector queries, events, CSS layout, JavaScript execution, browser globals, or a complete W3C DOM. SVG and MathML elements retain their namespace URI and source casing.

## Imports

```typescript
import { DOMParser } from '@lpm.dev/neo.dom/parser'
import { Document, Element, Node } from '@lpm.dev/neo.dom/dom'
import { NodeIterator, TreeWalker, NodeFilter } from '@lpm.dev/neo.dom/traversal'
```
