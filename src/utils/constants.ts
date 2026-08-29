/**
 * @lpm.dev/neo.dom - Constants
 *
 * DOM node types, filter constants, and HTML element categories
 */

/**
 * Node type constants
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
 */
export const NodeType = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
} as const

/** HTML namespace used by HTML5 parsers and DOM elements. */
export const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

/**
 * NodeFilter constants
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NodeFilter
 */
export const NodeFilter = {
  // whatToShow constants
  SHOW_ALL: 0xffffffff,
  SHOW_ELEMENT: 0x1,
  SHOW_TEXT: 0x4,
  SHOW_COMMENT: 0x80,

  // Filter return values
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,
} as const

/**
 * Current and obsolete HTML void elements (self-closing, no end tag)
 * @see https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 */
export const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'basefont',
  'bgsound',
  'br',
  'col',
  'embed',
  'frame',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

/**
 * Elements that auto-close when certain tags are encountered
 * Used for HTML auto-correction during parsing
 */
export const AUTO_CLOSE_TAGS: Record<string, string[]> = {
  // <p> closes when block elements are encountered
  p: ['address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'],

  // <li> closes when another <li> is encountered
  li: ['li'],

  // <dt> and <dd> close when another definition term/description is encountered
  dt: ['dt', 'dd'],
  dd: ['dt', 'dd'],

  // Table elements
  th: ['th', 'td'],
  td: ['th', 'td'],
  tr: ['tr'],
  thead: ['tbody', 'tfoot'],
  tbody: ['thead', 'tfoot'],
  tfoot: ['thead', 'tbody'],

  // <option> and <optgroup>
  option: ['option', 'optgroup'],
  optgroup: ['optgroup'],
}

/**
 * Elements that cannot contain block-level elements
 * Retained for compatibility with the legacy tree builder
 */
export const INLINE_ELEMENTS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em',
  'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span',
  'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
])

/**
 * Block-level elements
 */
export const BLOCK_ELEMENTS = new Set([
  'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup',
  'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul',
])
