export interface OnboardingState {
  expires: string
  snaps: string
}

export const ONBOARDING_KEY = 'snax.onboarding'

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
    snaps: '',
  }
}

export function loadOnboarding(): OnboardingState {
  const stored = sessionStorage.getItem(ONBOARDING_KEY)
  if (stored === null) return defaultOnboarding()

  try {
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const candidate = parsed as Record<string, unknown>
      const defaults = defaultOnboarding()

      return {
        expires:
          typeof candidate.expires === 'string' ? candidate.expires : defaults.expires,
        snaps: typeof candidate.snaps === 'string' ? candidate.snaps : defaults.snaps,
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
