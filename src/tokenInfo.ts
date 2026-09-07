import type { Credentials } from './credentials'
import { parseMacaroonV1 } from './macaroon'

export interface TokenInfo {
  permissions: string[]
  expires?: string
}

export const PERMISSION_LABELS: Readonly<Record<string, string>> = {
  package_access: 'See your snaps and revisions',
  package_metrics: 'Read install metrics',
  package_release: 'Release revisions to channels',
  package_update: 'Edit snap listings',
  package_manage: 'Manage collaborators',
  package_push: 'Upload new revisions',
  package_register: 'Register new snap names',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function displayDate(value: string): string {
  const date = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(value.trim())
  return date?.[1] ?? value.trim()
}

function addPermission(permissions: string[], value: string): void {
  const permission = value.trim()
  if (permission.length > 0 && !permissions.includes(permission)) {
    permissions.push(permission)
  }
}

function readJsonCaveat(
  caveat: string,
  permissions: string[],
): { parsed: boolean; expires?: string } {
  let value: unknown
  try {
    value = JSON.parse(caveat)
  } catch {
    return { parsed: false }
  }

  if (!isRecord(value)) return { parsed: false }

  let parsed = false
  if (Array.isArray(value.permissions)) {
    for (const permission of value.permissions) {
      if (typeof permission === 'string') addPermission(permissions, permission)
    }
    parsed = true
  }

  if (typeof value.expires === 'string') {
    return { parsed: true, expires: displayDate(value.expires) }
  }

  return { parsed }
}

export function readTokenInfo(credentials: Credentials): TokenInfo | null {
  if (credentials.kind !== 'u1') return null

  let root
  try {
    root = parseMacaroonV1(credentials.root)
  } catch {
    return null
  }

  const permissions: string[] = []
  let expires: string | undefined
  let parsed = false

  for (const caveat of root.caveats) {
    if (caveat.vid !== undefined || caveat.location !== undefined) continue

    const json = readJsonCaveat(caveat.id, permissions)
    if (json.parsed) {
      parsed = true
      if (json.expires !== undefined) expires = json.expires
      continue
    }

    if (caveat.id.startsWith('acl:')) {
      for (const permission of caveat.id.slice(4).split(',')) {
        addPermission(permissions, permission)
      }
      parsed = true
      continue
    }

    if (caveat.id.startsWith('expires:')) {
      expires = displayDate(caveat.id.slice(8))
      parsed = true
    }
  }

  return parsed ? { permissions, ...(expires === undefined ? {} : { expires }) } : null
}

export const tokenInfo = readTokenInfo

export function permissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] ?? permission
}
