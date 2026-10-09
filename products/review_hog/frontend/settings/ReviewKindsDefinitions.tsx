// The Standard wording is still under test, so it lives in one place to swap.
const STANDARD_DEFINITION =
    'runs automatically on every push. The same set of reviewers reads the whole change and comments with issues for you to fix. It never pushes to your branch and ignores the Deep review settings below.'

const DEEP_DEFINITION =
    'a longer review someone asks for, for changes that need extra care: the Review button, the reviewhog label, or an Inbox report assigned to you. It adds the perspectives, quality bar and threshold you pick below, and can fix review comments on your branch if you turn Resolve on. It takes longer and costs several times more than Standard.'

/** Defines Standard and Deep once, at the top of the Settings tab, so the sections below can use the names. */
export function ReviewKindsDefinitions(): JSX.Element {
    return (
        <section className="flex flex-col gap-2 rounded border border-primary bg-surface-primary px-4 py-3">
            <h3 className="m-0 text-base font-semibold">Two kinds of review</h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                <li>
                    <strong>Standard:</strong> {STANDARD_DEFINITION}
                </li>
                <li>
                    <strong>Deep:</strong> {DEEP_DEFINITION}
                </li>
            </ul>
            <p className="m-0 text-xs text-secondary">
                The rules below decide who gets automatic reviews. No automatic review runs on a pull request after it
                had a Deep review.
            </p>
        </section>
    )
}
