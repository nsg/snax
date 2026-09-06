import { authorizationHeader, type Credentials } from './credentials'

const DASHBOARD = 'https://dashboard.snapcraft.io'

export interface SnapRegistration {
  since?: string
  private?: boolean
  status?: string
  'snap-id'?: string
  [key: string]: unknown
}

export interface AccountInfo {
  account_id?: string
  username?: string
  displayname?: string
  email?: string
  snaps?: Record<string, Record<string, SnapRegistration>>
  account_keys?: unknown
  [key: string]: unknown
}

export class StoreError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'StoreError'
    this.status = status
    this.code = code
  }
}

export class NetworkError extends Error {
  constructor() {
    super('Could not reach dashboard.snapcraft.io (network error or the request was blocked)')
    this.name = 'NetworkError'
  }
}

interface StoreErrorItem {
  code?: unknown
  message?: unknown
}

function errorDetails(body: unknown): { message?: string; code?: string } {
  if (typeof body !== 'object' || body === null) return {}
  const record = body as Record<string, unknown>
  const list = record.error_list ?? record['error-list']
  if (!Array.isArray(list)) return {}

  const items = list.filter(
    (item): item is StoreErrorItem => typeof item === 'object' && item !== null,
  )
  const messages = items
    .map((item) => item.message)
    .filter((message): message is string => typeof message === 'string' && message.length > 0)
  const firstCode = items.find((item) => typeof item.code === 'string')?.code
  return {
    message: messages.length > 0 ? messages.join('; ') : undefined,
    code: typeof firstCode === 'string' ? firstCode : undefined,
  }
}

async function responseBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export async function fetchAccount(creds: Credentials): Promise<AccountInfo> {
  const authorization = await authorizationHeader(creds)
  let response: Response

  try {
    response = await fetch(`${DASHBOARD}/dev/api/account`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
      },
      credentials: 'omit',
    })
  } catch {
    throw new NetworkError()
  }

  if (!response.ok) {
    const details = errorDetails(await responseBody(response))
    const fallback = response.status === 401 ? 'Unauthorized' : response.statusText || 'Store request failed'
    throw new StoreError(details.message ?? fallback, response.status, details.code)
  }

  return (await response.json()) as AccountInfo
}
