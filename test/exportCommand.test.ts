import { describe, expect, it } from 'vitest'

import {
  REQUIRED_ACLS,
  buildExportCommand,
  exportCommandLines,
} from '../src/exportCommand'
import type { ExportOptions } from '../src/exportCommand'

const defaults: ExportOptions = {
  expires: '2026-12-05',
  snaps: '',
}

describe('buildExportCommand', () => {
  it('builds the default command', () => {
    expect(buildExportCommand(defaults)).toBe(
      'snapcraft export-login --acls=package_access,package_metrics,package_release --expires=2026-12-05 -',
    )
  })

  it('includes an optional snaps list', () => {
    expect(buildExportCommand({ ...defaults, snaps: 'snax, other-snap' })).toContain(
      '--snaps=snax,other-snap',
    )
  })

  it('trims snap names and drops empty entries', () => {
    expect(buildExportCommand({ ...defaults, snaps: ' first, ,second, ' })).toBe(
      'snapcraft export-login --acls=package_access,package_metrics,package_release --snaps=first,second --expires=2026-12-05 -',
    )
  })

  it('uses the required ACLs verbatim and writes the token to stdout', () => {
    const command = buildExportCommand(defaults)

    expect(command).toContain(`--acls=${REQUIRED_ACLS.join(',')}`)
    expect(command.split(/\s+/).at(-1)).toBe('-')
  })
})

describe('exportCommandLines', () => {
  it('round-trips to the shell command', () => {
    const onboarding = { ...defaults, snaps: 'snax, other-snap' }
    const displayed = exportCommandLines(onboarding)
      .map((line) => line.map((part) => part.text).join('').replace(/^\s+| \\$/g, ''))
      .join(' ')

    expect(displayed).toBe(buildExportCommand(onboarding))
  })

  it('marks only option values for highlighting', () => {
    const highlighted = exportCommandLines({ ...defaults, snaps: 'snax' })
      .flat()
      .filter((part) => part.value)
      .map((part) => part.text)

    expect(highlighted).toEqual([
      'snax',
      '2026-12-05',
    ])
  })
})
