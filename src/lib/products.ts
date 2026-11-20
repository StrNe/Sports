// Infos nutritionnelles d'un produit emballé : lecture de la photo du paquet par Claude,
// ou base Open Food Facts quand la page a accès à internet (version GitHub Pages).

import type { ScannedProduct } from '../types'
import type { FoodItem } from '../data/foods'
import { inClaude, useCapability, type SampleError } from './claude'
import { normalizeEan, validEan } from './barcode'

export interface ProductInfo {
  barcode?: string
  name?: string
  brand?: string
  kcal100?: number
  carbs100?: number
  protein100?: number
  fat100?: number
  servingG?: number
  netWeightG?: number
}

function num(v: unknown, digits = 1): number | undefined {
  if (v == null || v === '') return undefined
  const x = typeof v === 'string' ? Number(v.replace(',', '.').replace(/[^\d.]/g, '')) : Number(v)
  if (!isFinite(x) || x < 0) return undefined
  const k = 10 ** digits
  return Math.round(x * k) / k
}

export function cleanProductInfo(raw: unknown): ProductInfo {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const code = typeof o.barcode === 'string' || typeof o.barcode === 'number' ? normalizeEan(String(o.barcode)) : ''
  const kcal = num(o.kcal100, 0)
  const str = (v: unknown) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, 80) : undefined)
  return {
    barcode: validEan(code) ? code : undefined,
    name: str(o.name),
    brand: str(o.brand),
    // Une valeur énergétique invraisemblable (> 900 kcal/100 g) est une erreur de lecture
    kcal100: kcal != null && kcal <= 900 ? kcal : undefined,
    carbs100: num(o.carbs100),
    protein100: num(o.protein100),
    fat100: num(o.fat100),
    servingG: num(o.servingG, 0) || undefined,
    netWeightG: num(o.netWeightG, 0) || undefined,
  }
}

/** Claude lit le code-barres et/ou le tableau nutritionnel sur la photo du paquet */
export async function readPackagePhoto(photo: Blob, signal?: AbortSignal): Promise<ProductInfo> {
  const sample = await useCapability('sample')
  if (!sample) throw { code: 'not_granted', message: 'Claude indisponible ici' } satisfies SampleError
  const prompt = [
    'La photo jointe montre un produit alimentaire emballé (souvent le dos du paquet).',
    '1. Si un code-barres est visible, recopie exactement les chiffres imprimés dessous (EAN-13 ou EAN-8).',
    '2. Si le tableau des valeurs nutritionnelles est lisible, recopie les valeurs POUR 100 g (ou 100 ml) : énergie en kcal, glucides, protéines, lipides.',
    '3. Donne le nom du produit et la marque s’ils sont lisibles.',
    '4. Si c’est écrit : la taille d’une portion en grammes et le poids net du paquet en grammes.',
    'Recopie seulement ce qui est écrit sur la photo : n’invente rien et ne devine pas une valeur absente.',
    'Réponds uniquement avec ce JSON, avec null pour toute information illisible ou absente :',
    '{"barcode":"3017620422003","name":"Pâte à tartiner","brand":"Marque","kcal100":539,"carbs100":57.5,"protein100":6.3,"fat100":30.9,"servingG":15,"netWeightG":400}',
  ].join('\n')
  return cleanProductInfo(await sample.json(prompt, { modelTier: 'default', images: photo, signal }))
}

/** Base libre Open Food Facts : seulement hors claude.ai (la page artifact n'a pas accès à internet) */
export async function lookupOpenFoodFacts(code: string): Promise<ProductInfo | null> {
  if (inClaude()) return null
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 6000)
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_fr,brands,nutriments,serving_quantity,product_quantity`, { signal: ctl.signal })
    if (!res.ok) return null
    const json = (await res.json()) as { status?: number; product?: { product_name?: string; product_name_fr?: string; brands?: string; nutriments?: Record<string, unknown>; serving_quantity?: unknown; product_quantity?: unknown } }
    const p = json.product
    if (!p || json.status === 0) return null
    const n = p.nutriments ?? {}
    const kcal = num(n['energy-kcal_100g'], 0) ?? (num(n['energy_100g'], 0) != null ? Math.round(num(n['energy_100g'], 0)! / 4.184) : undefined)
    return cleanProductInfo({
      barcode: code,
      name: p.product_name_fr || p.product_name,
      brand: p.brands?.split(',')[0],
      kcal100: kcal,
      carbs100: n['carbohydrates_100g'],
      protein100: n['proteins_100g'],
      fat100: n['fat_100g'],
      servingG: p.serving_quantity,
      netWeightG: p.product_quantity,
    })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Un produit scanné se recherche et se dose comme un aliment de la base */
export function productToFoodItem(p: ScannedProduct): FoodItem {
  const portions = [{ label: '100 g', g: 100 }]
  if (p.servingG) portions.unshift({ label: '1 portion', g: p.servingG })
  if (p.netWeightG && p.netWeightG <= 2000) portions.push({ label: 'le paquet entier', g: p.netWeightG })
  return {
    id: `p-${p.barcode}`,
    emoji: '🏷️',
    name: p.brand ? `${p.name} (${p.brand})` : p.name,
    aliases: `${p.brand ?? ''} ${p.barcode}`,
    kcal: p.kcal,
    carbs: p.carbs ?? 0,
    protein: p.protein ?? 0,
    fat: p.fat ?? 0,
    portions,
  }
}
