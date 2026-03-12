# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
- **Security** — XSS protection, mXSS prevention, attribute sanitization
- Sub-path exports: `@lpm.dev/neo.dom/parser`, `/dom`, `/traversal`
- Zero runtime dependencies
- ESM + CJS dual output with full TypeScript declaration files
- Source maps for debugging
- 170 tests across parser, DOM, traversal, and security
