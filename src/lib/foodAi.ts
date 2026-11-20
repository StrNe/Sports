// Estimation des calories d'un repas décrit en texte (ou en photo) par Claude,
// via la capacité `sample` des artifacts claude.ai.

import type { MealSlot } from '../types'
import { useCapability, type SampleError } from './claude'

export interface EstimatedFood {
  name: string
  quantity?: string
  kcal: number
  carbs?: number
  protein?: number
  fat?: number
}

const SLOT_LABEL: Record<MealSlot, string> = { petit_dej: 'petit-déjeuner', dejeuner: 'déjeuner', collation: 'collation', diner: 'dîner' }

export async function aiAvailable(): Promise<{ text: boolean; images: boolean; mediaTypes: string[] }> {
  const sample = await useCapability('sample')
  if (!sample) return { text: false, images: false, mediaTypes: [] }
  const limits = await sample.limits().catch(() => null)
  return { text: true, images: !!limits?.images, mediaTypes: limits?.images?.mediaTypes ?? [] }
}

function num(v: unknown): number | undefined {
  const x = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  return isFinite(x) && x >= 0 ? Math.round(x) : undefined
}

export function cleanEstimate(raw: unknown): { items: EstimatedFood[]; note?: string } {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as { items?: unknown; note?: unknown }
  const list = Array.isArray(raw) ? raw : Array.isArray(obj.items) ? obj.items : []
  const items = list
    .map((it): EstimatedFood | null => {
      const o = (it ?? {}) as Record<string, unknown>
      const name = String(o.name ?? o.nom ?? '').trim()
      const kcal = num(o.kcal ?? o.calories)
      if (!name || kcal == null) return null
      return { name: name.slice(0, 80), quantity: o.quantity || o.quantite ? String(o.quantity ?? o.quantite).slice(0, 40) : undefined, kcal, carbs: num(o.carbs ?? o.glucides), protein: num(o.protein ?? o.proteines), fat: num(o.fat ?? o.lipides) }
    })
    .filter((x): x is EstimatedFood => !!x)
  return { items, note: typeof obj.note === 'string' && obj.note.trim() ? obj.note.trim().slice(0, 240) : undefined }
}

export async function estimateFood(description: string, opts: { slot: MealSlot; weightKg?: number; image?: Blob; signal?: AbortSignal }): Promise<{ items: EstimatedFood[]; note?: string }> {
  const sample = await useCapability('sample')
  if (!sample) throw { code: 'not_granted', message: 'Claude indisponible ici' } satisfies SampleError
  const prompt = [
    'Tu es diététicien du sport. Un coureur à pied' + (opts.weightKg ? ` de ${Math.round(opts.weightKg)} kg` : '') + ` note son ${SLOT_LABEL[opts.slot]}.`,
    opts.image ? 'La photo jointe montre son assiette ou ce qu’il a mangé.' : '',
    description.trim() ? `Ce qu’il décrit : « ${description.trim().slice(0, 1500)} »` : '',
    'Liste chaque aliment ou boisson consommé et estime ses apports. Si une quantité n’est pas précisée, prends une portion française courante pour un étudiant et indique-la.',
    'Ne compte pas l’eau, le café ou le thé sans sucre ni lait.',
    'Réponds uniquement avec ce JSON, nombres entiers, sans texte autour :',
    '{"items":[{"name":"Pâtes cuites","quantity":"250 g","kcal":375,"carbs":75,"protein":14,"fat":2}],"note":"hypothèse importante en une phrase, ou chaîne vide"}',
  ]
    .filter(Boolean)
    .join('\n')
  const raw = await sample.json(prompt, { modelTier: opts.image ? 'default' : 'quick', images: opts.image, signal: opts.signal })
  return cleanEstimate(raw)
}

export function aiErrorMessage(e: SampleError): string | null {
  switch (e.code) {
    case 'cancelled':
      return null
    case 'not_granted':
    case 'sampling_disabled':
    case 'not_declared':
    case 'capability_disabled':
    case 'capability_removed':
      return 'L’estimation par Claude n’est pas disponible ici : utilise la recherche ou la saisie manuelle.'
    case 'rate_limited':
      return 'Trop de demandes pour le moment. Réessaie dans quelques minutes, ou utilise la recherche.'
    case 'session_expired':
      return 'Ta session claude.ai a expiré : reconnecte-toi puis réessaie.'
    case 'image_rejected':
    case 'images_unavailable':
      return 'Cette photo ne peut pas être analysée. Essaie une autre photo (JPEG ou PNG) ou décris ton repas.'
    case 'invalid_json':
    case 'empty_completion':
      return 'Claude n’a pas réussi à lire ce repas. Reformule avec les aliments et les quantités, puis réessaie.'
    case 'refused':
      return 'Claude n’a pas pu traiter cette demande. Reformule ta description.'
    default:
      return 'L’estimation a échoué. Vérifie ta connexion et réessaie.'
  }
}
