import {
  MacaroonFormatError,
  bindForRequest,
  parseMacaroonV1,
} from './macaroon'

export type Credentials =
  | { kind: 'u1'; root: string; discharge: string }
  | { kind: 'candid'; macaroon: string }

export class CredentialsParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CredentialsParseError'
  }
}

function decodeBase64Text(text: string): string {
  const compact = text.replace(/\s/g, '')
  if (compact.length === 0 || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(compact)) {
    throw new CredentialsParseError('The pasted login token was not recognised.')
  }

  const unpadded = compact.replace(/=+$/, '')
  if (unpadded.length % 4 === 1) {
    throw new CredentialsParseError('The pasted login token was not recognised.')
  }
  const standard = unpadded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4)

  try {
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new CredentialsParseError('The pasted login token was not recognised.')
  }
}

function validateUbuntuOne(root: string, discharge: string): Credentials {
  try {
    parseMacaroonV1(root)
  } catch (error) {
    const detail = error instanceof MacaroonFormatError ? `: ${error.message}` : ''
    throw new CredentialsParseError(`The root macaroon is invalid${detail}.`)
  }

  try {
    parseMacaroonV1(discharge)
  } catch (error) {
    const detail = error instanceof MacaroonFormatError ? `: ${error.message}` : ''
    throw new CredentialsParseError(`The discharge macaroon is invalid${detail}.`)
  }

  return { kind: 'u1', root, discharge }
}

function parseIni(text: string): Credentials {
  let root: string | undefined
  let discharge: string | undefined

  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(macaroon|unbound_discharge)\s*=\s*(.*?)\s*$/.exec(line)
    if (match?.[1] === 'macaroon') root = match[2]
    if (match?.[1] === 'unbound_discharge') discharge = match[2]
  }

  if (!root || !discharge) {
    throw new CredentialsParseError(
      'The old-style login file must contain macaroon and unbound_discharge values.',
    )
  }
  return validateUbuntuOne(root, discharge)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(text: string): Credentials {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new CredentialsParseError('The login token contains invalid JSON.')
  }

  if (!isRecord(parsed)) {
    throw new CredentialsParseError('The login token has an unsupported credentials format.')
  }

  if (parsed.t === 'u1-macaroon' && isRecord(parsed.v)) {
    const { r, d } = parsed.v
    if (typeof r === 'string' && typeof d === 'string') {
      return validateUbuntuOne(r, d)
    }
  }

  if (
    parsed.t === undefined &&
    typeof parsed.r === 'string' &&
    typeof parsed.d === 'string'
  ) {
    return validateUbuntuOne(parsed.r, parsed.d)
  }

  if (parsed.t === 'macaroon' && typeof parsed.v === 'string') {
    return { kind: 'candid', macaroon: parsed.v }
  }

  throw new CredentialsParseError('The login token has an unsupported credentials format.')
}

function parseCredentialsPayload(text: string): Credentials {
  const trimmed = text.trim()
  if (trimmed.startsWith('[login.ubuntu.com]')) {
    return parseIni(trimmed)
  }
  if (trimmed.startsWith('{')) {
    return parseJson(trimmed)
  }

  const decoded = decodeBase64Text(trimmed)
  if (!decoded.startsWith('{')) {
    throw new CredentialsParseError('The pasted login token was not recognised.')
  }
  return parseJson(decoded)
}

export function parseCredentials(text: string): Credentials {
  const trimmed = text.trim()
  let originalError: CredentialsParseError

  try {
    return parseCredentialsPayload(trimmed)
  } catch (error) {
    if (!(error instanceof CredentialsParseError)) throw error
    originalError = error
  }

  const candidates = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^Exported login credentials:?$/i.test(line) &&
        !/\s/.test(line),
    )

  for (const candidate of candidates.reverse()) {
    try {
      return parseCredentialsPayload(candidate)
    } catch (error) {
      if (!(error instanceof CredentialsParseError)) throw error
    }
  }

  throw originalError
}

export async function authorizationHeader(creds: Credentials): Promise<string> {
  if (creds.kind === 'candid') {
    return `Macaroon ${creds.macaroon}`
  }

  const root = parseMacaroonV1(creds.root)
  const discharge = parseMacaroonV1(creds.discharge)
  const bound = await bindForRequest(root, discharge)
  return `Macaroon root=${creds.root}, discharge=${bound}`
}
