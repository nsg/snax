import { describe, expect, it } from 'vitest'

import vectors from './fixtures/macaroon-vectors.json'
import {
  MacaroonFormatError,
  bindForRequest,
  hex,
  parseMacaroonV1,
  serializeMacaroonV1,
} from '../src/macaroon'

function decode(serialized: string): Uint8Array {
  const standard = serialized.replace(/-/g, '+').replace(/_/g, '/')
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function standardBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function withoutSequence(bytes: Uint8Array, sequence: Uint8Array): Uint8Array {
  const start = bytes.findIndex((_, index) =>
    sequence.every((byte, offset) => bytes[index + offset] === byte),
  )
  if (start < 0) throw new Error('Test sequence not found')
  const result = new Uint8Array(bytes.length - sequence.length)
  result.set(bytes.subarray(0, start))
  result.set(bytes.subarray(start + sequence.length), start)
  return result
}

describe('parseMacaroonV1', () => {
  it('parses the root macaroon and its caveats', () => {
    const root = parseMacaroonV1(vectors.root)

    expect(root.location).toBe('')
    expect(root.identifier).toBe('root-key-id-1234')
    expect(root.caveats).toHaveLength(3)
    expect(root.caveats[0]).toEqual({
      id: 'acl:package_access,package_manage,package_metrics',
    })
    expect(root.caveats[1]).toEqual({ id: 'expires:2027-09-06T00:00:00' })
    expect(root.caveats[2]).toMatchObject({
      id: 'u1-caveat-id-5678',
      location: 'login.ubuntu.com',
    })
    expect(root.caveats[2]?.vid).toBeInstanceOf(Uint8Array)
    expect(root.caveats[2]?.vid?.length).toBeGreaterThan(0)
    expect(hex(root.signature)).toBe(vectors.root_signature_hex)
  })

  it('parses the discharge macaroon', () => {
    const discharge = parseMacaroonV1(vectors.discharge)

    expect(discharge.location).toBe('login.ubuntu.com')
    expect(discharge.identifier).toBe('u1-caveat-id-5678')
    expect(discharge.caveats).toHaveLength(2)
    expect(hex(discharge.signature)).toBe(vectors.discharge_signature_hex)
  })

  it('accepts padding and the standard base64 alphabet', () => {
    const expectedRoot = parseMacaroonV1(vectors.root).raw
    const expectedDischarge = parseMacaroonV1(vectors.discharge).raw
    const padding = '='.repeat((4 - (vectors.discharge.length % 4)) % 4)
    const padded = parseMacaroonV1(vectors.discharge + padding)
    const standard = parseMacaroonV1(standardBase64(expectedRoot))

    expect(padded.raw).toEqual(expectedDischarge)
    expect(standard.raw).toEqual(expectedRoot)
  })

  it('accepts a third-party caveat without a location packet', () => {
    const raw = decode(vectors.root)
    const locationPacket = new TextEncoder().encode('0018cl login.ubuntu.com\n')
    const parsed = parseMacaroonV1(
      serializeMacaroonV1(withoutSequence(raw, locationPacket)),
    )

    expect(parsed.caveats[2]?.vid).toBeInstanceOf(Uint8Array)
    expect(parsed.caveats[2]?.location).toBeUndefined()
  })

  it.each([
    ['garbage', 'not a macaroon!'],
    ['truncated packet', serializeMacaroonV1(decode(vectors.root).slice(0, -1))],
  ])('rejects %s', (_label, serialized) => {
    expect(() => parseMacaroonV1(serialized)).toThrow(MacaroonFormatError)
  })

  it('rejects a signature of the wrong length', () => {
    const raw = decode(vectors.discharge)
    const shortened = new Uint8Array(raw.length - 1)
    shortened.set(raw.slice(0, -2))
    shortened[shortened.length - 1] = 0x0a
    const packetStart = shortened.length - 46
    shortened.set(new TextEncoder().encode('002e'), packetStart)

    expect(() => parseMacaroonV1(serializeMacaroonV1(shortened))).toThrow(
      MacaroonFormatError,
    )
  })
})

describe('bindForRequest', () => {
  it('binds the discharge signature to the root signature', async () => {
    const root = parseMacaroonV1(vectors.root)
    const discharge = parseMacaroonV1(vectors.discharge)
    const bound = await bindForRequest(root, discharge)

    expect(bound).toBe(vectors.bound_discharge)
    expect(hex(parseMacaroonV1(bound).signature)).toBe(vectors.bound_signature_hex)
  })
})
