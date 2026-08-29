import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const specifiers = [
  '@lpm.dev/neo.dom',
  '@lpm.dev/neo.dom/parser',
  '@lpm.dev/neo.dom/dom',
  '@lpm.dev/neo.dom/traversal',
]

const esmModules = await Promise.all(specifiers.map(specifier => import(specifier)))
const require = createRequire(import.meta.url)
const cjsModules = specifiers.map(specifier => require(specifier))
const packageJson = require('../package.json')

verifyCanonicalRuntime('ESM', esmModules)
verifyCanonicalRuntime('CommonJS', cjsModules)
verifyCrossFormatMutationIsolation(esmModules[0], cjsModules[0])
assert.ok(packageJson.files.includes('.lpm/skills'), 'package omits .lpm/skills')
assert.ok(!packageJson.files.includes('.lpm'), 'package includes private .lpm runtime files')

console.log('Verified package exports, constructor identity, and cross-format mutation isolation')

function verifyCanonicalRuntime(label, [root, parser, dom, traversal]) {
  assert.equal(root.DOMParser, parser.DOMParser, `${label} DOMParser constructors differ`)
  assert.equal(root.Node, dom.Node, `${label} Node constructors differ`)
  assert.equal(root.Element, dom.Element, `${label} Element constructors differ`)
  assert.equal(root.Document, dom.Document, `${label} Document constructors differ`)
  assert.equal(root.Text, dom.Text, `${label} Text constructors differ`)
  assert.equal(root.Comment, dom.Comment, `${label} Comment constructors differ`)
  assert.equal(
    root.DocumentFragment,
    dom.DocumentFragment,
    `${label} DocumentFragment constructors differ`
  )
  assert.equal(
    root.DocumentType,
    dom.DocumentType,
    `${label} DocumentType constructors differ`
  )
  assert.equal(
    root.NodeIterator,
    traversal.NodeIterator,
    `${label} NodeIterator constructors differ`
  )
  assert.equal(root.TreeWalker, traversal.TreeWalker, `${label} TreeWalker constructors differ`)
  assert.equal(root.NodeFilter, traversal.NodeFilter, `${label} NodeFilter objects differ`)

  const document = new parser.DOMParser().parseFromString('<p>verified</p>', 'text/html')
  assert.ok(document instanceof root.Document, `${label} parser returned a foreign Document`)
  assert.ok(document instanceof dom.Document, `${label} parser returned a foreign DOM Document`)
  assert.ok(
    document.body.firstChild instanceof root.Element,
    `${label} parser returned a foreign Element`
  )
  assert.equal(document.body.innerHTML, '<p>verified</p>')
}

function verifyCrossFormatMutationIsolation(esm, cjs) {
  const esmParent = new esm.Element('div')
  const esmChild = new esm.Element('span')
  const cjsParent = new cjs.Element('div')
  const cjsChild = new cjs.Element('span')

  assert.throws(
    () => esmParent.appendChild(cjsChild),
    /canonical neo\.dom Node/,
    'ESM accepted a CommonJS node'
  )
  assert.throws(
    () => cjsParent.appendChild(esmChild),
    /canonical neo\.dom Node/,
    'CommonJS accepted an ESM node'
  )
  assert.equal(esmParent.childNodes.length, 0)
  assert.equal(cjsParent.childNodes.length, 0)
  assert.equal(esmChild.parentNode, null)
  assert.equal(cjsChild.parentNode, null)
}
