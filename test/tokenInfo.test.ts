import { describe, expect, it } from 'vitest'

import vectors from './fixtures/macaroon-vectors.json'
import { readTokenInfo } from '../src/tokenInfo'

describe('readTokenInfo', () => {
  it('reads permissions and expiry from fixture root caveats', () => {
    expect(
      readTokenInfo({
        kind: 'u1',
        root: vectors.root,
        discharge: vectors.discharge,
      }),
    ).toEqual({
      permissions: ['package_access', 'package_manage', 'package_metrics'],
      expires: '2027-09-06',
    })
  })

  it('omits details for candid credentials', () => {
    expect(readTokenInfo({ kind: 'candid', macaroon: 'opaque' })).toBeNull()
  })
})
