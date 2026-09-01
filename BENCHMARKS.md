# Performance benchmarks

The historical benchmark results were removed when `DOMParser` moved to the HTML5-compliant `parse5` parsing path. Results from the legacy simplified parser are not representative of the current package.

Run the benchmark suite with:

```bash
lpm run bench -- --run
```

Before publishing new numbers:

- Make sure that every fixture selects the intended element instead of a leading text node.
- Use each benchmark result. This prevents no-op measurements.
- Measure parsing, conversion into neo.dom nodes, traversal, and serialization separately.
- Include scaling cases for wide and deeply nested documents.
- Record Node.js, operating system, package version, and dependency versions.

`neo.dom` does not cache `innerHTML`. Any future benchmark must not label that getter as cached unless cache implementation and invalidation tests are present.

The fixtures make sure that each complex case selects the intended element. Each measured result changes a benchmark sink.

The parsing suite includes a raw parse5 baseline and a 20,000-element wide document. It also includes 10,000 foster-parenting repetitions.

The mutation suite measures lazy leaf construction and 4,000 attribute removals. It also measures a batched replacement with 2,000 nodes.

The suite measures 100 references to one 10,000-child fragment. This case detects rescans after the fragment becomes empty.

The mutation suite measures a same-position insertion in a parent with 100,000 children.

The mutation suite deep-clones 50,000 wide leaves. This case detects per-leaf allocations and template lookups.

The serialization suite measures one-pass escaping for large text and attribute values.

The traversal suite includes 20,000 sibling links. It measures an accepted-tail fast path across 50,000 children.

The traversal suite also measures a full skipped scan of the same 50,000 children.
