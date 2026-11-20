import type { MuscuExercise, RenfoFocus, RenfoTemplate } from '../types'
import { RUNNER_EXERCISES } from './runnerStrength'

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
  ...new Set([
    ...RUNNER_EXERCISES.map((e) => e.name),
    'Soulevé de terre',
    'Développé couché',
    'Développé incliné haltères',
    'Développé militaire',
    'Tractions',
    'Tirage vertical',
    'Rowing barre',
    'Presse à cuisses',
    'Leg curl',
    'Leg extension',
    'Step-up haltères',
    'Dips',
    'Curl biceps',
    'Extension triceps',
    'Élévations latérales',
    'Face pull',
    'Gainage lesté',
    'Good morning',
    'Pont fessier une jambe',
  ]),
]

export interface MuscuTemplate {
  title: string
  description: string
  durationMin: number
  exercises: MuscuExercise[]
}

const s = (n: number, reps: number, weightKg = 0) => Array.from({ length: n }, () => ({ reps, weightKg }))

/** Programmes de musculation pensés pour la course à pied (charges à compléter selon ton niveau) */
export const MUSCU_TEMPLATES: MuscuTemplate[] = [
  {
    title: 'Force coureur A — jambes',
    description: 'Charges lourdes, peu de répétitions : plus de force sans prendre de masse. À placer le jour d’une séance de qualité, après la course.',
    durationMin: 50,
    exercises: [
      { name: 'Squat', sets: s(4, 6) },
      { name: 'Soulevé de terre roumain', sets: s(3, 8) },
      { name: 'Fentes bulgares', sets: s(3, 8) },
      { name: 'Mollets debout', sets: s(3, 12) },
      { name: 'Copenhagen plank (secondes)', sets: s(3, 25) },
    ],
  },
  {
    title: 'Force coureur B — hanches & mollets',
    description: 'Fessiers, ischios et mollets : les zones qui encaissent le plus en course. Idéal 2 à 3 jours après la séance A.',
    durationMin: 45,
    exercises: [
      { name: 'Hip thrust', sets: s(3, 8) },
      { name: 'Step-up', sets: s(3, 10) },
      { name: 'Nordic hamstring curl', sets: s(3, 5) },
      { name: 'Mollets assis', sets: s(3, 15) },
      { name: 'Pallof press', sets: s(3, 10) },
    ],
  },
  {
    title: 'Spécial Backyard — endurance de force',
    description: 'Charges modérées et séries longues pour tenir des heures debout, en côte comme sur le plat.',
    durationMin: 45,
    exercises: [
      { name: 'Squat', sets: s(3, 12) },
      { name: 'Soulevé de terre sur une jambe', sets: s(3, 10) },
      { name: 'Step-up', sets: s(3, 12) },
      { name: 'Marche du fermier (mètres)', sets: s(4, 30) },
      { name: 'Mollets debout', sets: s(3, 20) },
      { name: 'Dead bug', sets: s(3, 10) },
    ],
  },
  {
    title: 'Express maison, sans matériel',
    description: '30 minutes dans ta chambre, au poids du corps. Parfait les semaines chargées.',
    durationMin: 30,
    exercises: [
      { name: 'Squat', sets: s(3, 20) },
      { name: 'Fentes bulgares', sets: s(3, 12) },
      { name: 'Pont fessier une jambe', sets: s(3, 12) },
      { name: 'Mollets debout', sets: s(3, 20) },
      { name: 'Gainage latéral avec abduction', sets: s(3, 10) },
      { name: 'Pompes', sets: s(3, 12) },
    ],
  },
  {
    title: 'Haut du corps & posture',
    description: 'Dos, épaules et gainage pour garder une posture droite en fin de course.',
    durationMin: 40,
    exercises: [
      { name: 'Rowing haltère', sets: s(3, 10) },
      { name: 'Pompes', sets: s(3, 12) },
      { name: 'Développé militaire', sets: s(3, 8) },
      { name: 'Face pull', sets: s(3, 15) },
      { name: 'Marche du fermier (mètres)', sets: s(3, 30) },
    ],
  },
]
