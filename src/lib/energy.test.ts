import { describe, expect, it } from 'vitest'
import { balanceStats, dayEnergy, dayIntake, energyHistory, runKcal } from './energy'
import { cleanEstimate } from './foodAi'
import { FOODS, portionValues, searchFoods } from '../data/foods'
import { parseDailyHealth } from './coros'
import { emptyData } from '../store/useStore'
import { addDaysISO } from './format'
import type { AppData, FoodEntry } from '../types'

const base = (): AppData => ({ ...emptyData(), profile: { ...emptyData().profile, sex: 'M', birthYear: 1998, heightCm: 185, weightKg: 77, activityLevel: 'sedentaire', calorieGoal: 'maintien' } })
const meal = (date: string, kcal: number, id = `${date}-${kcal}`): FoodEntry => ({ id, date, slot: 'dejeuner', name: 'Repas', kcal })

describe('besoins', () => {
  it('métabolisme + vie quotidienne + digestion un jour sans sport', () => {
    const e = dayEnergy(base(), '2026-11-10', '2026-11-20')
    // Mifflin : 10×77 + 6,25×185 − 5×28 + 5 = 1791
    expect(e.bmr).toBe(1791)
    expect(e.daily).toBe(Math.round(1791 * 0.25))
    expect(e.expenditure).toBe(e.bmr + e.daily + e.tef)
    expect(e.target).toBe(Math.round(e.expenditure / 10) * 10)
    expect(e.source).toBe('estimation')
  })
  it('ajoute la séance du jour et l’objectif de perte', () => {
    const d = base()
    d.profile.calorieGoal = 'perte'
    d.runs = [{ id: 'r', date: '2026-11-10', type: 'ef', distanceKm: 10, durationSec: 3600, calories: 850 }]
    const e = dayEnergy(d, '2026-11-10', '2026-11-20')
    expect(e.sport).toBe(Math.round(runKcal(d.runs[0], d.profile)))
    expect(e.sport).toBeGreaterThan(700)
    expect(e.target).toBe(Math.round((e.expenditure - 350) / 10) * 10)
  })
  it('utilise les calories actives de la montre quand elle a été portée', () => {
    const d = base()
    d.activity = [
      { id: 'a', date: '2026-11-10', steps: 12000, activeKcal: 950 },
      { id: 'b', date: '2026-11-11', steps: 200, activeKcal: 20 },
    ]
    expect(dayEnergy(d, '2026-11-10', '2026-11-20')).toMatchObject({ source: 'montre', measuredActive: 950, daily: 0 })
    expect(dayEnergy(d, '2026-11-11', '2026-11-20').source).toBe('estimation')
  })
  it('compte la séance prévue aujourd’hui', () => {
    const d = base()
    d.planned = [{ id: 'p', date: '2026-11-20', kind: 'run', title: 'EF 40 min', targetDistanceKm: 5, targetDurationMin: 40 }]
    expect(dayEnergy(d, '2026-11-20', '2026-11-20').planned).toBeGreaterThan(250)
    expect(dayEnergy(d, '2026-11-20', '2026-11-21').planned).toBe(0)
  })
  it('objectif fixé à la main', () => {
    const d = base()
    d.profile.kcalTarget = 2500
    expect(dayEnergy(d, '2026-11-10', '2026-11-20').target).toBe(2500)
  })
})

describe('bilan', () => {
  it('additionne les apports du jour', () => {
    const i = dayIntake([{ ...meal('2026-11-10', 600), carbs: 80, protein: 30 }, meal('2026-11-10', 400, 'b'), meal('2026-11-11', 900)], '2026-11-10')
    expect(i).toMatchObject({ kcal: 1000, carbs: 80, protein: 30, count: 2 })
  })
  it('ignore les journées incomplètes et aujourd’hui', () => {
    const d = base()
    const today = '2026-11-20'
    d.food = [meal(addDaysISO(today, -1), 2000), meal(addDaysISO(today, -2), 500), meal(today, 2500)]
    const h = energyHistory(d, 7, today)
    expect(h.filter((x) => x.complete).map((x) => x.date)).toEqual([addDaysISO(today, -1)])
  })
  it('verdict déficit, équilibre et surplus', () => {
    const d = base()
    const today = '2026-11-20'
    const exp = dayEnergy(d, '2026-11-15', today).expenditure
    const days = [1, 2, 3, 4]
    d.food = days.map((k) => meal(addDaysISO(today, -k), exp - 600))
    expect(balanceStats(energyHistory(d, 7, today)).verdict.title).toMatch(/Gros déficit/)
    d.food = days.map((k) => meal(addDaysISO(today, -k), exp + 20))
    expect(balanceStats(energyHistory(d, 7, today)).verdict.title).toBe('À l’équilibre')
    d.food = days.map((k) => meal(addDaysISO(today, -k), exp + 400))
    const st = balanceStats(energyHistory(d, 7, today))
    expect(st.verdict.title).toMatch(/Au-dessus/)
    expect(st.kgPerWeek!).toBeCloseTo((400 * 7) / 7700, 1)
  })
  it('demande au moins 3 journées', () => {
    const d = base()
    d.food = [meal('2026-11-19', 2000)]
    expect(balanceStats(energyHistory(d, 7, '2026-11-20')).verdict.title).toBe('Pas encore assez de données')
  })
})

describe('aliments', () => {
  it('recherche sans accents et par mot-clé', () => {
    expect(searchFoods('pates')[0].name).toBe('Pâtes cuites')
    expect(searchFoods('nutella')[0].name).toBe('Pâte à tartiner')
    expect(searchFoods('oeuf')[0].name).toBe('Œuf')
    expect(searchFoods('zzz')).toEqual([])
  })
  it('calcule une portion', () => {
    const pates = FOODS.find((f) => f.name === 'Pâtes cuites')!
    expect(portionValues(pates, 250)).toEqual({ kcal: 375, carbs: 75, protein: 14, fat: 2 })
  })
  it('chaque aliment a au moins une portion et des valeurs cohérentes', () => {
    for (const f of FOODS) {
      expect(f.portions.length).toBeGreaterThan(0)
      // 4 kcal/g de glucides et protéines, 9 kcal/g de lipides, à 25 % près (alcool et fibres mis à part)
      const est = f.carbs * 4 + f.protein * 4 + f.fat * 9
      if (!['Bière', 'Vin'].includes(f.name)) expect(Math.abs(est - f.kcal) / f.kcal).toBeLessThan(0.25)
    }
  })
  it('nettoie la réponse de Claude', () => {
    const r = cleanEstimate({ items: [{ name: 'Pâtes', quantity: '250 g', kcal: '375', carbs: 75.4, protein: 14 }, { name: '', kcal: 10 }, { name: 'Eau', kcal: -5 }], note: ' portion supposée ' })
    expect(r).toEqual({ items: [{ name: 'Pâtes', quantity: '250 g', kcal: 375, carbs: 75, protein: 14, fat: undefined }], note: 'portion supposée' })
    expect(cleanEstimate([{ nom: 'Pomme', calories: 80 }]).items[0]).toMatchObject({ name: 'Pomme', kcal: 80 })
  })
})

describe('activité COROS', () => {
  it('lit pas et calories actives', () => {
    const text = `Daily Health Data — Last 2 days | Resting HR: 57 bpm\n\n--- 20261117 ---\nSteps: 11,671 | Calories: 965 kcal | Exercise: 50 min\nStress: Avg 23\n\n--- 20261118 ---\nSteps: 201 | Calories: 29 kcal | Exercise: 0 min`
    expect(parseDailyHealth(text)).toEqual([
      { id: 'coros-day-2026-11-17', date: '2026-11-17', steps: 11671, activeKcal: 965, exerciseMin: 50 },
      { id: 'coros-day-2026-11-18', date: '2026-11-18', steps: 201, activeKcal: 29, exerciseMin: 0 },
    ])
  })
})

describe('code-barres', async () => {
  const { validEan, normalizeEan } = await import('./barcode')
  const { cleanProductInfo, productToFoodItem } = await import('./products')
  it('vérifie la clé de contrôle', () => {
    expect(validEan('3017620422003')).toBe(true) // EAN-13
    expect(validEan('3017620422004')).toBe(false)
    expect(validEan('96385074')).toBe(true) // EAN-8
    expect(validEan('036000291452')).toBe(true) // UPC-A
    expect(normalizeEan('036000291452')).toBe('0036000291452')
    expect(validEan(normalizeEan('036000291452'))).toBe(true)
  })
  it('nettoie la lecture de l’étiquette', () => {
    const p = cleanProductInfo({ barcode: '3017620422003', name: 'Pâte à tartiner', brand: 'null', kcal100: '539', carbs100: '57,5', protein100: 6.3, fat100: 30.9, servingG: 15, netWeightG: '400 g' })
    expect(p).toEqual({ barcode: '3017620422003', name: 'Pâte à tartiner', brand: undefined, kcal100: 539, carbs100: 57.5, protein100: 6.3, fat100: 30.9, servingG: 15, netWeightG: 400 })
    expect(cleanProductInfo({ barcode: '1234567890123', kcal100: 2200 })).toMatchObject({ barcode: undefined, kcal100: undefined })
  })
  it('un produit scanné se dose comme un aliment', () => {
    const f = productToFoodItem({ id: '1', barcode: '3017620422003', name: 'Pâte à tartiner', brand: 'Marque', kcal: 539, carbs: 57.5, protein: 6.3, fat: 30.9, servingG: 15, netWeightG: 400, source: 'photo' })
    expect(f.portions.map((p) => p.label)).toEqual(['1 portion', '100 g', 'le paquet entier'])
    expect(f.name).toBe('Pâte à tartiner (Marque)')
  })
})
