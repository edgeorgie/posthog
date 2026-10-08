import { describe, expect, it, vi } from 'vitest'

import { GENERATED_TOOLS } from '@/tools/generated/feature_flags'
import type { Context } from '@/tools/types'

type FiltersChange = {
    changed: boolean
    narrows: boolean
    conditions_added: number[]
    conditions_changed: Array<{
        properties_added: unknown[]
        properties_changed: Array<{ values_added?: unknown[] }>
    }>
}

type UpdateOutcome = {
    request: ReturnType<typeof vi.fn>
    filtersChange: FiltersChange | undefined
}

function createMockContext(requestMock: ReturnType<typeof vi.fn>): Context {
    return {
        api: {
            request: requestMock,
            getProjectBaseUrl: (projectId: string) => `https://us.posthog.com/project/${projectId}`,
        } as any,
        stateManager: { getProjectId: vi.fn().mockResolvedValue('42') } as any,
        env: {} as any,
        sessionManager: {} as any,
        cache: {} as any,
        getDistinctId: async () => 'test-distinct-id',
        trackEvent: async () => {},
    }
}

const emailFilter = { key: 'email', type: 'person', operator: 'exact', value: ['ada@example.com'] }
const planFilter = { key: 'plan', type: 'person', operator: 'exact', value: ['enterprise'] }
const existingFlag = {
    id: 9,
    key: 'new-editor',
    filters: {
        groups: [
            { properties: [emailFilter], rollout_percentage: 100 },
            { properties: [planFilter], rollout_percentage: 50 },
        ],
        multivariate: null,
        payloads: {},
    },
}

describe('update-feature-flag filters_change', () => {
    const tool = GENERATED_TOOLS['update-feature-flag']!()

    async function updateGroups(groups: unknown[]): Promise<UpdateOutcome> {
        const request = vi
            .fn()
            .mockResolvedValueOnce(existingFlag)
            .mockResolvedValueOnce({ ...existingFlag, filters: { ...existingFlag.filters, groups } })
        const params = tool.schema.parse({ id: 9, filters: { groups } })
        const result = (await tool.handler(createMockContext(request), params)) as { filters_change?: FiltersChange }
        return { request, filtersChange: result.filters_change }
    }

    it('reports narrowing when an is_not filter is added to an existing condition', async () => {
        const blockedOrganizations = {
            key: 'organization_id',
            type: 'person',
            operator: 'is_not',
            value: ['org_blocked'],
        }

        const { filtersChange } = await updateGroups([
            { properties: [emailFilter, blockedOrganizations], rollout_percentage: 100 },
            { properties: [planFilter], rollout_percentage: 50 },
        ])

        expect(filtersChange?.narrows).toBe(true)
        expect(filtersChange?.conditions_changed[0]?.properties_added).toEqual([blockedOrganizations])
    })

    it('reports values added to an exact filter without narrowing', async () => {
        const { filtersChange } = await updateGroups([
            {
                properties: [{ ...emailFilter, value: ['ada@example.com', 'grace@example.com', 'linus@example.com'] }],
                rollout_percentage: 100,
            },
            { properties: [planFilter], rollout_percentage: 50 },
        ])

        expect(filtersChange?.narrows).toBe(false)
        expect(filtersChange?.conditions_changed[0]?.properties_changed[0]?.values_added).toEqual([
            'grace@example.com',
            'linus@example.com',
        ])
    })

    it('reports a condition inserted at index 0 as added', async () => {
        const { filtersChange } = await updateGroups([
            {
                properties: [{ key: 'country', type: 'person', operator: 'exact', value: ['NZ'] }],
                rollout_percentage: 100,
            },
            { properties: [emailFilter], rollout_percentage: 100 },
            { properties: [planFilter], rollout_percentage: 50 },
        ])

        expect(filtersChange?.conditions_added).toEqual([0])
        expect(filtersChange?.conditions_changed).toEqual([])
        expect(filtersChange?.narrows).toBe(false)
    })

    it('treats the same conditions in a different order as unchanged', async () => {
        const { filtersChange } = await updateGroups([
            { properties: [planFilter], rollout_percentage: 50 },
            { properties: [emailFilter], rollout_percentage: 100 },
        ])

        expect(filtersChange?.changed).toBe(false)
    })

    it('omits filters_change and the GET when no filters are sent', async () => {
        const request = vi.fn().mockResolvedValue({ ...existingFlag, name: 'Renamed' })

        const result = await tool.handler(createMockContext(request), tool.schema.parse({ id: 9, name: 'Renamed' }))

        expect(result).not.toHaveProperty('filters_change')
        expect(request).toHaveBeenCalledTimes(1)
    })
})
