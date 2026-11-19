import type { MuscuExercise, RenfoFocus, RenfoTemplate } from '../types'

export const RENFO_FOCUS_LABEL: Record<RenfoFocus, string> = {
  gainage: 'Gainage',
  bas_du_corps: 'Bas du corps',
  pliometrie: 'Pliométrie',
  mobilite: 'Mobilité',
  prevention: 'Prévention',
  complet: 'Complet',
  haut_du_corps: 'Haut du corps',
}

export const BUILTIN_RENFO: RenfoTemplate[] = [
  {
    id: 'tpl-renfo-a',
    builtin: true,
    title: 'Renfo A — Force & gainage',
    focus: 'bas_du_corps',
    durationMin: 25,
    description: 'Jambes et ceinture abdominale : la base pour une foulée solide.',
    exercises: [
      { name: 'Squats', sets: 3, reps: 15 },
      { name: 'Fentes alternées', sets: 3, reps: 10, note: 'par jambe' },
      { name: 'Pont fessier unilatéral', sets: 3, reps: 12, note: 'par jambe' },
      { name: 'Montées sur pointes (mollets)', sets: 3, reps: 20 },
      { name: 'Gainage ventral', sets: 3, durationSec: 40 },
      { name: 'Gainage latéral', sets: 3, durationSec: 30, note: 'par côté' },
    ],
  },
  {
    id: 'tpl-renfo-b',
    builtin: true,
    title: 'Renfo B — Pliométrie & stabilité',
    focus: 'pliometrie',
    durationMin: 25,
    description: 'Réactivité du pied, équilibre et transfert de force.',
    exercises: [
      { name: 'Skipping sur place', sets: 3, durationSec: 20 },
      { name: 'Squats sautés', sets: 3, reps: 10 },
      { name: 'Foulées bondissantes', sets: 3, reps: 10 },
      { name: 'Équilibre unipodal', sets: 3, durationSec: 30, note: 'par jambe, yeux fermés si facile' },
      { name: 'Montées sur banc (step-up)', sets: 3, reps: 10, note: 'par jambe' },
      { name: 'Dead bug', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'tpl-gainage',
    builtin: true,
    title: 'Gainage express',
    focus: 'gainage',
    durationMin: 10,
    description: '10 minutes, sans matériel, à caler après un footing.',
    exercises: [
      { name: 'Planche', sets: 3, durationSec: 45 },
      { name: 'Planche latérale', sets: 2, durationSec: 30, note: 'par côté' },
      { name: 'Superman', sets: 3, reps: 12 },
      { name: 'Mountain climbers', sets: 3, durationSec: 20 },
      { name: 'Hollow hold', sets: 2, durationSec: 20 },
    ],
  },
  {
    id: 'tpl-prevention',
    builtin: true,
    title: 'Prévention blessures',
    focus: 'prevention',
    durationMin: 15,
    description: 'Chevilles, tendons d’Achille et hanches : les zones fragiles du coureur.',
    exercises: [
      { name: 'Marche talons / pointes', sets: 2, reps: 20, note: 'mètres' },
      { name: 'Mollets excentriques sur marche', sets: 3, reps: 15 },
      { name: 'Coquillage avec élastique', sets: 3, reps: 15, note: 'par côté' },
      { name: 'Abduction de hanche couché', sets: 3, reps: 15, note: 'par côté' },
      { name: 'Pont fessier', sets: 3, reps: 15 },
      { name: 'Équilibre sur coussin', sets: 3, durationSec: 30, note: 'par jambe' },
    ],
  },
  {
    id: 'tpl-mobilite',
    builtin: true,
    title: 'Mobilité post-course',
    focus: 'mobilite',
    durationMin: 15,
    description: 'Retour au calme : hanches, ischios, mollets et rouleau.',
    exercises: [
      { name: 'Fente psoas', sets: 2, durationSec: 45, note: 'par côté' },
      { name: 'Étirement ischio-jambiers', sets: 2, durationSec: 45 },
      { name: 'Posture du pigeon', sets: 2, durationSec: 45, note: 'par côté' },
      { name: 'Mollets contre un mur', sets: 2, durationSec: 45 },
      { name: 'Rotations thoraciques', sets: 2, reps: 10 },
      { name: 'Rouleau quadriceps & mollets', sets: 1, durationSec: 180 },
    ],
  },
  {
    id: 'tpl-ppg',
    builtin: true,
    title: 'Circuit PPG complet',
    focus: 'complet',
    durationMin: 30,
    description: 'Préparation physique générale en circuit : 3 tours, 1 min de récup entre les tours.',
    exercises: [
      { name: 'Burpees', sets: 3, reps: 10 },
      { name: 'Pompes', sets: 3, reps: 12 },
      { name: 'Squats sautés', sets: 3, reps: 12 },
      { name: 'Fentes sautées', sets: 3, reps: 10 },
      { name: 'Corde à sauter', sets: 3, durationSec: 60 },
      { name: 'Gainage ventral', sets: 3, durationSec: 45 },
    ],
  },
]

export const MUSCU_EXERCISES = [
  'Squat',
  'Soulevé de terre',
  'Soulevé de terre roumain',
  'Développé couché',
  'Développé incliné haltères',
  'Développé militaire',
  'Tractions',
  'Tirage vertical',
  'Rowing barre',
  'Rowing haltère',
  'Fentes bulgares',
  'Hip thrust',
  'Presse à cuisses',
  'Leg curl',
  'Leg extension',
  'Mollets debout',
  'Step-up haltères',
  'Dips',
  'Pompes lestées',
  'Curl biceps',
  'Extension triceps',
  'Élévations latérales',
  'Face pull',
  'Gainage lesté',
  'Good morning',
]

export interface MuscuTemplate {
  title: string
  description: string
  exercises: MuscuExercise[]
}

const s = (n: number, reps: number, weightKg = 0) => Array.from({ length: n }, () => ({ reps, weightKg }))

export const MUSCU_TEMPLATES: MuscuTemplate[] = [
  {
    title: 'Full body coureur — A',
    description: 'Force des jambes et de la chaîne postérieure, sans fatiguer pour la course.',
    exercises: [
      { name: 'Squat', sets: s(3, 6) },
      { name: 'Soulevé de terre roumain', sets: s(3, 8) },
      { name: 'Fentes bulgares', sets: s(3, 8) },
      { name: 'Tractions', sets: s(3, 6) },
      { name: 'Mollets debout', sets: s(3, 12) },
    ],
  },
  {
    title: 'Full body coureur — B',
    description: 'Poussée, tirage et stabilité de hanche.',
    exercises: [
      { name: 'Hip thrust', sets: s(3, 8) },
      { name: 'Step-up haltères', sets: s(3, 8) },
      { name: 'Développé couché', sets: s(3, 8) },
      { name: 'Rowing haltère', sets: s(3, 10) },
      { name: 'Gainage lesté', sets: s(3, 1) },
    ],
  },
  {
    title: 'Haut du corps',
    description: 'Posture et bras pour une course plus économique.',
    exercises: [
      { name: 'Développé militaire', sets: s(3, 8) },
      { name: 'Tirage vertical', sets: s(3, 10) },
      { name: 'Développé incliné haltères', sets: s(3, 10) },
      { name: 'Face pull', sets: s(3, 15) },
      { name: 'Curl biceps', sets: s(3, 12) },
    ],
  },
]
