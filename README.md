# @lpm.dev/neo.dom

HTML5-compliant HTML parsing and a focused DOM implementation for Node.js. Parsing is powered by `parse5`; the package provides ESM, CommonJS, and TypeScript declarations.

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

console.log(doc.body.innerHTML)
// '<p>Hello <strong>world</strong></p>'

console.log(doc.body.firstChild?.textContent)
// 'Hello world'
```

## Parsing behavior

`DOMParser` follows HTML5 tokenization and tree-construction rules. It creates an `HTML` document element with `HEAD` and `BODY` children, applies browser-style error recovery, decodes HTML character references, and tracks HTML, SVG, and MathML namespaces.

```typescript
const doc = new DOMParser().parseFromString(
  '<!doctype html><html><head><title>T</title></head><body><p>x</p></body></html>',
  'text/html'
)

doc.documentElement.nodeName // 'HTML'
doc.head.nodeName            // 'HEAD'
doc.body.nodeName            // 'BODY'
```

Comments and doctypes can be children of the document rather than the body. Elements such as `title`, `meta`, `style`, and `script` can be placed in the head according to HTML parsing rules.

### Resource limits

`DOMParser` applies finite limits before and after HTML5 tree construction. The defaults are a 10 MiB input, 100,000 parsed nodes, 2,048 levels, and 1,024 attributes on one element. A limit violation throws a descriptive `RangeError`.

```typescript
const parser = new DOMParser({
  maxInputLength: 1_000_000,
  maxNodes: 20_000,
  maxDepth: 512,
  maxAttributesPerElement: 256,
})
```

Set smaller limits for endpoints with tighter request budgets. Set larger limits only when deeply nested trusted documents are an expected input.

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

Tree mutations reject cycles and invalid child types. Inserting a `DocumentFragment` moves its children into the target and empties the fragment. HTML attribute names are case-insensitive; SVG and MathML attribute names preserve case.

This is not a full browser DOM. CSS selectors, events, layout, script execution, stylesheets, and browser globals are not implemented. The `innerHTML` setter currently creates a text node; it does not parse its input.

## Traversal

```typescript
import { DOMParser, NodeFilter } from '@lpm.dev/neo.dom'

const doc = new DOMParser().parseFromString('<p>one</p><p>two</p>', 'text/html')
const iterator = doc.createNodeIterator(doc.body, NodeFilter.SHOW_ELEMENT)

let node
while ((node = iterator.nextNode())) {
  console.log(node.nodeName)
}
```

`NodeIterator` and `TreeWalker` support `whatToShow` masks and filter callbacks.
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
