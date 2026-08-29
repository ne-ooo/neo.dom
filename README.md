# @lpm.dev/neo.dom

HTML5-compliant HTML parsing and a focused DOM implementation for Node.js. `parse5` powers parsing. The package provides ESM, CommonJS, and TypeScript declarations.

## Install

```bash
lpm install @lpm.dev/neo.dom
```

## Quick start

```typescript
import { DOMParser } from '@lpm.dev/neo.dom'

const doc = new DOMParser().parseFromString(
  '<p>Hello <strong>world</strong></p>',
  'text/html'
)

console.log(doc.body?.innerHTML)
// '<p>Hello <strong>world</strong></p>'

console.log(doc.body?.firstChild?.textContent)
// 'Hello world'
```

## Parsing behavior

`DOMParser` follows HTML5 tokenization and tree-construction rules. It creates an `HTML` document element with `HEAD` and `BODY` children, applies browser-style error recovery, decodes HTML character references, and tracks HTML, SVG, and MathML namespaces.

```typescript
const doc = new DOMParser().parseFromString(
  '<!doctype html><html><head><title>T</title></head><body><p>x</p></body></html>',
  'text/html'
)

doc.documentElement?.nodeName // 'HTML'
doc.head?.nodeName            // 'HEAD'
doc.body?.nodeName            // 'BODY'
```

Comments and doctypes can be direct document children. HTML parsing rules can place `title`, `meta`, `style`, and `script` elements in the head.

The `documentElement`, `head`, and `body` getters track the current tree. A getter returns `null` when its element is absent.

### Resource limits

`DOMParser` uses six finite limits. It checks `maxInputLength` and `maxMarkupStarts` before parsing. `maxMarkupStarts` counts less-than (`<`) characters.

During parsing, it enforces `maxNodes`, `maxOpenElements`, and `maxAttributesPerElement`. After parsing, `maxDepth` checks the final tree only.

The input limit is 10 MiB by default. The markup-start limit is 250,000. The node limit is 100,000. The open-element limit is 512. The final depth limit is 2,048. Each element allows 1,024 attributes.

A limit violation throws a descriptive `RangeError`.

```typescript
const parser = new DOMParser({
  maxInputLength: 1_000_000,
  maxMarkupStarts: 50_000,
  maxNodes: 20_000,
  maxOpenElements: 256,
  maxDepth: 512,
  maxAttributesPerElement: 256,
})
```

Set smaller limits for endpoints with tighter request budgets. Increase a limit only when trusted input requires it.

## Supported DOM subset

```typescript
const element = doc.createElement('div')
const text = doc.createTextNode('Hello')
const comment = doc.createComment('note')
const fragment = doc.createDocumentFragment()

element.setAttribute('class', 'active')
element.getAttribute('class')
element.hasAttribute('class')
element.removeAttribute('class')

element.appendChild(text)
element.insertBefore(comment, text)
element.removeChild(comment)
element.cloneNode(true)

console.log(element.textContent)
console.log(element.innerHTML)
```

Tree mutations reject cycles, invalid child types, and invalid structural names. `replaceWith` applies all replacements as one ordered batch.

Inserting a `DocumentFragment` moves its children into the target and empties the fragment. HTML names use ASCII-only case conversion. SVG and MathML names preserve case.

Structural node metadata is read-only. Tree validation uses canonical metadata even if application code shadows a public getter.

Numeric `NodeList` and `NamedNodeMap` access matches `item()` access. Writes to numeric collection properties fail.

`NamedNodeMap.setNamedItem()` validates and copies its input. Later changes to the input object do not change the stored attribute.

This is not a full browser DOM. It does not implement CSS selectors, events, layout, script execution, stylesheets, or browser globals. The `innerHTML` setter creates a text node. It does not parse its input.

## Traversal

```typescript
import { DOMParser, NodeFilter } from '@lpm.dev/neo.dom'

const doc = new DOMParser().parseFromString('<p>one</p><p>two</p>', 'text/html')
const iterator = doc.createNodeIterator(doc.body!, NodeFilter.SHOW_ELEMENT)

let node
while ((node = iterator.nextNode())) {
  console.log(node.nodeName)
}
```

`NodeIterator` and `TreeWalker` support `whatToShow` masks and filter callbacks.
`NodeIterator.referenceNode` and `pointerBeforeReference` expose its read-only position.
`TreeWalker` distinguishes `FILTER_SKIP` from `FILTER_REJECT`, including during reverse traversal. Maintained sibling links keep sequential sibling traversal linear in the number of visited nodes.

## Security boundary

`@lpm.dev/neo.dom` is a parser, not a sanitizer.

- Parsing never executes scripts inside Node.js.
- Script elements, event-handler attributes, `javascript:` URLs, dangerous CSS, and data URLs are preserved as DOM data.
- Serializing a parsed tree does not make untrusted HTML safe to insert into a browser.
- Apply a dedicated allowlist sanitizer before rendering untrusted output.

HTML5-compliant parsing reduces browser/parser disagreement, but it does not replace sanitization or a Content Security Policy.

## Subpath imports

```typescript
import { DOMParser } from '@lpm.dev/neo.dom/parser'
import { Document, Element, Node } from '@lpm.dev/neo.dom/dom'
import { NodeIterator, TreeWalker, NodeFilter } from '@lpm.dev/neo.dom/traversal'
```

## License

MIT
