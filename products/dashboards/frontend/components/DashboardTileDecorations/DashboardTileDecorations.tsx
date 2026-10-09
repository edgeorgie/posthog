import './DashboardTileDecorations.scss'

import * as hooligan from '@posthog/brand/hoggies/png/hooligan'
import { IconCrown } from '@posthog/icons'

import { pngHoggie } from 'lib/brand/hoggies'

import type { DashboardTileBadge } from '~/types'

const CheekyHog = pngHoggie(hooligan)

interface DashboardTileDecorationsProps {
    badge?: DashboardTileBadge | null
    groupTitle?: string
}

export function DashboardTileDecorations({ badge, groupTitle }: DashboardTileDecorationsProps): JSX.Element | null {
    if (!badge && !groupTitle) {
        return null
    }
    return (
        <>
            {groupTitle && <div className="DashboardTileDecorations__group-title">{groupTitle}</div>}
            {badge === 'winner' && (
                <div className="DashboardTileDecorations__crown" role="img" aria-label="Winner">
                    <IconCrown />
                </div>
            )}
            {badge === 'cheeky-hog' && (
                <div className="DashboardTileDecorations__hog" aria-hidden>
                    <CheekyHog className="w-12 h-12" />
                </div>
            )}
        </>
    )
}
