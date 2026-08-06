# Performance benchmarks

The historical benchmark results were removed when `DOMParser` moved to the HTML5-compliant `parse5` parsing path. Results from the legacy simplified parser are not representative of the current package.

Run the benchmark suite with:

```bash
lpm run bench -- --run
```

Before publishing new numbers:

- Ensure every fixture selects the intended element rather than a leading text node.
- Consume or validate benchmark results so property reads cannot become no-op measurements.
- Measure parsing, conversion into neo.dom nodes, traversal, and serialization separately.
- Include scaling cases for wide and deeply nested documents.
- Record Node.js, operating system, package version, and dependency versions.

`neo.dom` does not cache `innerHTML`. Any future benchmark must not label that getter as cached unless cache implementation and invalidation tests are present.

The current fixtures validate the selected complex element before timing and write every measured result to a benchmark sink. The traversal suite also includes a 20,000-sibling case to catch regressions from constant-time sibling links back to repeated parent scans.
