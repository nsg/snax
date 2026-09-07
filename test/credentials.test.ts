import { describe, expect, it } from 'vitest'

import vectors from './fixtures/macaroon-vectors.json'
import {
  CredentialsParseError,
  authorizationHeader,
  parseCredentials,
} from '../src/credentials'

function decodeBase64(text: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(text), (character) => character.charCodeAt(0)),
  )
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  return btoa(String.fromCharCode(...bytes))
}

function expectFixtureCredentials(text: string): void {
  expect(parseCredentials(text)).toEqual({
    kind: 'u1',
    root: vectors.root,
    discharge: vectors.discharge,
  })
}

describe('parseCredentials', () => {
  it('parses current exported-login files with whitespace variants', () => {
    expectFixtureCredentials(vectors.exported_login_file)
    expectFixtureCredentials(`${vectors.exported_login_file}\n`)
    const middle = Math.floor(vectors.exported_login_file.length / 2)
    expectFixtureCredentials(
      `${vectors.exported_login_file.slice(0, middle)}\n${vectors.exported_login_file.slice(middle)}`,
    )
  })

  it('parses a token following the export-login stdout label', () => {
    expectFixtureCredentials(
      `Exported login credentials:\n${vectors.exported_login_file}\n`,
    )
  })

  it('parses a token following terminal noise', () => {
    expectFixtureCredentials(
      `Login successful.\nStarting Snapcraft 8.3.1\nExported login credentials:\n${vectors.exported_login_file}\n`,
    )
  })

  it('parses a token before a trailing shell prompt', () => {
    expectFixtureCredentials(
      `Exported login credentials:\n${vectors.exported_login_file}\nuser@host:~$ `,
    )
  })

  it('rejects garbage-only multi-line terminal output', () => {
    expect(() =>
      parseCredentials('Login successful.\nStarting Snapcraft 8.3.1\nnot-a-token'),
    ).toThrow(CredentialsParseError)
  })

  it('parses the legacy unwrapped JSON export', () => {
    expectFixtureCredentials(vectors.exported_login_file_legacy_json)
  })

  it('parses the old INI export', () => {
    expectFixtureCredentials(vectors.exported_login_file_old_ini)
  })

  it('parses decoded JSON pasted directly', () => {
    expectFixtureCredentials(decodeBase64(vectors.exported_login_file))
  })

  it('parses candid credentials and builds their header', async () => {
    const credentials = parseCredentials(
      encodeBase64(JSON.stringify({ t: 'macaroon', v: 'abc' })),
    )

    expect(credentials).toEqual({ kind: 'candid', macaroon: 'abc' })
    await expect(authorizationHeader(credentials)).resolves.toBe('Macaroon abc')
  })

  it.each([
    ['plain text', 'hello'],
    ['empty input', ''],
    ['unsupported token type', encodeBase64(JSON.stringify({ t: 'other' }))],
    [
      'unsupported token type with legacy-looking fields',
      JSON.stringify({ t: 'other', r: vectors.root, d: vectors.discharge }),
    ],
    ['invalid root macaroon', JSON.stringify({ r: 'invalid', d: vectors.discharge })],
  ])('rejects %s', (_label, text) => {
    expect(() => parseCredentials(text)).toThrow(CredentialsParseError)
  })
})

describe('authorizationHeader', () => {
  it('binds Ubuntu One credentials and produces the exact header', async () => {
    const credentials = parseCredentials(vectors.exported_login_file)

    await expect(authorizationHeader(credentials)).resolves.toBe(
      vectors.authorization_header,
    )
  })
})
