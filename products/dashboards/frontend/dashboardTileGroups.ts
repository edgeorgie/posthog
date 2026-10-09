import type { Layout } from 'react-grid-layout'

import type { DashboardTile } from '~/types'

/** Maps each titled group to its top-left tile, so the dashboard draws the group title once. */
export function getGroupTitlesByTileId(
    tiles: DashboardTile[],
    smLayout: Layout | undefined,
    groupTitles: Record<string, string> | undefined
): Record<number, string> {
    if (!groupTitles) {
        return {}
    }
    const positions = new Map((smLayout ?? []).map((item) => [item.i, item]))
    const firstTileByGroup = new Map<string, { tileId: number; y: number; x: number }>()

    for (const tile of tiles) {
        if (!tile.group_key || !groupTitles[tile.group_key]) {
            continue
        }
        const position = positions.get(tile.id.toString())
        const y = position?.y ?? Infinity
        const x = position?.x ?? Infinity
        const current = firstTileByGroup.get(tile.group_key)
        if (!current || y < current.y || (y === current.y && x < current.x)) {
            firstTileByGroup.set(tile.group_key, { tileId: tile.id, y, x })
        }
    }

    return Object.fromEntries(
        [...firstTileByGroup.entries()].map(([groupKey, { tileId }]) => [tileId, groupTitles[groupKey]])
    )
}
