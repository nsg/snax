export interface MacaroonCaveat {
  id: string
  vid?: Uint8Array
  location?: string
}

export interface Macaroon {
  location: string
  identifier: string
  caveats: MacaroonCaveat[]
  signature: Uint8Array
  raw: Uint8Array
  signatureOffset: number
}

export class MacaroonFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MacaroonFormatError'
  }
}

interface Packet {
  key: string
  value: Uint8Array
  valueOffset: number
}

const utf8 = new TextDecoder('utf-8', { fatal: true })

function decodeText(value: Uint8Array, field: string): string {
  try {
    return utf8.decode(value)
  } catch {
    throw new MacaroonFormatError(`${field} is not valid UTF-8`)
  }
}

function decodeBase64(serialized: string): Uint8Array {
  const input = serialized.trim()
  if (input.length === 0 || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(input)) {
    throw new MacaroonFormatError('Invalid macaroon base64 encoding')
  }

  const unpadded = input.replace(/=+$/, '')
  if (unpadded.length % 4 === 1) {
    throw new MacaroonFormatError('Invalid macaroon base64 encoding')
  }

  const standard = unpadded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4)

  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    throw new MacaroonFormatError('Invalid macaroon base64 encoding')
  }
}

function parsePackets(raw: Uint8Array): Packet[] {
  const packets: Packet[] = []
  let offset = 0

  while (offset < raw.length) {
    if (raw.length - offset < 4) {
      throw new MacaroonFormatError('Truncated packet length')
    }

    const lengthText = String.fromCharCode(
      raw[offset]!,
      raw[offset + 1]!,
      raw[offset + 2]!,
      raw[offset + 3]!,
    )
    if (!/^[0-9a-f]{4}$/.test(lengthText)) {
      throw new MacaroonFormatError('Packet length must be four lowercase hexadecimal characters')
    }

    const length = Number.parseInt(lengthText, 16)
    if (length < 7) {
      throw new MacaroonFormatError('Packet length is too short')
    }

    const end = offset + length
    if (end > raw.length) {
      throw new MacaroonFormatError('Truncated macaroon packet')
    }
    if (raw[end - 1] !== 0x0a) {
      throw new MacaroonFormatError('Macaroon packet is missing its trailing newline')
    }

    let separator = -1
    for (let index = offset + 4; index < end - 1; index += 1) {
      if (raw[index] === 0x20) {
        separator = index
        break
      }
    }
    if (separator === -1 || separator === offset + 4) {
      throw new MacaroonFormatError('Macaroon packet has no key/value separator')
    }

    const keyBytes = raw.subarray(offset + 4, separator)
    if (!keyBytes.every((byte) => byte >= 0x21 && byte <= 0x7e)) {
      throw new MacaroonFormatError('Macaroon packet key is not ASCII')
    }

    packets.push({
      key: String.fromCharCode(...keyBytes),
      value: raw.slice(separator + 1, end - 1),
      valueOffset: separator + 1,
    })
    offset = end
  }

  return packets
}

export function parseMacaroonV1(serialized: string): Macaroon {
  const raw = decodeBase64(serialized)
  const packets = parsePackets(raw)

  if (packets[0]?.key !== 'location') {
    throw new MacaroonFormatError('First macaroon packet must be location')
  }
  if (packets[1]?.key !== 'identifier') {
    throw new MacaroonFormatError('Second macaroon packet must be identifier')
  }

  const location = decodeText(packets[0].value, 'Macaroon location')
  const identifier = decodeText(packets[1].value, 'Macaroon identifier')
  const caveats: MacaroonCaveat[] = []
  let index = 2

  while (packets[index]?.key === 'cid') {
    const cid = packets[index]!
    const caveat: MacaroonCaveat = {
      id: decodeText(cid.value, 'Caveat identifier'),
    }
    caveats.push(caveat)
    index += 1

    if (packets[index]?.key === 'vid') {
      caveat.vid = packets[index]!.value.slice()
      index += 1
      if (packets[index]?.key === 'cl') {
        caveat.location = decodeText(packets[index]!.value, 'Caveat location')
        index += 1
      }
    } else if (packets[index]?.key === 'cl') {
      throw new MacaroonFormatError('Caveat location must follow a verification id')
    }
  }

  const signaturePacket = packets[index]
  if (signaturePacket?.key !== 'signature') {
    const unexpected = signaturePacket?.key ?? 'end of input'
    throw new MacaroonFormatError(`Expected signature packet, found ${unexpected}`)
  }
  if (signaturePacket.value.length !== 32) {
    throw new MacaroonFormatError('Macaroon signature must be exactly 32 bytes')
  }
  if (index !== packets.length - 1) {
    throw new MacaroonFormatError('Signature must be the final macaroon packet')
  }

  return {
    location,
    identifier,
    caveats,
    signature: signaturePacket.value.slice(),
    raw,
    signatureOffset: signaturePacket.valueOffset,
  }
}

export function serializeMacaroonV1(raw: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < raw.length; offset += chunkSize) {
    binary += String.fromCharCode(...raw.subarray(offset, offset + chunkSize))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer
}

async function hmac(key: CryptoKey, message: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, arrayBuffer(message)))
}

export async function bindForRequest(root: Macaroon, discharge: Macaroon): Promise<string> {
  const zeroKey = new Uint8Array(32)
  const key = await crypto.subtle.importKey(
    'raw',
    arrayBuffer(zeroKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const h1 = await hmac(key, root.signature)
  const h2 = await hmac(key, discharge.signature)
  const combined = new Uint8Array(h1.length + h2.length)
  combined.set(h1)
  combined.set(h2, h1.length)
  const bound = await hmac(key, combined)

  const raw = discharge.raw.slice()
  raw.set(bound, discharge.signatureOffset)
  return serializeMacaroonV1(raw)
}

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
