// ─────────────────────────────────────────────────────────────
// Modèle de données de Foulée. Toutes les dates sont des chaînes
// locales "YYYY-MM-DD", les durées sont en secondes sauf mention.
// ─────────────────────────────────────────────────────────────

export type ISODate = string

export type RunType =
  | 'ef'
  | 'recup'
  | 'sortie_longue'
  | 'marche_course'
  | 'tempo'
  | 'seuil'
  | 'fractionne'
  | 'vma'
  | 'cotes'
  | 'test'
  | 'competition'
  | 'trail'
  | 'tapis'

export interface Run {
  id: string
  date: ISODate
  type: RunType
  title?: string
  distanceKm: number
  durationSec: number
  avgHr?: number
  maxHr?: number
  elevationM?: number
  cadence?: number
  calories?: number
  /** Effort perçu 1–10 (échelle de Borg CR10) */
  rpe?: number
  /** Sensations 1–5 */
  feeling?: number
  shoeId?: string
  notes?: string
  source?: 'manuel' | 'coros' | 'fit' | 'gpx' | 'tcx'
  externalId?: string
}

export type RenfoFocus = 'gainage' | 'bas_du_corps' | 'pliometrie' | 'mobilite' | 'prevention' | 'complet' | 'haut_du_corps'

export interface RenfoExercise {
  name: string
  sets: number
  reps?: number
  durationSec?: number
  note?: string
}

export interface RenfoSession {
  id: string
  date: ISODate
  title: string
  focus: RenfoFocus
  durationMin: number
  exercises: RenfoExercise[]
  rpe?: number
  notes?: string
}

export interface RenfoTemplate {
  id: string
  title: string
  focus: RenfoFocus
  durationMin: number
  description: string
  exercises: RenfoExercise[]
  builtin?: boolean
}

export interface MuscuSet {
  reps: number
  weightKg: number
}

export interface MuscuExercise {
  name: string
  sets: MuscuSet[]
}

export interface MuscuSession {
  id: string
  date: ISODate
  title: string
  durationMin: number
  exercises: MuscuExercise[]
  rpe?: number
  notes?: string
}

export type RaceKind = 'route' | 'trail' | 'backyard' | 'cross' | 'piste' | 'autre'
export type RacePriority = 'A' | 'B' | 'C'

export interface Race {
  id: string
  name: string
  date: ISODate
  kind: RaceKind
  distanceKm: number
  elevationM?: number
  location?: string
  priority: RacePriority
  goalTimeSec?: number
  /** Backyard : nombre de boucles visées */
  goalLoops?: number
  /** Backyard : longueur d'une boucle en km (6,706 km par défaut) */
  loopKm?: number
  notes?: string
  result?: {
    timeSec?: number
    loops?: number
    rank?: string
    notes?: string
  }
}

export interface PersonalRecord {
  id: string
  label: string
  distanceKm: number
  timeSec: number
  date: ISODate
  where?: string
}

export interface SleepEntry {
  id: string
  /** Date du réveil */
  date: ISODate
  bedtime?: string // HH:MM
  wakeTime?: string // HH:MM
  durationMin: number
  /** Qualité ressentie 1–5 */
  quality: number
  score?: number
  restingHr?: number
  hrv?: number
  deepPct?: number
  lightPct?: number
  remPct?: number
  awakeMin?: number
  /** Réveils de plus de 5 min */
  awakeCount?: number
  /** VFC nocturne : statut et plage normale fournis par la montre */
  hrvStatus?: 'normal' | 'bas' | 'haut'
  hrvLow?: number
  hrvHigh?: number
  hrvBaseline?: number
  napMin?: number
  /** Forme au réveil : énergie 1–5 */
  energy?: number
  /** Courbatures / douleurs 1–5 (5 = très douloureux) */
  soreness?: number
  notes?: string
}

export interface Shoe {
  id: string
  name: string
  startKm: number
  limitKm: number
  retired?: boolean
  since?: ISODate
}

export type PlannedKind = 'run' | 'renfo' | 'muscu' | 'repos' | 'autre'

export interface PlannedWorkout {
  id: string
  date: ISODate
  kind: PlannedKind
  title: string
  runType?: RunType
  description?: string
  targetDistanceKm?: number
  targetDurationMin?: number
  done?: boolean
}

export type Diet = 'omnivore' | 'pescetarien' | 'vegetarien' | 'vegan'

export interface Profile {
  name: string
  sex?: 'M' | 'F'
  birthYear?: number
  heightCm?: number
  weightKg?: number
  hrMax?: number
  hrRest?: number
  /** Limite haute de FC pour l'endurance fondamentale */
  efHrLimit?: number
  /** VMA en km/h */
  vma?: number
  /** Allure seuil en s/km */
  thresholdPaceSec?: number
  weeklyKmGoal?: number
  weeklySessionsGoal?: number
  sleepGoalMin: number
  mainGoal?: string
  diet: Diet
  noGluten?: boolean
  noLactose?: boolean
  /** Objectif calorique : garder, perdre ou prendre du poids */
  calorieGoal?: CalorieGoal
  /** Activité de la journée hors sport */
  activityLevel?: ActivityLevel
  /** Objectif de calories fixé à la main (remplace le calcul) */
  kcalTarget?: number
}

export type CalorieGoal = 'maintien' | 'perte' | 'prise'
export type ActivityLevel = 'sedentaire' | 'modere' | 'actif'

/** Un aliment ou un plat noté dans le journal */
export interface FoodEntry {
  id: string
  date: ISODate
  slot: MealSlot
  name: string
  /** Quantité en clair : « 250 g », « 2 tranches » */
  quantity?: string
  kcal: number
  carbs?: number
  protein?: number
  fat?: number
  /** Comment la valeur a été obtenue */
  source?: 'ia' | 'base' | 'manuel' | 'scan'
}

/** Produit emballé mémorisé après un scan (valeurs pour 100 g ou 100 ml) */
export interface ScannedProduct {
  /** Le code-barres sert d'identifiant */
  id: string
  barcode: string
  name: string
  brand?: string
  kcal: number
  carbs?: number
  protein?: number
  fat?: number
  /** Portion indiquée sur le paquet, en grammes */
  servingG?: number
  /** Poids net du paquet, en grammes */
  netWeightG?: number
  source: 'photo' | 'openfoodfacts' | 'manuel'
}

/** Activité quotidienne mesurée par la montre */
export interface DailyActivity {
  id: string
  date: ISODate
  steps: number
  /** Calories actives (pas + sport), hors métabolisme de base */
  activeKcal: number
  exerciseMin?: number
}

export interface WeightEntry {
  id: string
  date: ISODate
  kg: number
}

export type Theme = 'system' | 'light' | 'dark'

export type MealSlot = 'petit_dej' | 'dejeuner' | 'collation' | 'diner'

export interface AppData {
  version: number
  profile: Profile
  runs: Run[]
  renfo: RenfoSession[]
  muscu: MuscuSession[]
  races: Race[]
  records: PersonalRecord[]
  sleep: SleepEntry[]
  shoes: Shoe[]
  planned: PlannedWorkout[]
  renfoTemplates: RenfoTemplate[]
  /** Journal alimentaire */
  food: FoodEntry[]
  /** Produits scannés */
  products: ScannedProduct[]
  /** Pas et calories actives par jour (montre) */
  activity: DailyActivity[]
  /** Pesées */
  weights: WeightEntry[]
  /** Type de journée forcé pour la nutrition */
  dayTypeOverrides: Record<ISODate, DayType>
  theme: Theme
  sync?: SyncState
}

export interface SyncState {
  /** Dernier jour synchronisé avec COROS */
  corosLastDate?: ISODate
  /** Horodatage (ms) de la dernière synchronisation COROS */
  corosAt?: number
  /** Synchroniser automatiquement à l'ouverture */
  corosAuto?: boolean
}

export type DayType = 'repos' | 'facile' | 'intense' | 'long' | 'veille_course' | 'jour_course'
