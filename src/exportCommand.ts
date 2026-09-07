export interface CommandPart {
  text: string
  value?: boolean
}

export type CommandLine = CommandPart[]

export const REQUIRED_ACLS: readonly string[] = [
  'package_access',
  'package_metrics',
  'package_release',
]

export interface ExportOptions {
  expires: string
  snaps: string
}

function commaSeparated(value: string): string {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join(',')
}

export function buildExportCommand(options: ExportOptions): string {
  const acls = REQUIRED_ACLS.join(',')
  const snaps = commaSeparated(options.snaps)
  const snapsOption = snaps.length > 0 ? ` --snaps=${snaps}` : ''

  return `snapcraft export-login --acls=${acls}${snapsOption} --expires=${options.expires.trim()} -`
}

export function exportCommandLines(options: ExportOptions): CommandLine[] {
  const acls = REQUIRED_ACLS.join(',')
  const snaps = commaSeparated(options.snaps)
  const lines: CommandLine[] = [
    [{ text: 'snapcraft export-login \\' }],
    [{ text: `    --acls=${acls} \\` }],
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
      { text: options.expires.trim(), value: true },
      { text: ' \\' },
    ],
    [{ text: '    -' }],
  )

  return lines
}
