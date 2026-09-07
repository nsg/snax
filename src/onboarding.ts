export interface OnboardingState {
  expires: string
  acls: string[]
  snaps: string
}

export const ONBOARDING_KEY = 'snax.onboarding'

export const DEFAULT_ACLS = [
  'package_access',
  'package_metrics',
  'package_release',
  'package_update',
  'package_manage',
] as const

function localDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function defaultOnboarding(today = new Date()): OnboardingState {
  const expires = new Date(today)
  expires.setDate(expires.getDate() + 90)

  return {
    expires: localDate(expires),
    acls: [...DEFAULT_ACLS],
    snaps: '',
  }
}

function isOnboardingState(value: unknown): value is OnboardingState {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<OnboardingState>
  return (
    typeof candidate.expires === 'string' &&
    Array.isArray(candidate.acls) &&
    candidate.acls.every((acl) => typeof acl === 'string') &&
    typeof candidate.snaps === 'string'
  )
}

export function loadOnboarding(): OnboardingState {
  const stored = sessionStorage.getItem(ONBOARDING_KEY)
  if (stored === null) return defaultOnboarding()

  try {
    const parsed: unknown = JSON.parse(stored)
    if (isOnboardingState(parsed)) {
      return {
        expires: parsed.expires,
        acls: [...parsed.acls],
        snaps: parsed.snaps,
      }
    }
  } catch {
    // Treat invalid session data as absent.
  }

  return defaultOnboarding()
}

export function saveOnboarding(state: OnboardingState): void {
  sessionStorage.setItem(ONBOARDING_KEY, JSON.stringify(state))
}
