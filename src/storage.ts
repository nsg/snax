import type { AccountInfo } from './storeApi'

const CREDENTIALS_KEY = 'snax.credentials'
const ACCOUNT_KEY = 'snax.account'

export interface CachedAccount {
  fetchedAt: string
  account: AccountInfo
}

export function loadCredentialsText(): string | null {
  return localStorage.getItem(CREDENTIALS_KEY)
}

export function saveCredentialsText(text: string): void {
  localStorage.setItem(CREDENTIALS_KEY, text.trim())
}

export function loadCachedAccount(): CachedAccount | null {
  const value = localStorage.getItem(ACCOUNT_KEY)
  if (value === null) return null

  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Partial<CachedAccount>).fetchedAt === 'string' &&
      typeof (parsed as Partial<CachedAccount>).account === 'object' &&
      (parsed as Partial<CachedAccount>).account !== null
    ) {
      return parsed as CachedAccount
    }
  } catch {
    // Treat corrupt cache data as absent.
  }
  return null
}

export function saveCachedAccount(account: AccountInfo): void {
  const cached: CachedAccount = {
    fetchedAt: new Date().toISOString(),
    account,
  }
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(cached))
}

export function clearAll(): void {
  localStorage.removeItem(CREDENTIALS_KEY)
  localStorage.removeItem(ACCOUNT_KEY)
}
