// ResMan exposes no JSON API for the flows these tests drive. Signing in is a chain of
// HTML forms the identity provider expects a browser to submit on the user's behalf, and
// a module page carries its dropdown data as <option> elements rather than as a lookup
// endpoint. An APIRequestContext has no DOM, so these read back the handful of values a
// request needs from the markup the application already served.
//
// Deliberately small and regex-based rather than a parser dependency: what is read here
// is a few hidden inputs, one <option> value and one table cell, all from the same
// application, and every caller checks what it got before using it.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
}

// The application HTML-encodes the values these helpers read back — a ReturnUrl full of
// `&amp;`, a property named `Arbor Management &amp; Co`. Posting them back encoded sends
// the wrong value, so every extracted attribute and cell goes through this.
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (_, name) => NAMED_ENTITIES[name.toLowerCase()])
}

// Attributes arrive double-quoted from the application and single-quoted from the
// identity provider's auto-submitting form, so both are accepted.
function attributeValue(tag: string, name: string): string {
  const attribute = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))

  return attribute ? decodeHtmlEntities(attribute[1]) : ''
}

// Where the document's form posts to. Returns '' when the document holds no form, which
// is what a page that is not the expected one looks like.
export function formAction(html: string): string {
  const form = html.match(/<form[^>]*>/i)

  return form ? attributeValue(form[0], 'action') : ''
}

// Every named input in the document, as the body a browser would submit. The caller
// overrides the fields it owns (a username, a password) and posts the rest back
// untouched — antiforgery tokens, an OIDC state and nonce, the id_token itself. None of
// them can be constructed by the test; they are only ever echoed.
export function formFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {}

  for (const input of html.matchAll(/<input[^>]*>/gi)) {
    const name = attributeValue(input[0], 'name')

    if (name) {
      fields[name] = attributeValue(input[0], 'value')
    }
  }

  return fields
}

// The value of the <option> whose text is `optionText`, within the <select> carrying
// `selectId`. Matching on the full text rather than a substring keeps "Beta Tree -
// Automation" from resolving to "Beta Tree - Automation 2". Returns '' when the option is
// absent — a property the account cannot post to — which the caller asserts on.
export function optionValueByText(html: string, selectId: string, optionText: string): string {
  const select = html.match(new RegExp(`<select[^>]*\\bid="${selectId}"[\\s\\S]*?</select>`, 'i'))

  if (!select) {
    return ''
  }

  for (const option of select[0].matchAll(/<option([^>]*)>([\s\S]*?)<\/option>/gi)) {
    if (decodeHtmlEntities(option[2]).trim() === optionText) {
      return attributeValue(`<option${option[1]}>`, 'value')
    }
  }

  return ''
}
