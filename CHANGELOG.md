# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

- Replaced the production simplified tokenizer/tree builder with HTML5-compliant parsing powered by `parse5`.
- Documents now contain an `HTML` document element with `HEAD` and `BODY` children.
- Added doctype nodes and namespace metadata for HTML, SVG, and MathML elements.
- Corrected the public security contract: parsing preserves executable markup and does not sanitize it.
- Enforced atomic tree-mutation invariants, cycle prevention, document child ordering, and `DocumentFragment` splicing.
- Made cloning preserve concrete node types, element attributes, and namespaces; unsupported document cloning now fails explicitly.
- Made HTML attribute lookup case-insensitive while preserving case-sensitive foreign-content attributes.
- Replaced recursive text collection, cloning, serialization, and parse-tree conversion with stack-safe traversal.
- Added configurable parser limits for input length, node count, tree depth, and attributes per element.
- Corrected reverse `TreeWalker` traversal and filter semantics, and added constant-time sibling links.
- Repaired benchmark fixtures and result consumption so serialization and traversal measurements exercise real work.
- Upgraded Vitest to 3.2.7, added the matching V8 coverage provider, and moved the test toolchain to patched Vite 6.

### Security

- Removed false claims that scripts, event handlers, dangerous URLs, or mXSS payloads are sanitized by the parser.
- Added regression tests for raw-text parsing, HTML5 tree construction, foreign content, and the parser-only security boundary.
- Added regression tests for mutation integrity, DOM semantics, parser resource limits, and 5,000-level trees.
- Removed the critical/high OSV advisories from the Vitest 2 and Vite 5 development dependency tree.

## [0.1.0] - 2026-03-09

### Added

- **DOMParser** — `parseFromString(html, mimeType)` — parse HTML strings into DOM trees
- **Document** — `createElement()`, `createTextNode()`, `createComment()`, `createDocumentFragment()`, `createNodeIterator()`, `createTreeWalker()`, `getElementById()`, `getElementsByTagName()`, `getElementsByClassName()`, `querySelector()`, `querySelectorAll()`
- **Element** — Full attribute API (`getAttribute`, `setAttribute`, `removeAttribute`, `hasAttribute`, `toggleAttribute`), `classList`, `innerHTML`, `outerHTML`, `textContent`, `matches()`, `closest()`, `querySelector()`, `querySelectorAll()`
- **Node** — `appendChild()`, `insertBefore()`, `removeChild()`, `replaceChild()`, `cloneNode()`, `contains()`, `normalize()`
- **Text**, **Comment**, **DocumentFragment** — standard DOM node implementations
- **NodeIterator** — `nextNode()`, `previousNode()` with `whatToShow` and custom filter support
- **TreeWalker** — `parentNode()`, `firstChild()`, `lastChild()`, `nextSibling()`, `previousSibling()`, `nextNode()`, `previousNode()` with `whatToShow` and filter support
- **NodeType** constants — `ELEMENT_NODE`, `TEXT_NODE`, `COMMENT_NODE`, `DOCUMENT_NODE`, `DOCUMENT_FRAGMENT_NODE`
- **NodeFilter** constants — `SHOW_ALL`, `SHOW_ELEMENT`, `SHOW_TEXT`, `FILTER_ACCEPT`, `FILTER_REJECT`, `FILTER_SKIP`
- **Safety** — parsed scripts are inert inside neo.dom; serialization escapes text and attribute values
- Sub-path exports: `@lpm.dev/neo.dom/parser`, `/dom`, `/traversal`
- Zero runtime dependencies
- ESM + CJS dual output with full TypeScript declaration files
- Source maps for debugging
- 170 tests across parser, DOM, traversal, and security
