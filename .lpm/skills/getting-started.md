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

document.documentElement?.nodeName // 'HTML'
document.head?.nodeName            // 'HEAD'
document.body?.innerHTML           // '<p>Hello</p>'
```

The production parser uses `parse5` for HTML5 tokenization and tree construction. It places head content in `document.head`. It places body content in `document.body`. Comments and doctypes can be direct document children.

The parser uses six finite limits. `maxInputLength` limits input size. `maxMarkupStarts` limits less-than (`<`) characters. `maxNodes` limits parsed nodes. `maxOpenElements` limits the transient parser stack. `maxDepth` limits final tree depth. `maxAttributesPerElement` limits attributes on one element.

The defaults are 10 MiB, 250,000 markup starts, 100,000 nodes, 512 open elements, 2,048 final levels, and 1,024 attributes.

The `documentElement`, `head`, and `body` getters track tree mutations. A getter returns `null` when its element is absent.

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

document.body!.appendChild(div)
```

Supported node operations include `appendChild`, `removeChild`, `replaceChild`, `insertBefore`, `cloneNode`, and `textContent`. Supported attribute operations include `getAttribute`, `setAttribute`, `hasAttribute`, and `removeAttribute`.

Mutations reject cycles, invalid parent/child combinations, and invalid structural names. `replaceWith` applies its arguments as one ordered batch.

Inserting a `DocumentFragment` moves all of its children and leaves the fragment empty. HTML names use ASCII-only case conversion.

Structural node metadata is read-only. Tree validation uses canonical metadata if application code shadows a public getter.

Numeric collection access matches `item()` access. Writes to numeric `NodeList` and `NamedNodeMap` properties fail.

`NamedNodeMap.setNamedItem()` validates and copies its input. Changes to the input object do not change the stored attribute.

The `innerHTML` getter serializes children. The setter creates a text node and does not parse markup.

## Traverse nodes

```typescript
import { NodeFilter } from '@lpm.dev/neo.dom'

const iterator = document.createNodeIterator(
  document.body!,
  NodeFilter.SHOW_ELEMENT
)

let node
while ((node = iterator.nextNode())) {
  console.log(node.nodeName)
}
```

Use `TreeWalker` for directional navigation and subtree-pruning filters. Use `NodeIterator` for a linear document-order scan.

`NodeIterator.referenceNode` and `pointerBeforeReference` show the read-only iterator position.
`TreeWalker` promotes descendants of `FILTER_SKIP` nodes and prunes descendants of `FILTER_REJECT` nodes in both traversal directions.

## Known scope

neo.dom does not provide selector queries, events, CSS layout, JavaScript execution, browser globals, or a complete W3C DOM. SVG and MathML elements retain their namespace URI and source casing.

## Imports

```typescript
import { DOMParser } from '@lpm.dev/neo.dom/parser'
import { Document, Element, Node } from '@lpm.dev/neo.dom/dom'
import { NodeIterator, TreeWalker, NodeFilter } from '@lpm.dev/neo.dom/traversal'
```
