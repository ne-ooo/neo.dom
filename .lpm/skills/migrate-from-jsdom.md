---
name: migrate-from-jsdom
description: Step-by-step guide for migrating from jsdom to neo.dom — size and dependency comparison, API mapping for parsing and DOM manipulation, innerHTML workaround, named entity conversion, missing features (querySelector, events, JS execution, CSS), and when to stay with jsdom
version: "1.0.0"
globs:
  - "**/*.ts"
  - "**/*.js"
---

# Migrate from jsdom to @lpm.dev/neo.dom

## Quick Comparison

| Aspect | jsdom | neo.dom |
|--------|-------|---------|
| Install size | ~15MB | ~20KB |
| Dependencies | 20+ | Zero |
| JS execution | Yes | No |
| Full W3C DOM | Mostly | No (subset) |
| CSS parsing | Partial | No |
| Entity support | Full HTML5 spec | 5 named + numeric |
| Auto-close tags | Full spec | Common patterns |
| TreeWalker / NodeIterator | Yes | Yes |
| querySelector | Yes | No |
| innerHTML setter (parses) | Yes | No (text node only) |
| Events | Yes | No |
| Performance | Slow | Fast |
| Memory | Heavy | Minimal |

## Step 1: Replace Imports and Parsing

```typescript
// Before (jsdom)
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<div><p>Hello</p></div>')
const document = dom.window.document
const body = document.body

// After (neo.dom)
import { DOMParser } from '@lpm.dev/neo.dom'
const parser = new DOMParser()
const document = parser.parseFromString('<div><p>Hello</p></div>', 'text/html')
const body = document.body
```

## Step 2: DOM Manipulation — Works As-Is

These APIs are compatible with no changes:

```typescript
// Creating elements
const div = document.createElement('div')           // ✓
const text = document.createTextNode('Hello')        // ✓
const comment = document.createComment('note')       // ✓
const fragment = document.createDocumentFragment()   // ✓

// Node manipulation
parent.appendChild(child)                            // ✓
parent.removeChild(child)                            // ✓
parent.replaceChild(newChild, oldChild)              // ✓
parent.insertBefore(newChild, refChild)              // ✓
node.cloneNode(true)                                 // ✓

// Element attributes
element.getAttribute('class')                        // ✓
element.setAttribute('id', 'main')                   // ✓
element.hasAttribute('data-foo')                     // ✓
element.removeAttribute('style')                     // ✓

// Navigation
node.parentNode                                      // ✓
node.childNodes                                      // ✓
node.firstChild / node.lastChild                     // ✓
node.nextSibling / node.previousSibling              // ✓
node.textContent                                     // ✓
element.tagName                                      // ✓

// Convenience
element.remove()                                     // ✓
element.replaceWith(other)                           // ✓

// innerHTML getter (serializes children)
const html = element.innerHTML                       // ✓
```

## Step 3: Handle innerHTML Setter

The biggest behavioral difference — `innerHTML` setter does NOT parse HTML:

```typescript
// jsdom — parses HTML into child elements
element.innerHTML = '<b>bold</b>'
// Creates: element → b element → "bold" text node

// neo.dom — creates a text node with literal string
element.innerHTML = '<b>bold</b>'
// Creates: element → text node "<b>bold</b>"
// Serialized: <div>&lt;b&gt;bold&lt;/b&gt;</div>
```

### Workaround: parse separately and transplant

```typescript
function setInnerHTML(element, html) {
  // Clear existing children
  while (element.firstChild) {
    element.removeChild(element.firstChild)
  }

  // Parse the HTML
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const container = doc.body.firstChild

  // Move parsed children to target element
  while (container.firstChild) {
    element.appendChild(container.firstChild)
  }
}

// Usage
setInnerHTML(myDiv, '<b>bold</b><i>italic</i>')
```

## Step 4: Handle Named Entities

neo.dom only decodes `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`, and numeric forms. Named entities like `&nbsp;`, `&copy;`, `&mdash;` are left as literal text:

```typescript
// jsdom — full entity support
parser.parseFromString('<p>&nbsp;&copy;&mdash;</p>', 'text/html')
// Text: '\u00A0©—'

// neo.dom — named entities not decoded
parser.parseFromString('<p>&nbsp;&copy;&mdash;</p>', 'text/html')
// Text: '&nbsp;&copy;&mdash;' (literal strings)
// Serialized: '&amp;nbsp;&amp;copy;&amp;mdash;' (broken)
```

### Workaround: pre-convert to numeric entities

```typescript
const NAMED_ENTITIES = {
  '&nbsp;': '&#160;',
  '&copy;': '&#169;',
  '&reg;': '&#174;',
  '&mdash;': '&#8212;',
  '&ndash;': '&#8211;',
  '&laquo;': '&#171;',
  '&raquo;': '&#187;',
  '&hellip;': '&#8230;',
  '&trade;': '&#8482;',
  // Add more as needed for your content
}

function convertEntities(html: string): string {
  let result = html
  for (const [named, numeric] of Object.entries(NAMED_ENTITIES)) {
    result = result.replaceAll(named, numeric)
  }
  return result
}

const doc = parser.parseFromString(convertEntities(html), 'text/html')
```

## Step 5: Handle Missing Features

### No querySelector / querySelectorAll

```typescript
// jsdom
const el = document.querySelector('.my-class')
const all = document.querySelectorAll('div > p')

// neo.dom — use TreeWalker with custom filter
import { NodeFilter } from '@lpm.dev/neo.dom'

const walker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_ELEMENT,
  (node) => {
    if (node.getAttribute('class')?.includes('my-class')) {
      return NodeFilter.FILTER_ACCEPT
    }
    return NodeFilter.FILTER_SKIP
  }
)
const el = walker.nextNode()
```

### No events

```typescript
// jsdom
element.addEventListener('click', handler)
element.dispatchEvent(new Event('click'))

// neo.dom — not supported
// Use neo.dom for parsing/serialization, not event simulation
```

### No JavaScript execution

```typescript
// jsdom — executes inline scripts
const dom = new JSDOM('<script>document.title = "test"</script>', { runScripts: 'dangerously' })

// neo.dom — script tags are parsed as elements but never executed
// Content is treated as text, not evaluated
```

### No CSS / computed styles

```typescript
// jsdom
window.getComputedStyle(element)
element.style.color = 'red'
element.classList.add('active')

// neo.dom — not supported
// Set style/class attributes manually:
element.setAttribute('style', 'color: red')
element.setAttribute('class', 'active')
```

### No `<template>`, `<svg>`, `<math>` special handling

```typescript
// jsdom — template content in separate DocumentFragment, SVG in SVG namespace
// neo.dom — these are treated as regular elements (no namespace switching)
// This is actually a security benefit — namespace switching is a common mXSS vector
```

## Step 6: Traversal — Works with Caveats

TreeWalker and NodeIterator work in neo.dom, but with one difference:

```typescript
// FILTER_REJECT in TreeWalker: prunes entire subtree (same as jsdom) ✓
// FILTER_REJECT in NodeIterator: same as FILTER_SKIP (same as jsdom) ✓
// FILTER_SKIP in TreeWalker: skips node, enters children (same as jsdom) ✓

// The behavior matches jsdom/browsers — no migration issue here
```

## When to Stay with jsdom

- You need JavaScript execution in parsed documents
- You need `querySelector` / `querySelectorAll` with complex CSS selectors
- You need event dispatching and handling
- You need full HTML5 spec compliance (`<template>`, `<svg>`, adoption agencies)
- Your HTML relies heavily on named entities (`&nbsp;`, `&mdash;`, etc.)
- You need `getComputedStyle` or CSS cascade

## When neo.dom Is the Right Choice

- HTML sanitization pipelines (parse → strip → serialize)
- Server-side HTML template manipulation
- CLI tools where install size matters (20KB vs 15MB)
- Edge/serverless environments with memory constraints
- Security-focused parsing (small attack surface, restrictive entity handling)
- Static analysis of HTML structure

## Migration Checklist

- [ ] Replace `new JSDOM(html).window.document` with `parser.parseFromString(html, 'text/html')`
- [ ] Replace `innerHTML = html` with parse-and-transplant workaround
- [ ] Convert named entities to numeric form before parsing
- [ ] Replace `querySelector` calls with TreeWalker/NodeIterator
- [ ] Remove event listener code (not supported)
- [ ] Remove script execution reliance (not supported)
- [ ] Replace `element.style.*` / `element.classList.*` with `setAttribute`
- [ ] Remove `jsdom` and `@types/jsdom` from dependencies
- [ ] Add `@lpm.dev/neo.dom` to dependencies
