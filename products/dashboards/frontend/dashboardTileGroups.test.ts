import type { DashboardTile } from '~/types'

import { getGroupTitlesByTileId } from './dashboardTileGroups'

const tile = (id: number, group_key: string | null): DashboardTile =>
    ({ id, group_key, layouts: {}, color: null }) as DashboardTile

describe('getGroupTitlesByTileId', () => {
    it.each([
        {
            name: 'puts each title on the top-left tile of its group',
            tiles: [tile(1, 'plans'), tile(2, 'plans'), tile(3, 'regions'), tile(4, null)],
            layout: [
                { i: '1', x: 4, y: 0, w: 4, h: 2 },
                { i: '2', x: 0, y: 0, w: 4, h: 2 },
                { i: '3', x: 0, y: 2, w: 4, h: 2 },
                { i: '4', x: 0, y: 4, w: 4, h: 2 },
            ],
            groupTitles: { plans: 'Pricing plans', regions: 'Regions' },
            expected: { 2: 'Pricing plans', 3: 'Regions' },
        },
        {
            name: 'skips groups without a title',
            tiles: [tile(1, 'plans'), tile(2, 'untitled')],
            layout: undefined,
            groupTitles: { plans: 'Pricing plans' },
            expected: { 1: 'Pricing plans' },
        },
        {
            name: 'draws nothing when the dashboard has no group titles',
            tiles: [tile(1, 'plans')],
            layout: undefined,
            groupTitles: undefined,
            expected: {},
        },
    ])('$name', ({ tiles, layout, groupTitles, expected }) => {
        expect(getGroupTitlesByTileId(tiles, layout, groupTitles)).toEqual(expected)
    })
})
