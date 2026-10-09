import type { SignalScoutConfigApi as SignalScoutConfig } from 'products/signals/frontend/generated/api.schemas'

import type { SignalScoutRunSummary } from '../types'

/** The "Run anyway after" choices, in minutes. Null keeps a quiet scout skipped for as long as it stays quiet. */
export const PRECHECK_MAX_QUIET_OPTIONS: { value: number | null; label: string }[] = [
    { value: null, label: 'Never' },
    { value: 6 * 60, label: '6 hours' },
    { value: 24 * 60, label: '1 day' },
    { value: 3 * 24 * 60, label: '3 days' },
    { value: 7 * 24 * 60, label: '7 days' },
]

/**
 * When the scout's last scheduled tick was skipped by its pre-check, or null when it was not.
 *
 * A skip writes no run row, but the coordinator still stamps `last_run_at` when it dispatches the
 * tick. A tick that ran creates its run row after that stamp, so a stamp newer than the newest run
 * means the tick stopped at the pre-check. A query error or the quiet backstop starts a run, so it
 * never reads as a skip.
 *
 * `runsKnown` must be false while the runs are not loaded, or when the runs response does not cover
 * this scout. Without it, a scout with no run in hand would read as skipped.
 */
export function precheckSkippedAt(
    config: Pick<SignalScoutConfig, 'enabled' | 'precheck_query' | 'last_run_at'>,
    latestRun: Pick<SignalScoutRunSummary, 'created_at'> | null | undefined,
    runsKnown: boolean
): string | null {
    if (!runsKnown || !config.enabled || !config.precheck_query || !config.last_run_at) {
        return null
    }
    if (latestRun && new Date(latestRun.created_at).getTime() >= new Date(config.last_run_at).getTime()) {
        return null
    }
    return config.last_run_at
}
