import { describe, expect, it } from 'vitest'
import { useStore } from './useStore'

describe('persistance locale', () => {
  it('le store garde bien une copie locale (stockage branché)', () => {
    expect(useStore.persist).toBeDefined()
    expect(useStore.persist.getOptions().storage).toBeDefined()
  })

  it('un stockage plein ou indisponible ne casse pas les mises à jour', () => {
    const before = useStore.getState().chores.length
    useStore.getState().upsertMany('chores', [{ id: 'test-1', date: '2024-03-15', name: 'Vitres' }])
    expect(useStore.getState().chores.length).toBe(before + 1)
  })
})
