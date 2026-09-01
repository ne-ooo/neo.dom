# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

- Fixed `DocumentFragment` insertion validation so a fragment containing the
  target node cannot create a self-parent/self-child cycle.
- Made root and subpath exports share one runtime implementation so constructor
  identity and `instanceof` work across documented import paths.
- Bundled the ESM-only parser dependency into the CommonJS build so the
  advertised `require` exports work on Node.js 18.
- Added a pre-parse markup-start limit and a separate transient open-element limit.
- Applied `maxDepth` only to the final parsed tree.
- Changed HTML name normalization to convert ASCII letters only.
- Made `replaceWith` preserve argument order through one batched parent mutation.
- Made node structure metadata read-only. Document structure getters now track the current tree.
- Corrected `NodeIterator` cursor direction changes and numeric `NamedNodeMap` access.
- Created `NodeList` and `NamedNodeMap` wrappers only when public access requires them.
- Combined final parser-limit checks with conversion and limited conversion storage to tree depth.
- Released processed parse5 source references during conversion.
- Removed one duplicate foster-parent sibling search.
- Changed attribute removal to constant time. Numeric access rebuilds its cache after a mutation.
- Replaced the production simplified tokenizer/tree builder with HTML5-compliant parsing powered by `parse5`.
- Documents now contain an `HTML` document element with `HEAD` and `BODY` children.
- Added doctype nodes and namespace metadata for HTML, SVG, and MathML elements.
- Corrected the public security contract: parsing preserves executable markup and does not sanitize it.
- Enforced atomic tree-mutation invariants, cycle prevention, document child ordering, and `DocumentFragment` splicing.
- Made cloning preserve concrete node types, element attributes, and namespaces. Unsupported document cloning now fails explicitly.
- Made HTML attribute lookup case-insensitive while preserving case-sensitive foreign-content attributes.
- Replaced recursive text collection, cloning, serialization, and parse-tree conversion with stack-safe traversal.
- Added configurable parser limits for input length, node count, tree depth, and attributes per element.
- Corrected reverse `TreeWalker` traversal and filter semantics, and added constant-time sibling links.
- Repaired benchmark fixtures and result consumption so serialization and traversal measurements exercise real work.
- Upgraded Vitest to 3.2.7, added the matching V8 coverage provider, and moved the test toolchain to patched Vite 6.
- Enforced parser resource limits during parse5 tree construction instead of after full intermediate-tree allocation.
- Made document-level conversion and large `DocumentFragment` transfer linear and removed argument-count failures.
- Made attribute indexing, serialization, and cloning linear in the number of attributes.
- Made reverse `TreeWalker` traversal descend from the rightmost branch without scanning complete preceding subtrees.
- Kept `NodeIterator` traversal valid when a mutation removes its reference node or an ancestor of it.
- Treated `FRAMESET` as the document body and stopped adding a synthetic `BODY` to frameset documents.
- Rejected forged nodes and nodes from a different package runtime before a tree mutation starts.
- Serialized child links and stored attributes without creating unused public collection wrappers.
- Made `replaceWith` detach existing sibling arguments in one linear pass per parent.
- Added tail-reference insertion paths for foster-parented text and elements.
- Added the obsolete `FRAME`, `BASEFONT`, `BGSOUND`, and `KEYGEN` void elements.
- Rejected numeric writes to `NodeList` collections.
- Used canonical node metadata for cycle checks when application code shadows a public getter.
- Limited published LPM files to `.lpm/skills`.
- Exposed the read-only `NodeIterator.referenceNode` and `pointerBeforeReference` properties.
- Documented that `NamedNodeMap.setNamedItem()` validates and copies its input.
- Stored HTML template descendants in inert `template.content` fragments.
- Made invalid `replaceWith()` batches leave all input trees unchanged.
- Made `DocumentType` metadata immutable at runtime.
- Corrected HTML serialization for void elements and non-breaking spaces.
- Aligned read-only node declarations and unsupported document cloning with runtime behavior.
- Made element construction faster with private fields and prototype getters.
- Made same-position child insertions constant time while applying DOM pre-removal steps to live iterator positions.
- Changed escaping to scan text and attribute values once.
- Removed saved child lists after a fragment empties. Repeated references to the same fragment do not rescan prior children.
- Kept wide leaf cloning on a path with no template lookup or child-group allocation.
- Stored structural links, mutation helpers, and element attributes in ECMAScript private state.
- Registered canonical node readers once and used direct edge readers for traversal.
- Rejected base `Node` instances as tree-mutation parents.

### Security

- Removed false claims that scripts, event handlers, dangerous URLs, or mXSS payloads are sanitized by the parser.
- Added regression tests for raw-text parsing, HTML5 tree construction, foreign content, and the parser-only security boundary.
- Added regression tests for mutation integrity, DOM semantics, parser resource limits, and 5,000-level trees.
- Removed the critical/high OSV advisories from the Vitest 2 and Vite 5 development dependency tree.
- Rejected invalid programmatic element and attribute names before serialization can reinterpret them as markup structure.
- Bounded token-heavy markup before parse5 can allocate its intermediate tree.
- Stopped wide start tags at the configured attribute limit before duplicate-name checks become quadratic.
- Prevented public metadata shadows from bypassing cycle detection.
- Rejected base `Node` instances that impersonate concrete DOM node kinds.
- Removed duplicate-attribute CPU amplification before parse5 attribute lookup.
- Removed dead `NodeIterator` registrations with `FinalizationRegistry`.
- Rejected direct and mutual cycles through a template-content host relationship.
- Used canonical node state for serializer and traversal decisions.
- Prevented collection views from exposing or replacing private backing storage.
- Rejected comment data that can close its serialized comment.
- Rejected unsafe doctype delimiters and selected a safe quote for valid identifiers.

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
- **Safety** — parsed scripts are inert inside neo.dom. Serialization escapes text and attribute values.
- Sub-path exports: `@lpm.dev/neo.dom/parser`, `/dom`, `/traversal`
- Zero runtime dependencies
- ESM + CJS dual output with full TypeScript declaration files
- Source maps for debugging
- 170 tests across parser, DOM, traversal, and security
