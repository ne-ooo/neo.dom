---
name: migrate-from-jsdom
description: Migrate parsing and basic DOM manipulation from jsdom to neo.dom while accounting for its smaller API, inert scripts, innerHTML setter behavior, and lack of browser features
version: "1.0.0"
globs:
  - "**/*.ts"
  - "**/*.js"
---

# Migrate from jsdom to @lpm.dev/neo.dom

## Use neo.dom when

- You need HTML5 parsing, basic tree manipulation, serialization, or traversal.
- You do not need a window, events, layout, selector queries, or script execution.
- You will apply a separate sanitizer to untrusted browser-bound output.

Stay with jsdom when browser APIs or broad DOM compatibility are required.

## Replace parsing

```typescript
// jsdom
import { JSDOM } from 'jsdom'
const document = new JSDOM(html).window.document

// neo.dom
import { DOMParser } from '@lpm.dev/neo.dom'
const document = new DOMParser().parseFromString(html, 'text/html')
```

Both paths apply HTML5 tree-construction rules. neo.dom uses `parse5` and exposes a focused custom DOM rather than a browser window.

## APIs that usually transfer

```typescript
document.createElement('div')
document.createTextNode('text')
document.createComment('note')
document.createDocumentFragment()

parent.appendChild(child)
parent.removeChild(child)
parent.replaceChild(newChild, oldChild)
parent.insertBefore(newChild, referenceChild)

element.getAttribute('name')
element.setAttribute('name', 'value')
element.hasAttribute('name')
element.removeAttribute('name')
```

## Replace unsupported APIs

neo.dom does not implement `querySelector`, events, computed styles, a `window`, or JavaScript execution. Use `NodeIterator` or `TreeWalker` for traversal, or keep jsdom if selector compatibility is required.

## Handle innerHTML assignment

The getter serializes children. The setter creates a text node and does not parse markup. Parse separately and move nodes when assignment-style fragment parsing is required.

## Preserve the security boundary

Neither parsing nor serialization sanitizes untrusted markup. Script elements remain inert only while they stay inside neo.dom. Sanitize serialized output before inserting it into a browser.

## Migration checklist

- [ ] Replace `JSDOM` construction with `DOMParser.parseFromString`.
- [ ] Replace selector queries with traversal or retain jsdom.
- [ ] Remove reliance on events, layout, window globals, or script execution.
- [ ] Replace parsing via `innerHTML` assignment.
- [ ] Check `document.head`, `document.body`, and document-level comments/doctypes.
- [ ] Add a sanitizer before rendering untrusted output.
