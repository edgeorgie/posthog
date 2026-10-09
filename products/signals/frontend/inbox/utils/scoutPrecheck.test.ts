import { precheckSkippedAt } from './scoutPrecheck'

const LAST_RUN_AT = '2026-10-09T08:00:00Z'
const PRECHECK = 'SELECT 1 FROM events WHERE timestamp > {since} LIMIT 1'

describe('precheckSkippedAt', () => {
    it.each([
        ['no run row since the last tick', '2026-10-09T06:00:05Z', true, LAST_RUN_AT],
        ['no run in hand at all', null, true, LAST_RUN_AT],
        ['the last tick created a run row', '2026-10-09T08:00:04Z', true, null],
        ['the runs are not loaded yet', null, false, null],
    ])('%s', (_, latestRunCreatedAt, runsKnown, expected) => {
        const latestRun = latestRunCreatedAt ? { created_at: latestRunCreatedAt } : null
        expect(
            precheckSkippedAt(
                { enabled: true, precheck_query: PRECHECK, last_run_at: LAST_RUN_AT },
                latestRun,
                runsKnown
            )
        ).toBe(expected)
    })

    it.each([
        ['has no pre-check', { enabled: true, precheck_query: null, last_run_at: LAST_RUN_AT }],
        ['is turned off', { enabled: false, precheck_query: PRECHECK, last_run_at: LAST_RUN_AT }],
        ['was never dispatched', { enabled: true, precheck_query: PRECHECK, last_run_at: null }],
    ])('never reads a scout that %s as skipped', (_, config) => {
        expect(precheckSkippedAt(config, null, true)).toBeNull()
    })
})
