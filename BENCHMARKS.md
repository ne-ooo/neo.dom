# Performance Benchmarks - @lpm.dev/neo.dom

This document contains comprehensive benchmark results for `@lpm.dev/neo.dom`, showcasing its performance characteristics for HTML parsing, DOM traversal, and serialization.

## Summary

**neo.dom delivers exceptional performance for a pure JavaScript DOM implementation**:
- ✅ **665,000 ops/sec** for simple HTML parsing
- ✅ **1,800,000 ops/sec** for deep tree traversal (20 levels)
- ✅ **28,600,000 ops/sec** for innerHTML getter (cached)
- ✅ **Zero dependencies** - Fully standalone
- ✅ **Lightweight** - ~20 KB bundle size

## Benchmark Environment

- **Platform**: macOS (Darwin 25.3.0)
- **Node.js**: v18+
- **Test Framework**: Vitest v2.1.9 (experimental bench feature)
- **Package**: @lpm.dev/neo.dom v0.1.0

## Performance Overview

### HTML Parsing Performance

| Operation | ops/sec | mean (ms) | Comparison |
|-----------|---------|-----------|------------|
| **Simple HTML** | **665,109** 🏆 | 0.0015 | Fastest |
| **HTML with entities** | 448,486 | 0.0022 | 1.48x slower |
| **Many attributes (20)** | 66,511 | 0.0150 | 10.00x slower |
| **Deeply nested (20 levels)** | 60,941 | 0.0164 | 10.91x slower |
| **Complex HTML** | 41,101 | 0.0243 | 16.18x slower |
| **Large HTML (100 elements)** | 14,424 | 0.0693 | 46.11x slower ⏱️ |

**Average**: ~216,000 ops/sec across all parsing scenarios

### DOM Traversal Performance

| Operation | ops/sec | mean (ms) | Comparison |
|-----------|---------|-----------|------------|
| **Deep tree (20 levels)** | **1,801,390** 🏆 | 0.0006 | Fastest |
| **Elements only** | 1,000,303 | 0.0010 | 1.80x slower |
| **All nodes** | 912,338 | 0.0011 | 1.97x slower |
| **With filter** | 669,300 | 0.0015 | 2.69x slower |
| **Bidirectional** | 352,944 | 0.0028 | 5.10x slower |
| **Large tree (100 elements)** | 125,243 | 0.0080 | 14.38x slower ⏱️ |

**Average**: ~810,000 ops/sec across all traversal scenarios

### HTML Serialization Performance

| Operation | ops/sec | mean (ms) | Comparison |
|-----------|---------|-----------|------------|
| **innerHTML getter (cached)** | **28,639,965** 🏆 | 0.0000 | Fastest (cached) |
| **Element with attributes** | 357,994 | 0.0028 | 80x slower |
| **Simple element** | 193,270 | 0.0052 | 148x slower |
| **Large document (100 elem)** | 7,032 | 0.1422 | 4,072x slower ⏱️ |

**Note**: innerHTML getter is extremely fast when the value is cached. First access requires serialization.

---

## Detailed Analysis

### 1. HTML Parsing

#### Simple HTML Parsing

**Test**: `'<div><p>Hello World</p></div>'`

```
Operations: 665,109 ops/sec
Mean time:  0.0015 ms
Range:      0.0009 - 8.6944 ms
P99:        0.0034 ms
```

**Key Insight**: Simple HTML parsing is extremely fast. Over **665,000 operations per second**, perfect for small fragments and real-time sanitization.

#### Complex HTML Parsing

**Test**: Multi-level nested structure with headers, navigation, articles
```html
<div class="container" id="main">
  <header>
    <h1>Title</h1>
    <nav>...</nav>
  </header>
  <main>
    <article>...</article>
  </main>
  <footer>...</footer>
</div>
```

```
Operations: 41,101 ops/sec
Mean time:  0.0243 ms
Range:      0.0202 - 6.2552 ms
P99:        0.0785 ms
```

**Key Insight**: Complex nested structures are still very fast at **41,000 ops/sec**. This shows neo.dom handles real-world HTML efficiently.

#### HTML with Entities

**Test**: `'<div>&lt;script&gt;alert()&lt;/script&gt; &amp; &quot;quotes&quot;</div>'`

```
Operations: 448,486 ops/sec
Mean time:  0.0022 ms
Range:      0.0012 - 10.8261 ms
P99:        0.0043 ms
```

**Key Insight**: Entity decoding adds minimal overhead. Still achieves **448,000 ops/sec**, making it excellent for security-focused parsing where entities are common.

#### Large HTML (100 Elements)

**Test**: 100 `<p>` elements inside a div

```
Operations: 14,424 ops/sec
Mean time:  0.0693 ms
Range:      0.0597 - 0.7239 ms
P99:        0.2243 ms
```

**Key Insight**: Large documents are the slowest at **~14,000 ops/sec**, but still very reasonable. This means parsing a 100-element document takes less than 0.1ms on average.

#### Deeply Nested HTML (20 Levels)

**Test**: `<div><div><div>...` (20 levels deep)

```
Operations: 60,941 ops/sec
Mean time:  0.0164 ms
Range:      0.0065 - 32.5346 ms
P99:        0.0690 ms
```

**Key Insight**: Deep nesting is handled well at **61,000 ops/sec**. No stack overflow issues, demonstrating the iterative algorithm's efficiency.

#### Many Attributes (20 Attributes)

**Test**: Single element with 20 `data-*` attributes

```
Operations: 66,511 ops/sec
Mean time:  0.0150 ms
Range:      0.0087 - 30.9280 ms
P99:        0.0484 ms
```

**Key Insight**: Attribute parsing is efficient at **66,000 ops/sec**. Shows map-based attribute storage is performant even with many attributes.

---

### 2. DOM Traversal

#### Deep Tree Traversal (20 Levels)

**Test**: Iterate through 20-level deep nesting

```
Operations: 1,801,390 ops/sec ⚡
Mean time:  0.0006 ms
Range:      0.0005 - 0.0788 ms
P99:        0.0006 ms
```

**Key Insight**: Deep tree traversal is **extremely fast** at **1.8 million ops/sec**. The iterative algorithm shines here - no recursion overhead.

#### Elements Only Traversal

**Test**: Medium tree, `SHOW_ELEMENT` filter

```
Operations: 1,000,303 ops/sec
Mean time:  0.0010 ms
Range:      0.0008 - 0.1837 ms
P99:        0.0011 ms
```

**Key Insight**: Filtering to elements only is still **1 million ops/sec**. whatToShow filtering adds minimal overhead.

#### All Nodes Traversal

**Test**: Medium tree, `SHOW_ALL` (elements + text + comments)

```
Operations: 912,338 ops/sec
Mean time:  0.0011 ms
Range:      0.0009 - 1.1750 ms
P99:        0.0030 ms
```

**Key Insight**: Traversing all node types is **912,000 ops/sec**. Very little performance difference from element-only traversal.

#### Filtered Traversal

**Test**: Custom filter callback (only `<p>` tags)

```
Operations: 669,300 ops/sec
Mean time:  0.0015 ms
Range:      0.0013 - 2.1628 ms
P99:        0.0017 ms
```

**Key Insight**: Custom filters add some overhead but still achieve **669,000 ops/sec**. Filter function calls are the bottleneck, not the iterator.

#### Bidirectional Traversal

**Test**: Forward then backward iteration

```
Operations: 352,944 ops/sec
Mean time:  0.0028 ms
Range:      0.0025 - 0.3321 ms
P99:        0.0078 ms
```

**Key Insight**: Bidirectional iteration (forward + backward) is **353,000 ops/sec**. previousNode() has similar performance to nextNode().

#### Large Tree Traversal (100 Elements)

**Test**: Iterate through 100 sibling elements

```
Operations: 125,243 ops/sec
Mean time:  0.0080 ms
Range:      0.0076 - 1.2683 ms
P99:        0.0087 ms
```

**Key Insight**: Many siblings are slower at **125,000 ops/sec** due to the number of nodes to visit. Still completes in ~0.008ms.

---

### 3. HTML Serialization

#### innerHTML Getter (Cached)

**Test**: Access `element.innerHTML` (already computed)

```
Operations: 28,639,965 ops/sec 🚀
Mean time:  0.0000 ms (< 1 microsecond)
```

**Key Insight**: Cached innerHTML is **extremely fast** - over **28 million ops/sec**. Near-instant access when value is cached.

#### Serialize Element with Attributes

**Test**: Element with multiple attributes

```
Operations: 357,994 ops/sec
Mean time:  0.0028 ms
Range:      0.0016 - 15.6308 ms
P99:        0.0077 ms
```

**Key Insight**: Attribute serialization is fast at **358,000 ops/sec**. Escaping attribute values adds minimal overhead.

#### Serialize Simple Element

**Test**: Simple `<div><p>Hello World</p></div>`

```
Operations: 193,270 ops/sec
Mean time:  0.0052 ms
Range:      0.0012 - 88.8766 ms
P99:        0.0047 ms
```

**Key Insight**: Simple serialization is **193,000 ops/sec**. String concatenation is efficient for small trees.

#### Serialize Large Document (100 Elements)

**Test**: Serialize div with 100 paragraph children

```
Operations: 7,032 ops/sec
Mean time:  0.1422 ms
Range:      0.0933 - 11.3558 ms
P99:        0.5649 ms
```

**Key Insight**: Large documents are slower at **7,000 ops/sec**, but still complete in ~0.14ms. String building for 100 elements is the bottleneck.

---

## Performance Characteristics

### Complexity Analysis

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| **Parsing** | O(n) | O(n) | Single pass through input |
| **Tree Building** | O(n) | O(n) | Linear with node count |
| **Traversal** | O(1) per node | O(1) | Amortized constant time |
| **Serialization** | O(n) | O(d) | d = tree depth (recursion) |

### Memory Usage

| Structure | Space | Notes |
|-----------|-------|-------|
| **Tokenizer** | O(1) | Position pointers only |
| **DOM Tree** | O(n) | Nodes + attributes |
| **Iterator** | O(1) | Current position only |
| **Serializer** | O(d) | Call stack depth |

### Optimization Insights

1. **Parsing**: Single-pass tokenization is highly efficient
2. **Traversal**: Iterative algorithm avoids stack overhead
3. **Serialization**: String concatenation is the main cost
4. **Attributes**: Map-based storage scales well

---

## Real-World Performance

### Use Case: Sanitizing User Input

**Scenario**: Parse + traverse + serialize a user comment

```typescript
const html = '<p>User comment with <strong>formatting</strong></p>'
const doc = parser.parseFromString(html, 'text/html')
const iterator = new NodeIterator(doc.body, NodeFilter.SHOW_ELEMENT)
// ... validation logic ...
const output = element.innerHTML
```

**Expected Performance**:
- Parse: ~0.0015 ms (665,000 ops/sec)
- Traverse: ~0.0010 ms (1,000,000 ops/sec)
- Serialize: ~0.0028 ms (358,000 ops/sec)
- **Total: ~0.005 ms (~200,000 sanitizations/sec)**

### Use Case: Processing Large Document

**Scenario**: Parse and process a 100-element document

```typescript
const largeHTML = // 100 paragraphs
const doc = parser.parseFromString(largeHTML, 'text/html')
const iterator = new NodeIterator(doc.body, NodeFilter.SHOW_ELEMENT)
// ... process all elements ...
```

**Expected Performance**:
- Parse: ~0.0693 ms (14,424 ops/sec)
- Traverse: ~0.0080 ms (125,243 ops/sec)
- **Total: ~0.077 ms (~13,000 operations/sec)**

---

## Comparison Context

### neo.dom vs Full DOM Implementations

**neo.dom** is a lightweight, security-focused implementation optimized for:
- ✅ HTML sanitization use cases
- ✅ Small bundle size (~20 KB)
- ✅ Zero runtime dependencies
- ✅ Fast parsing for small-to-medium documents

**Not optimized for**:
- ❌ Full HTML5 specification compliance
- ❌ Browser-level performance (native code)
- ❌ Complex CSS selector queries
- ❌ Large document processing (1000+ elements)

### Performance Trade-offs

**Fast** (100k+ ops/sec):
- Simple HTML parsing
- Entity decoding
- Tree traversal
- Element serialization

**Moderate** (10k-100k ops/sec):
- Complex HTML parsing
- Many attributes
- Deep nesting
- Large tree traversal

**Slower** (< 10k ops/sec):
- Very large documents (100+ elements)
- Deep serialization

---

## Benchmark Methodology

All benchmarks use:
- **Vitest bench** (experimental feature)
- **Warmup runs** to stabilize JIT
- **Multiple iterations** for statistical accuracy
- **P99 percentile** for tail latency
- **RME (Relative Margin of Error)** for reliability

### Sample Sizes

- Parsing benchmarks: 7,213 - 332,555 samples
- Traversal benchmarks: 62,622 - 900,696 samples
- Serialization benchmarks: Varies (0 - 14,320,096 samples)

---

## Recommendations

### For Best Performance

1. **Keep documents small** - Sub-100 elements parse fastest
2. **Minimize deep nesting** - 20+ levels may slow down
3. **Cache innerHTML** - Reuse serialized output when possible
4. **Use specific filters** - `SHOW_ELEMENT` faster than `SHOW_ALL` with custom filter
5. **Batch operations** - Parse once, traverse multiple times if needed

### When to Use neo.dom

✅ **Great for**:
- HTML sanitization
- Small-to-medium documents
- Security-focused parsing
- Node.js environments
- Zero-dependency requirement

❌ **Not ideal for**:
- Very large documents (1000+ elements)
- Full browser DOM replacement
- Performance-critical rendering
- Complex CSS selectors

---

## Summary

**neo.dom** delivers excellent performance for a pure JavaScript DOM implementation:

- **Parsing**: 14,000 - 665,000 ops/sec depending on complexity
- **Traversal**: 125,000 - 1,800,000 ops/sec
- **Serialization**: 7,000 - 28,600,000 ops/sec (cached)

Perfect for HTML sanitization, security-focused parsing, and Node.js applications where a lightweight DOM implementation is needed.

---

**Last Updated**: February 2026 (v0.1.0)
