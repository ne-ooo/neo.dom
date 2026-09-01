# @lpm.dev/neo.dom

`@lpm.dev/neo.dom` parses HTML with `parse5` and provides a focused DOM
implementation for Node.js.

## Features

- **HTML parsing:** Uses HTML5 tokenization, tree construction, namespaces,
  character references, and browser-style error recovery.
- **DOM operations:** Provides document, element, text, comment, fragment,
  attribute, and traversal APIs.
- **Resource limits:** Limits input size, markup starts, nodes, open elements,
  tree depth, and attributes.
- **Module formats:** Provides ESM, CommonJS, and TypeScript declarations.
- **Dependency surface:** Has one runtime dependency, `parse5`.

## Install

Install the package with LPM:

```bash
lpm install @lpm.dev/neo.dom
```

## Quick start

```typescript
import { DOMParser } from "@lpm.dev/neo.dom";

const doc = new DOMParser().parseFromString(
  "<p>Hello <strong>world</strong></p>",
  "text/html",
);

console.log(doc.body?.innerHTML);
// "<p>Hello <strong>world</strong></p>"

console.log(doc.body?.firstChild?.textContent);
// "Hello world"
```

## API

### `new DOMParser(options?)`

Create a parser with the default resource limits or the specified limits.

### `parser.parseFromString(input, "text/html"): Document`

`DOMParser` follows HTML5 tokenization and tree-construction rules. It creates
an `HTML` document element with `HEAD` and `BODY` children. It applies
browser-style error recovery and decodes HTML character references. It also
tracks HTML, SVG, and MathML namespaces.

```typescript
const doc = new DOMParser().parseFromString(
  "<!doctype html><html><head><title>T</title></head><body><p>x</p></body></html>",
  "text/html",
);

doc.documentElement?.nodeName; // "HTML"
doc.head?.nodeName; // "HEAD"
doc.body?.nodeName; // "BODY"
```

Comments and doctypes can be direct document children. HTML parsing rules can
place `title`, `meta`, `style`, and `script` elements in the head.

The `documentElement`, `head`, and `body` getters track the current tree. A
getter returns `null` when its element is absent.

## Behavior and limits

`DOMParser` uses six finite limits. It enforces `maxInputLength` and
`maxMarkupStarts` before parsing. `maxMarkupStarts` counts less-than (`<`)
characters.

During parsing, it enforces `maxNodes`, `maxOpenElements`, and
`maxAttributesPerElement`. The node count includes each `template.content`
fragment.

After parsing, `maxDepth` applies to the final tree only.

The input limit is 10 MiB by default. The markup-start limit is 250,000. The
node limit is 100,000. The open-element limit is 512. The final depth limit is
2,048. Each element allows 1,024 attributes.

A limit violation throws a descriptive `RangeError`.

```typescript
const parser = new DOMParser({
  maxInputLength: 1_000_000,
  maxMarkupStarts: 50_000,
  maxNodes: 20_000,
  maxOpenElements: 256,
  maxDepth: 512,
  maxAttributesPerElement: 256,
});
```

Set smaller limits for endpoints with tighter request budgets. If trusted input
requires a higher limit, increase that limit.

### Supported DOM subset

```typescript
const element = doc.createElement("div");
const text = doc.createTextNode("Hello");
const comment = doc.createComment("note");
const fragment = doc.createDocumentFragment();

element.setAttribute("class", "active");
element.getAttribute("class");
element.hasAttribute("class");
element.removeAttribute("class");

element.appendChild(text);
element.insertBefore(comment, text);
element.removeChild(comment);
element.cloneNode(true);

console.log(element.textContent);
console.log(element.innerHTML);
```

Tree mutations reject cycles, invalid child types, and invalid structural names.
`replaceWith` applies all replacements as one ordered batch.

Inserting a `DocumentFragment` moves its children into the target and empties
the fragment. HTML names use ASCII-only case conversion. SVG and MathML names
preserve case.

Structural node metadata is read-only. Tree validation uses canonical metadata
even if application code shadows a public getter.

Base `Node` instances cannot act as tree-mutation parents. Concrete DOM node
classes provide the supported parent behavior.

Numeric `NodeList` and `NamedNodeMap` access matches `item()` access. Writes to
numeric collection properties fail.

`NamedNodeMap.setNamedItem()` validates and copies its input. Later changes to
the input object do not change the stored attribute.

HTML template descendants are in the inert `template.content` fragment. Normal
document traversal does not enter this separate fragment. Tree mutations also
reject direct and mutual cycles through a template-content host relationship.

```typescript
import { HTMLTemplateElement } from "@lpm.dev/neo.dom";

const template = doc.createElement("template") as HTMLTemplateElement;
template.content.appendChild(doc.createElement("p"));

console.log(template.firstChild); // null
console.log(template.innerHTML); // "<p></p>"
```

Serialization rejects programmatic comment data that can close its comment. It
also rejects doctype fields that contain unsafe markup delimiters.

The doctype serializer selects single or double quotes for valid identifiers.
These rules protect markup structure but do not sanitize HTML.

This is not a full browser DOM. It does not implement CSS selectors, events,
layout, script execution, stylesheets, or browser globals. The `innerHTML`
setter creates a text node. It does not parse its input.

### Traversal

```typescript
import { DOMParser, NodeFilter } from "@lpm.dev/neo.dom";

const doc = new DOMParser().parseFromString(
  "<p>one</p><p>two</p>",
  "text/html",
);
const iterator = doc.createNodeIterator(doc.body!, NodeFilter.SHOW_ELEMENT);

let node;
while ((node = iterator.nextNode())) {
  console.log(node.nodeName);
}
```

`NodeIterator` and `TreeWalker` support `whatToShow` masks and filter callbacks.
`NodeIterator.referenceNode` and `pointerBeforeReference` expose its read-only
position. `TreeWalker` distinguishes `FILTER_SKIP` from `FILTER_REJECT`,
including during reverse traversal. Maintained sibling links keep sequential
sibling traversal linear in the number of visited nodes.

## Security

`@lpm.dev/neo.dom` is a parser, not a sanitizer.

- Parsing never executes scripts inside Node.js.
- Script elements, event-handler attributes, `javascript:` URLs, dangerous CSS,
  and data URLs are preserved as DOM data.
- Serializing a parsed tree does not make untrusted HTML safe to insert into a
  browser.
- Apply a dedicated allowlist sanitizer before rendering untrusted output.

HTML5-compliant parsing reduces browser/parser disagreement, but it does not
replace sanitization or a Content Security Policy.

## Package entry points

| Import                       | Purpose                        |
| ---------------------------- | ------------------------------ |
| `@lpm.dev/neo.dom`           | Complete public API.           |
| `@lpm.dev/neo.dom/parser`    | Parser API.                    |
| `@lpm.dev/neo.dom/dom`       | DOM node classes.              |
| `@lpm.dev/neo.dom/traversal` | Traversal classes and filters. |

```typescript
import { DOMParser } from "@lpm.dev/neo.dom/parser";
import { Document, Element, Node } from "@lpm.dev/neo.dom/dom";
import {
  NodeFilter,
  NodeIterator,
  TreeWalker,
} from "@lpm.dev/neo.dom/traversal";
```

## Runtime support

- **Node.js:** 18 or later
- **Browsers:** Not supported
- **Module formats:** ESM and CommonJS
- **TypeScript:** Declaration files included

## License

MIT. See [LICENSE](./LICENSE).
