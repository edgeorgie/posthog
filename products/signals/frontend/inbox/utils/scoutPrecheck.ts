/** The "Run anyway after" choices, in minutes. Null keeps a quiet scout skipped for as long as it stays quiet. */
export const PRECHECK_MAX_QUIET_OPTIONS: { value: number | null; label: string }[] = [
    { value: null, label: 'Never' },
    { value: 6 * 60, label: '6 hours' },
    { value: 24 * 60, label: '1 day' },
    { value: 3 * 24 * 60, label: '3 days' },
    { value: 7 * 24 * 60, label: '7 days' },
]
