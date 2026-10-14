import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './useStore'
import { kgToTarget, latestWeight, weightTrend, weightsInWindow } from './selectors'
import { validateExportFile } from '../lib/exportFile'

const T0 = new Date(2026, 9, 13, 8, 0, 0).getTime()

beforeEach(() => {
  useStore.getState().resetAll()
})

describe('weights', () => {
  it('adds one weigh-in per day and replaces a second one that day', () => {
    const s = useStore.getState()
    const a = s.addWeight(84.26, '2026-10-13', T0)
    expect(a?.kg).toBe(84.3)
    const b = s.addWeight(83.9, '2026-10-13', T0 + 1000)
    expect(b?.id).toBe(a?.id)
    expect(useStore.getState().weights).toHaveLength(1)
    expect(useStore.getState().weights[0].kg).toBe(83.9)
  })

  it('rejects nonsense and keeps the list sorted by day', () => {
    const s = useStore.getState()
    expect(s.addWeight(0, '2026-10-13', T0)).toBeNull()
    expect(s.addWeight(Number.NaN, '2026-10-13', T0)).toBeNull()
    expect(s.addWeight(600, '2026-10-13', T0)).toBeNull()
    s.addWeight(84, '2026-10-13', T0)
    s.addWeight(85, '2026-10-01', T0)
    s.addWeight(84.5, '2026-10-07', T0)
    expect(useStore.getState().weights.map((w) => w.day)).toEqual(['2026-10-01', '2026-10-07', '2026-10-13'])
  })

  it('updates, deletes and sets the target', () => {
    const s = useStore.getState()
    const w = s.addWeight(84, '2026-10-13', T0)!
    s.updateWeight(w.id, { kg: 83.75, note: '  morning  ' })
    expect(useStore.getState().weights[0]).toMatchObject({ kg: 83.8, note: 'morning' })
    s.setTargetWeight(78)
    expect(useStore.getState().settings.targetWeightKg).toBe(78)
    s.setTargetWeight(Number.NaN)
    s.setTargetWeight(900)
    expect(useStore.getState().settings.targetWeightKg).toBe(78)
    s.setTargetWeight(null)
    expect(useStore.getState().settings.targetWeightKg).toBeUndefined()
    s.deleteWeight(w.id)
    expect(useStore.getState().weights).toHaveLength(0)
    const gone = { ...w, kg: 83.8, note: 'morning' }
    s.restoreWeight(gone)
    expect(useStore.getState().weights).toEqual([gone])
    s.restoreWeight({ ...gone, kg: 0 })
    expect(useStore.getState().weights).toEqual([gone])
  })

  it('computes the seven day trend and the distance to target', () => {
    const s = useStore.getState()
    const day = (d: number) => `2026-10-${String(d).padStart(2, '0')}`
    for (let d = 1; d <= 7; d++) s.addWeight(86, day(d), T0)
    for (let d = 8; d <= 14; d++) s.addWeight(85, day(d), T0)
    const ws = useStore.getState().weights
    expect(weightsInWindow(ws, day(14), 7)).toHaveLength(7)
    const t = weightTrend(ws, day(14))
    expect(t.recent).toBe(85)
    expect(t.previous).toBe(86)
    expect(t.delta).toBe(-1)
    expect(kgToTarget(latestWeight(ws), 80)).toBe(5)
    expect(kgToTarget(latestWeight(ws), undefined)).toBeNull()
    expect(weightTrend([], day(14)).delta).toBeNull()
  })

  it('exports and imports weights, merging by day with the newer winning', () => {
    const s = useStore.getState()
    s.addWeight(84, '2026-10-13', T0)
    s.setTargetWeight(78)
    const file = s.exportData(T0)
    expect(file.version).toBe(3)
    expect(file.weights).toHaveLength(1)
    expect(file.settings.targetWeightKg).toBe(78)
    s.resetAll()
    s.addWeight(90, '2026-10-13', T0 + 5000)
    s.addWeight(91, '2026-10-12', T0)
    s.importData(JSON.parse(JSON.stringify(file)), 'merge')
    const ws = useStore.getState().weights
    expect(ws.map((w) => [w.day, w.kg])).toEqual([
      ['2026-10-12', 91],
      ['2026-10-13', 90],
    ])
    s.importData(file, 'replace')
    expect(useStore.getState().weights.map((w) => w.kg)).toEqual([84])
    expect(useStore.getState().settings.targetWeightKg).toBe(78)
  })

  it('validateExportFile drops bad weigh-ins and reads v2 files without weights', () => {
    const v2 = { app: 'temperance', version: 2, settings: {}, meals: {}, ingredients: {}, entries: [] }
    expect(validateExportFile(v2)?.weights).toEqual([])
    const v3 = {
      app: 'temperance',
      version: 3,
      settings: { targetWeightKg: 1000 },
      meals: {},
      ingredients: {},
      entries: [],
      weights: [
        { id: 'a', day: '2026-10-13', at: 1, kg: 84.44 },
        { id: 'b', day: '2026-10-13', at: 2, kg: 84.1 },
        { id: 'c', day: 'nope', at: 3, kg: 80 },
        { id: 'd', day: '2026-10-12', at: 1, kg: -3 },
      ],
    }
    const out = validateExportFile(v3)!
    expect(out.weights).toEqual([{ id: 'b', day: '2026-10-13', at: 2, kg: 84.1, note: undefined }])
    expect(out.settings.targetWeightKg).toBeUndefined()
  })
})
