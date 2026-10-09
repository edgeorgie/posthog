import { useActions, useValues } from 'kea'
import { useEffect, useState } from 'react'

import {
    LemonButton,
    LemonCollapse,
    LemonDialog,
    LemonSelect,
    LemonSwitch,
    LemonTag,
    LemonTextArea,
} from '@posthog/lemon-ui'

import { humanFriendlyDetailedTime } from 'lib/utils/datetime'

import type {
    PatchedSignalScoutConfigUpdateApi as SignalScoutConfigUpdate,
    SignalScoutConfigApi as SignalScoutConfig,
    SignalScoutPrecheckTestApi,
} from 'products/signals/frontend/generated/api.schemas'

import type { ScoutSurface } from '../../../inboxAnalytics'
import { scoutPrecheckLogic } from '../../../logics/scoutPrecheckLogic'
import { PRECHECK_MAX_QUIET_OPTIONS } from '../../../utils/scoutPrecheck'

const QUERY_PLACEHOLDER = `SELECT count() AS errors
FROM events
WHERE event = '$exception' AND timestamp > {since}
HAVING errors > 10`

function testVerdict(result: SignalScoutPrecheckTestApi): string {
    switch (result.reason) {
        case 'no_rows':
            return 'The next scheduled run skips. The query found no rows.'
        case 'rows':
            return `The next scheduled run starts. The query found ${result.row_count} ${result.row_count === 1 ? 'row' : 'rows'}.`
        case 'max_quiet':
            return 'The next scheduled run starts without the query, because the last run is older than the "Run anyway after" limit.'
        case 'query_error':
            return 'The next scheduled run starts, because a query that fails never skips a run.'
    }
}

/**
 * The pre-check of one scout in its settings form: a HogQL query that a scheduled run checks
 * before it starts. No rows skips the run, so a scout that watches a quiet surface costs nothing
 * between bursts.
 *
 * The query does not save on change, like the record schema. A half-typed query would fail on the
 * next tick, so the editor stages a draft, the test button tries it, and the save button commits it.
 */
export function ScoutPrecheckSection({
    config,
    onUpdate,
    updating = false,
    surface,
    onUnsavedChange,
}: {
    config: SignalScoutConfig
    onUpdate: (configId: string, updates: SignalScoutConfigUpdate) => void
    updating?: boolean
    surface: ScoutSurface
    /** Called when the editor gains or loses an unsaved edit, so a host modal can guard its backdrop. */
    onUnsavedChange?: (unsaved: boolean) => void
}): JSX.Element {
    const logic = scoutPrecheckLogic({ configId: config.id, skillName: config.skill_name, surface })
    const { testRun, testRunLoading, testRunFailed } = useValues(logic)
    const { testPrecheck } = useActions(logic)
    const saved = config.precheck_query ?? null
    // Null until something is typed, so an untouched editor follows the saved query.
    const [draft, setDraft] = useState<string | null>(null)
    // The query the last save or turn-off sent, held until the request settles. The draft clears
    // only if the stored query then matches it, so a query the API rejects stays on screen to fix.
    const [submitted, setSubmitted] = useState<{ query: string | null } | null>(null)
    useEffect(() => {
        if (updating || !submitted) {
            return
        }
        if (saved === submitted.query) {
            setDraft(null)
        }
        setSubmitted(null)
    }, [updating, submitted, saved])
    const text = draft ?? saved ?? ''
    const query = text.trim()
    const changed = query !== (saved ?? '')
    const unsaved = draft !== null && (changed || submitted !== null)
    useEffect(() => {
        onUnsavedChange?.(unsaved)
        return () => onUnsavedChange?.(false)
    }, [unsaved, onUnsavedChange])
    // A result describes the query it ran. Once the text changes, it no longer applies.
    const result = testRun && testRun.query === query ? testRun.result : null
    const disabledReason = updating ? 'Saving scout settings' : undefined
    const saveDisabledReason =
        disabledReason ??
        (query && changed ? undefined : !query && saved ? 'To remove the query, use Turn off' : 'No changes to save')

    return (
        <div className="border-t border-primary pt-2">
            <LemonCollapse
                embedded
                size="small"
                panels={[
                    {
                        key: 'precheck',
                        dataAttr: 'scout-precheck',
                        header: (
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                <span className="shrink-0 text-xs text-default">Run only when</span>
                                {saved ? (
                                    <LemonTag size="small" type="option">
                                        Query set
                                    </LemonTag>
                                ) : (
                                    <span className="text-[11.5px] text-muted">Always run</span>
                                )}
                            </div>
                        ),
                        content: (
                            <div className="flex flex-col gap-2">
                                <span className="text-[11.5px] text-muted">
                                    A HogQL query that each scheduled run checks first. When it returns no rows, the
                                    scout skips the run, so a quiet scout costs nothing. Use {'{since}'} for the start
                                    of the last run and {'{now}'} for the current time. A manual run always starts.
                                </span>
                                <LemonTextArea
                                    value={text}
                                    placeholder={QUERY_PLACEHOLDER}
                                    minRows={4}
                                    maxRows={12}
                                    className="font-mono text-[11.5px]"
                                    disabled={updating}
                                    onChange={setDraft}
                                    aria-label={`${config.skill_name} pre-check query`}
                                />
                                {testRunFailed ? (
                                    <span role="alert" className="text-[11.5px] text-danger">
                                        The test could not run. Try again.
                                    </span>
                                ) : null}
                                {result ? (
                                    <div
                                        className="flex flex-col gap-1 ph-no-capture ph-replay-block"
                                        data-attr="scout-precheck-result"
                                    >
                                        <span
                                            className={`text-[11.5px] ${result.would_run ? 'text-default' : 'text-success'}`}
                                        >
                                            {testVerdict(result)}
                                        </span>
                                        {result.error ? (
                                            <span className="text-[11.5px] text-danger">{result.error}</span>
                                        ) : null}
                                        <span className="text-[11.5px] text-muted">
                                            {'{since}'} is {humanFriendlyDetailedTime(result.since)}.
                                        </span>
                                        {result.rows_text ? (
                                            <pre className="m-0 max-h-40 overflow-auto rounded border border-primary bg-surface-secondary p-2 font-mono text-[11px] whitespace-pre-wrap break-all">
                                                {result.rows_text}
                                            </pre>
                                        ) : null}
                                    </div>
                                ) : null}
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {saved ? (
                                        <LemonButton
                                            size="small"
                                            type="secondary"
                                            status="danger"
                                            className="mr-auto"
                                            disabledReason={disabledReason}
                                            onClick={() =>
                                                LemonDialog.open({
                                                    title: 'Remove the pre-check?',
                                                    description:
                                                        'Every scheduled run starts again. You can add a query again later.',
                                                    primaryButton: {
                                                        children: 'Turn off',
                                                        status: 'danger',
                                                        onClick: () => {
                                                            onUpdate(config.id, { precheck_query: null })
                                                            setSubmitted({ query: null })
                                                        },
                                                        'data-attr': 'scout-precheck-clear',
                                                    },
                                                    secondaryButton: { children: 'Cancel' },
                                                })
                                            }
                                            data-attr="scout-precheck-turn-off"
                                        >
                                            Turn off
                                        </LemonButton>
                                    ) : null}
                                    {unsaved ? (
                                        <LemonButton
                                            size="small"
                                            type="tertiary"
                                            disabledReason={disabledReason}
                                            onClick={() => setDraft(null)}
                                            data-attr="scout-precheck-discard"
                                        >
                                            Discard
                                        </LemonButton>
                                    ) : null}
                                    <LemonButton
                                        size="small"
                                        type="secondary"
                                        loading={testRunLoading}
                                        disabledReason={
                                            testRunLoading
                                                ? 'Testing the query'
                                                : query
                                                  ? undefined
                                                  : 'Write a query first'
                                        }
                                        onClick={() => testPrecheck(query)}
                                        data-attr="scout-precheck-test"
                                    >
                                        Test query
                                    </LemonButton>
                                    <LemonButton
                                        size="small"
                                        type="secondary"
                                        loading={updating}
                                        disabledReason={saveDisabledReason}
                                        onClick={() => {
                                            onUpdate(config.id, { precheck_query: query })
                                            setSubmitted({ query })
                                        }}
                                        data-attr="scout-precheck-save"
                                    >
                                        Save query
                                    </LemonButton>
                                </div>
                                {saved ? (
                                    <>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex min-w-0 flex-col">
                                                <span className="text-xs text-default">Give the rows to the scout</span>
                                                <span className="text-[11.5px] text-muted">
                                                    A run that the query starts gets the rows the query found, so it
                                                    starts from them.
                                                </span>
                                            </div>
                                            <LemonSwitch
                                                size="small"
                                                checked={config.precheck_pass_rows}
                                                disabledReason={disabledReason}
                                                onChange={(checked) =>
                                                    onUpdate(config.id, { precheck_pass_rows: checked })
                                                }
                                                aria-label={`${config.skill_name} give the pre-check rows to the scout`}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex min-w-0 flex-col">
                                                <span className="text-xs text-default">Run anyway after</span>
                                                <span className="text-[11.5px] text-muted">
                                                    When the last run is this old, the next scheduled run starts without
                                                    the query. This keeps the scout's memory current.
                                                </span>
                                            </div>
                                            <LemonSelect
                                                size="small"
                                                value={config.precheck_max_quiet_minutes ?? null}
                                                // A value set through the API can be one the menu does not offer.
                                                // Keep it selected and hidden, so that opening the menu does not lose it.
                                                options={
                                                    config.precheck_max_quiet_minutes &&
                                                    !PRECHECK_MAX_QUIET_OPTIONS.some(
                                                        (option) => option.value === config.precheck_max_quiet_minutes
                                                    )
                                                        ? [
                                                              ...PRECHECK_MAX_QUIET_OPTIONS,
                                                              {
                                                                  value: config.precheck_max_quiet_minutes,
                                                                  label: `${config.precheck_max_quiet_minutes} minutes`,
                                                                  hidden: true,
                                                              },
                                                          ]
                                                        : PRECHECK_MAX_QUIET_OPTIONS
                                                }
                                                disabledReason={disabledReason}
                                                className="w-44"
                                                onChange={(value) => {
                                                    if (value !== (config.precheck_max_quiet_minutes ?? null)) {
                                                        onUpdate(config.id, { precheck_max_quiet_minutes: value })
                                                    }
                                                }}
                                                aria-label={`${config.skill_name} run anyway after`}
                                            />
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        ),
                    },
                ]}
            />
        </div>
    )
}
