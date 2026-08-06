---
name: anti-patterns
description: Avoid treating neo.dom as a sanitizer or browser DOM, relying on innerHTML assignment for parsing, assuming all input is in body, or rendering serialized untrusted markup
version: "1.0.0"
globs:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.tsx"
  - "**/*.jsx"
---

# neo.dom anti-patterns

## Treating parsing as sanitization

Incorrect:

```typescript
const safe = parser.parseFromString(untrustedHTML, 'text/html').body.innerHTML
```

Parsing preserves scripts, `on*` attributes, dangerous URLs, CSS, and data URLs. Use a dedicated allowlist sanitizer before browser insertion.

## Assuming parsed scripts execute

Script elements are inert data inside neo.dom. Their source is preserved, but neo.dom does not provide a JavaScript runtime or browser globals. The script can execute later if serialized output is inserted into a browser without sanitization.

## Assuming all input is in body

HTML5 parsing places elements such as `title`, `meta`, `style`, and `script` in `document.head` when appropriate. Comments and doctypes can be direct children of the document.

```typescript
const doc = parser.parseFromString('<script>x()</script><p>text</p>', 'text/html')
doc.head.firstChild // SCRIPT
doc.body.firstChild // P
```

## Using innerHTML assignment to parse

The setter does not parse markup:

```typescript
element.innerHTML = '<b>bold</b>'
// Creates a text node containing "<b>bold</b>".
```

Use `DOMParser` and move the parsed nodes when fragment parsing is required.

## Expecting a complete browser DOM

Selector queries, events, layout, script execution, stylesheets, and browser globals are not implemented. Use a full DOM library when those APIs are required.

## Rendering serialized untrusted content

Text and attribute escaping prevents accidental delimiter breakouts in ordinary serialization. It does not remove executable elements or URL schemes. Serialization is not a sanitizer.

## Parsing without application limits

HTML5 correctness does not prevent memory exhaustion from arbitrarily large input. neo.dom has finite defaults, but public endpoints often need smaller budgets:

```typescript
const parser = new DOMParser({
  maxInputLength: 1_000_000,
  maxNodes: 20_000,
  maxDepth: 256,
  maxAttributesPerElement: 128,
})
```

Also enforce request-body limits before the complete string reaches the parser.
