import en from './en.json'
import hi from './hi.json'

function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  )
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] ?? '').sort()
}

function valueAt(root: unknown, path: string): string {
  let node = root as Record<string, unknown>
  for (const part of path.split('.')) node = node[part] as Record<string, unknown>
  return node as unknown as string
}

describe('the language files', () => {
  it('hi.json and en.json have the same keys', () => {
    expect(keysOf(hi).sort()).toEqual(keysOf(en).sort())
  })

  it('every text has the same {{placeholders}} in both languages', () => {
    for (const key of keysOf(en)) {
      expect(placeholders(valueAt(hi, key)), key).toEqual(placeholders(valueAt(en, key)))
    }
  })

  it('no text is empty', () => {
    for (const key of keysOf(en)) {
      expect(valueAt(en, key).trim(), key).not.toBe('')
      expect(valueAt(hi, key).trim(), key).not.toBe('')
    }
  })
})

// Reads the code files as plain text. Test files are left out.
const codeFiles = import.meta.glob(
  ['../attendant/**/*.{ts,tsx}', '../auth/LoginPage.tsx', '!../**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

/** Examples in comments may be in Hindi. Only real code must not hold words. */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('texts of the phone app', () => {
  it('no Hindi letter is written in a code file; all words live in hi.json', () => {
    const offenders = Object.entries(codeFiles)
      .filter(([, text]) => /[\u0900-\u097F]/.test(withoutComments(text)))
      .map(([file]) => file)
    expect(offenders).toEqual([])
  })

  it('the check sees a Hindi word in code but not in a comment', () => {
    expect(/[\u0900-\u097F]/.test(withoutComments('const a = "नमस्ते"'))).toBe(true)
    expect(/[\u0900-\u097F]/.test(withoutComments('/** "नमस्ते" */\n// नमस्ते\nconst a = 1'))).toBe(
      false,
    )
  })

  it('the check really reads the login page', () => {
    expect(Object.keys(codeFiles)).toContain('../auth/LoginPage.tsx')
  })
})
