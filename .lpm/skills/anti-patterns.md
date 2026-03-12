---
name: anti-patterns
description: Common mistakes when using neo.dom — innerHTML setter creates text node not parsed HTML, named entities not decoded, entity decode not idempotent, null bytes not replaced, FILTER_SKIP vs FILTER_REJECT differences, serialization normalizations, no querySelector
version: "1.0.0"
globs:
  - "**/*.ts"
  - "**/*.js"
---

# Anti-Patterns for @lpm.dev/neo.dom

### [CRITICAL] innerHTML setter doesn't parse HTML — creates a text node

Wrong:

```typescript
const div = doc.createElement('div')
div.innerHTML = '<b>bold</b>'
// AI expects: div → b element → "bold" text node
// Actually:   div → text node with value "<b>bold</b>"

// When serialized, the HTML is escaped:
serializeNode(div)
// '<div>&lt;b&gt;bold&lt;/b&gt;</div>'
```

Correct:

```typescript
// Workaround: parse separately and transplant children
const parser = new DOMParser()
const parsed = parser.parseFromString('<div><b>bold</b></div>', 'text/html')
const parsedDiv = parsed.body.firstChild

// Move children to your target element
while (parsedDiv.firstChild) {
  targetElement.appendChild(parsedDiv.firstChild)
}

// Or replace an entire element
parentNode.replaceChild(parsedDiv, oldElement)
```

The `innerHTML` setter clears all children and creates a single text node with the raw string. It does not sub-parse HTML into elements. This is intentional — it prevents XSS from innerHTML injection. The `innerHTML` getter works correctly (serializes children to HTML).

Source: `src/dom/element.ts:86-98` — creates `Node(NodeType.TEXT_NODE, '#text', html)`

### [CRITICAL] Named entities beyond the basic 5 are not decoded

Wrong:

```typescript
const doc = parser.parseFromString('<p>Hello&nbsp;world &copy; 2025</p>', 'text/html')
const text = doc.body.textContent
// AI expects: 'Hello\u00A0world © 2025'
// Actually:   'Hello&nbsp;world &copy; 2025' (literal strings)

// Worse: serializing re-escapes the &
serializeNode(doc.body.firstChild)
// '<p>Hello&amp;nbsp;world &amp;copy; 2025</p>'
```

Correct:

```typescript
// Use numeric entities instead of named entities
const doc = parser.parseFromString('<p>Hello&#160;world &#169; 2025</p>', 'text/html')
doc.body.textContent
// 'Hello\u00A0world © 2025' ✓

// Or pre-convert named entities before parsing
function convertNamedEntities(html: string): string {
  return html
    .replace(/&nbsp;/g, '&#160;')
    .replace(/&copy;/g, '&#169;')
    .replace(/&mdash;/g, '&#8212;')
    // ... add others as needed
}
```

The tokenizer only decodes `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`, and numeric forms (`&#NNN;`, `&#xHHH;`). All other named entities (`&nbsp;`, `&copy;`, `&mdash;`, etc.) are left as literal text. When serialized, the `&` gets escaped to `&amp;`, producing `&amp;nbsp;` — a broken round-trip.

Source: `src/parser/tokenizer.ts:354-365` — only 7 entity patterns handled

### [HIGH] Entity decode is not idempotent — don't re-parse serialized output

Wrong:

```typescript
// Parse once
const doc1 = parser.parseFromString('<p>&amp;lt;</p>', 'text/html')
// Text node value: '&lt;' (decoded &amp; to &)

// Serialize
const html = serializeNode(doc1.body)
// '<p>&amp;lt;</p>' (re-escaped & to &amp;)

// Parse AGAIN — works fine for this case
const doc2 = parser.parseFromString(html, 'text/html')
// Text node value: '&lt;' — same as before

// BUT if the input was: '&lt;script&gt;'
// Parse: text node '<script>'
// Serialize: '&lt;script&gt;'
// That's fine — but DON'T assume all entities round-trip identically
```

Correct:

```typescript
// Parse once, manipulate, serialize once
const doc = parser.parseFromString(untrustedHTML, 'text/html')
// ... manipulate the tree ...
const safeHTML = serializeNode(doc.body)

// Do NOT: parse(serialize(parse(html))) expecting same results
// The decode function processes &lt; and &gt; BEFORE &amp;
// which means entity ordering matters on repeated passes
```

The entity decode chain processes `&lt;` and `&gt;` before `&amp;`. While this works correctly for a single pass, re-parsing serialized output can produce different results if the original contained unusual entity combinations. Treat parse→serialize as a one-way pipeline.

Source: `src/parser/tokenizer.ts:354-365` — replacement order: `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`

### [HIGH] Null bytes (`&#0;`) are not replaced — strip before parsing untrusted input

Wrong:

```typescript
// AI assumes browser behavior (null → U+FFFD replacement character)
const doc = parser.parseFromString('<p>&#0;test</p>', 'text/html')
doc.body.textContent
// Contains \0 (null byte) — browsers would replace with U+FFFD
```

Correct:

```typescript
// Strip null bytes from untrusted input before parsing
const sanitizedInput = untrustedHTML.replace(/\0/g, '')
const doc = parser.parseFromString(sanitizedInput, 'text/html')

// Or strip &#0; and &#x0; entities too
const stripped = untrustedHTML
  .replace(/\0/g, '')
  .replace(/&#0+;/g, '')
  .replace(/&#x0+;/g, '')
```

`&#0;` decodes via `String.fromCharCode(0)` which produces a null character. Browsers replace null bytes with U+FFFD (replacement character) per the HTML spec. neo.dom does not — null bytes pass through. This is a security consideration for untrusted input where null bytes can be used to bypass filters.

Source: `src/parser/tokenizer.ts` — `String.fromCharCode(NNN)` with no null byte check

### [HIGH] FILTER_SKIP and FILTER_REJECT differ in TreeWalker but are identical in NodeIterator

Wrong:

```typescript
// AI uses FILTER_REJECT in NodeIterator expecting subtree pruning
const iterator = doc.createNodeIterator(
  doc.body,
  NodeFilter.SHOW_ELEMENT,
  (node) => {
    if (node.tagName === 'SCRIPT') return NodeFilter.FILTER_REJECT
    return NodeFilter.FILTER_ACCEPT
  }
)
// FILTER_REJECT does NOT prune the subtree — children of <script> are still visited
// In NodeIterator, SKIP and REJECT behave identically
```

Correct:

```typescript
// Use TreeWalker if you need FILTER_REJECT to prune subtrees
const walker = doc.createTreeWalker(
  doc.body,
  NodeFilter.SHOW_ELEMENT,
  (node) => {
    if (node.tagName === 'SCRIPT') return NodeFilter.FILTER_REJECT  // Prunes entire subtree
    if (node.tagName === 'SPAN') return NodeFilter.FILTER_SKIP      // Skips span, enters children
    return NodeFilter.FILTER_ACCEPT
  }
)

// In TreeWalker:
// FILTER_SKIP — skips the node, but still enters its children
// FILTER_REJECT — skips the node AND all its descendants
```

In NodeIterator, `acceptNode` returns a boolean — both SKIP and REJECT map to `false`, and children are always traversed regardless. Use TreeWalker when you need `FILTER_REJECT` to prune entire subtrees (e.g., skipping `<script>` elements and everything inside them).

Source: `src/traversal/iterator.ts:140-150` — `result === NodeFilter.FILTER_ACCEPT`, `src/traversal/tree-walker.ts:214-220` — `result !== NodeFilter.FILTER_REJECT`

### [MEDIUM] Serialization normalizes output — not character-identical to input

Wrong:

```typescript
// AI expects identical round-trip
const input = '<BR><DIV class=foo>'
const doc = parser.parseFromString(input, 'text/html')
const output = serializeNode(doc.body)
// Expected: '<BR><DIV class=foo></DIV>'
// Actual:   '<br /><div class="foo"></div>'
```

Correct:

```typescript
// Expect these normalizations:
// 1. Void elements: <br> → <br /> (XHTML-style)
// 2. Tag names: <DIV> → <div> (lowercased)
// 3. Attributes: class=foo → class="foo" (double-quoted)
// 4. Auto-closed tags get explicit close: <p>A<p>B → <p>A</p><p>B</p>
// 5. Text escaping: & → &amp;, < → &lt;, > → &gt;

// After one round-trip, output is STABLE:
// serialize(parse(serialize(parse(html)))) === serialize(parse(html))
```

The serializer always produces normalized output. Void elements get XHTML-style ` />`, tags are lowercased, attributes are double-quoted, and auto-closed tags get explicit closing tags. After the first parse→serialize cycle, subsequent cycles produce identical output.

Source: `src/utils/serializer.ts:55-56` — XHTML void elements, `element.tagName.toLowerCase()`

### [MEDIUM] No querySelector or CSS selector support

Wrong:

```typescript
// AI assumes standard DOM selector API
const doc = parser.parseFromString(html, 'text/html')
const element = doc.querySelector('.my-class')     // Not a function
const elements = doc.querySelectorAll('div > p')   // Not a function
```

Correct:

```typescript
// Use TreeWalker or NodeIterator to find elements
const walker = doc.createTreeWalker(
  doc.body,
  NodeFilter.SHOW_ELEMENT,
  (node) => {
    if (node.getAttribute('class')?.includes('my-class')) {
      return NodeFilter.FILTER_ACCEPT
    }
    return NodeFilter.FILTER_SKIP
  }
)

const element = walker.nextNode()  // First matching element

// Or collect all matches
const matches = []
let match
while ((match = walker.nextNode())) {
  matches.push(match)
}
```

neo.dom does not implement CSS selector matching. Use TreeWalker with custom filters to find elements by tag name, attribute values, or other criteria. For jQuery-style selector queries, use cheerio instead.
