import type { OnboardingState } from './onboarding'

export interface CommandPart {
  text: string
  value?: boolean
}

export type CommandLine = CommandPart[]

function commaSeparated(value: string): string {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join(',')
}

function normalizedAcls(acls: readonly string[]): string {
  const entries = acls
    .map((acl) => acl.trim())
    .filter((acl) => acl.length > 0 && acl !== 'package_access')

  return ['package_access', ...new Set(entries)].join(',')
}

export function buildExportCommand(onboarding: OnboardingState): string {
  const acls = normalizedAcls(onboarding.acls)
  const snaps = commaSeparated(onboarding.snaps)
  const snapsOption = snaps.length > 0 ? ` --snaps=${snaps}` : ''

  return `snapcraft export-login --acls=${acls}${snapsOption} --expires=${onboarding.expires.trim()} snax-login.txt`
}

export function exportCommandLines(onboarding: OnboardingState): CommandLine[] {
  const acls = normalizedAcls(onboarding.acls)
  const snaps = commaSeparated(onboarding.snaps)
  const lines: CommandLine[] = [
    [{ text: 'snapcraft export-login \\' }],
    [
      { text: '    --acls=' },
      { text: acls, value: true },
      { text: ' \\' },
    ],
  ]

  if (snaps.length > 0) {
    lines.push([
      { text: '    --snaps=' },
      { text: snaps, value: true },
      { text: ' \\' },
    ])
  }

  lines.push(
    [
      { text: '    --expires=' },
      { text: onboarding.expires.trim(), value: true },
      { text: ' \\' },
    ],
    [{ text: '    snax-login.txt' }],
  )

  return lines
}
