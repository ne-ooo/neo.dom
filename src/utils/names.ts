/**
 * Validate markup names before they are stored in the DOM.
 *
 * This is the XML Name production referenced by the DOM specification. It
 * accepts namespace prefixes and Unicode names while excluding every HTML
 * delimiter, whitespace character, control character, and invalid start.
 */
const NAME_START = ':A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF' +
  '\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F' +
  '\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD' +
  '\\u{10000}-\\u{EFFFF}'
const NAME_CHARACTER = `${NAME_START}\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040`
const VALID_MARKUP_NAME = new RegExp(
  `^[${NAME_START}][${NAME_CHARACTER}]*$`,
  'u'
)

/** Apply HTML's ASCII-only lowercase conversion without changing Unicode text. */
export function asciiLowercase(value: string): string {
  return value.replace(/[A-Z]/g, character =>
    String.fromCharCode(character.charCodeAt(0) + 0x20)
  )
}

/** Apply HTML's ASCII-only uppercase conversion without changing Unicode text. */
export function asciiUppercase(value: string): string {
  return value.replace(/[a-z]/g, character =>
    String.fromCharCode(character.charCodeAt(0) - 0x20)
  )
}

export function validateMarkupName(name: string): void {
  if (!VALID_MARKUP_NAME.test(name)) {
    const error = new Error(`InvalidCharacterError: "${name}" is not a valid markup name`)
    error.name = 'InvalidCharacterError'
    throw error
  }
}
