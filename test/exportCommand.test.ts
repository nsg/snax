import { describe, expect, it } from 'vitest'

import { buildExportCommand, exportCommandLines } from '../src/exportCommand'
import type { OnboardingState } from '../src/onboarding'

const defaults: OnboardingState = {
  expires: '2026-12-05',
  acls: [
    'package_access',
    'package_metrics',
    'package_release',
    'package_update',
    'package_manage',
  ],
  snaps: '',
}

describe('buildExportCommand', () => {
  it('builds the default command', () => {
    expect(buildExportCommand(defaults)).toBe(
      'snapcraft export-login --acls=package_access,package_metrics,package_release,package_update,package_manage --expires=2026-12-05 snax-login.txt',
    )
  })

  it('includes an optional snaps list', () => {
    expect(buildExportCommand({ ...defaults, snaps: 'snax, other-snap' })).toContain(
      '--snaps=snax,other-snap',
    )
  })

  it('trims snap names and drops empty entries', () => {
    expect(buildExportCommand({ ...defaults, snaps: ' first, ,second, ' })).toBe(
      'snapcraft export-login --acls=package_access,package_metrics,package_release,package_update,package_manage --snaps=first,second --expires=2026-12-05 snax-login.txt',
    )
  })

  it('forces package_access to the front', () => {
    expect(
      buildExportCommand({
        ...defaults,
        acls: ['package_metrics', 'package_access', 'package_manage'],
      }),
    ).toContain('--acls=package_access,package_metrics,package_manage')
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
      'package_access,package_metrics,package_release,package_update,package_manage',
      'snax',
      '2026-12-05',
    ])
  })
})
