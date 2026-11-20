import type { DayType, Diet, MealSlot } from '../types'

// Repas « étudiant » : peu d'ingrédients, du matériel de base (casserole, poêle, micro-ondes),
// des produits de supermarché et un coût par portion indicatif.

export interface Meal {
  id: string
  slot: MealSlot
  name: string
  emoji: string
  kcal: number
  carbs: number
  protein: number
  fat: number
  prepMin: number
  /** Coût indicatif par portion, en euros */
  price: number
  ingredients: string[]
  /** Régime le plus restrictif compatible */
  diet: Diet
  glutenFree?: boolean
  lactoseFree?: boolean
  /** Types de journée pour lesquels le repas est adapté (vide = tous) */
  goodFor: DayType[]
  why?: string
}

const ALL: DayType[] = []
const CALM: DayType[] = ['repos', 'facile']
const FUEL: DayType[] = ['intense', 'long', 'veille_course']
const RACE: DayType[] = ['veille_course', 'jour_course']

type Opts = Partial<Pick<Meal, 'glutenFree' | 'lactoseFree' | 'why'>>

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function m(
  slot: MealSlot,
  emoji: string,
  name: string,
  [kcal, carbs, protein, fat]: [number, number, number, number],
  prepMin: number,
  price: number,
  diet: Diet,
  goodFor: DayType[],
  ingredients: string[],
  opts: Opts = {},
): Meal {
  return { id: `${slot}-${slugify(name)}`, slot, emoji, name, kcal, carbs, protein, fat, prepMin, price, diet, goodFor, ingredients, ...opts }
}

export const MEALS: Meal[] = [
  // ── Petits-déjeuners ──────────────────────────────────────
  m('petit_dej', '🥣', 'Porridge au lait & banane', [450, 70, 15, 10], 5, 0.6, 'vegetarien', ALL, ['60 g de flocons d’avoine', '250 ml de lait', '1 banane'], {
    why: '2 min au micro-ondes. Énergie qui dure toute la matinée.',
  }),
  m('petit_dej', '🍞', 'Tartines beurre-confiture & verre de lait', [450, 70, 14, 12], 3, 0.5, 'vegetarien', [...FUEL, 'jour_course'], ['3 tranches de pain', 'Beurre, confiture', '1 verre de lait']),
  m('petit_dej', '🥜', 'Tartines beurre de cacahuète & banane', [450, 60, 14, 16], 3, 0.7, 'vegan', ALL, ['2 tranches de pain complet', '1 c. à soupe de beurre de cacahuète', '1 banane'], { lactoseFree: true }),
  m('petit_dej', '🥛', 'Bol de céréales & fruit', [400, 70, 12, 7], 1, 0.5, 'vegetarien', ['facile', 'intense', 'long'], ['60 g de céréales (muesli ou corn-flakes)', '250 ml de lait', '1 fruit']),
  m('petit_dej', '🍳', 'Œufs brouillés & tartines', [400, 35, 20, 18], 5, 0.8, 'vegetarien', CALM, ['2 œufs', '2 tranches de pain', '1 noisette de beurre'], { lactoseFree: true }),
  m('petit_dej', '🍯', 'Fromage blanc, miel & flocons', [380, 50, 25, 6], 2, 0.8, 'vegetarien', ALL, ['200 g de fromage blanc', '1 c. à soupe de miel', '30 g de flocons d’avoine'], { why: 'Riche en protéines pour récupérer.' }),
  m('petit_dej', '🍌', 'Smoothie banane-lait', [380, 62, 12, 8], 3, 0.7, 'vegetarien', FUEL, ['1 banane', '250 ml de lait', '2 c. à soupe de flocons', '1 c. à café de miel'], { glutenFree: true }),
  m('petit_dej', '🥐', 'Brioche, yaourt & jus d’orange', [480, 80, 13, 12], 1, 0.9, 'vegetarien', [...RACE, 'intense'], ['3 tranches de brioche', '1 yaourt', '1 verre de jus d’orange'], {
    why: 'Digeste : idéal 3 h avant une course ou une grosse séance.',
  }),
  m('petit_dej', '🍚', 'Riz au lait en pot & banane', [380, 70, 8, 6], 1, 0.9, 'vegetarien', [...RACE, 'long'], ['1 pot de riz au lait', '1 banane'], { glutenFree: true, why: 'Peu de fibres, très digeste avant de courir.' }),
  m('petit_dej', '🥞', 'Pancakes express banane-œuf', [330, 50, 12, 8], 10, 0.6, 'vegetarien', FUEL, ['1 banane écrasée', '1 œuf', '40 g de flocons d’avoine', 'Cuits à la poêle'], { lactoseFree: true }),
  m('petit_dej', '🍎', 'Pain complet, fromage & pomme', [380, 50, 15, 12], 2, 0.9, 'vegetarien', CALM, ['2 tranches de pain complet', '1 portion de fromage', '1 pomme']),
  m('petit_dej', '🍘', 'Galettes de riz, beurre de cacahuète & miel', [350, 45, 9, 14], 2, 0.8, 'vegetarien', ALL, ['4 galettes de riz soufflé', '1 c. à soupe de beurre de cacahuète', '1 c. à café de miel'], { glutenFree: true, lactoseFree: true }),
  m('petit_dej', '🥣', 'Semoule au lait au micro-ondes', [360, 60, 12, 7], 4, 0.4, 'vegetarien', [...RACE, 'long'], ['40 g de semoule fine', '250 ml de lait', '1 c. à soupe de sucre'], { why: 'Le petit-déj de course le moins cher.' }),

  // ── Déjeuners ─────────────────────────────────────────────
  m('dejeuner', '🍝', 'Pâtes au thon & sauce tomate', [650, 95, 35, 10], 12, 1.4, 'pescetarien', [...FUEL, 'facile'], ['100 g de pâtes', '½ boîte de thon', '3 c. à soupe de sauce tomate', 'Râpé (facultatif)'], {
    lactoseFree: true,
    why: 'Le classique du coureur : glucides + protéines pour 1,40 €.',
  }),
  m('dejeuner', '🍚', 'Riz, œufs au plat & petits pois', [600, 75, 22, 18], 15, 0.9, 'vegetarien', ALL, ['80 g de riz', '2 œufs', 'Petits pois surgelés', 'Sauce soja'], { lactoseFree: true }),
  m('dejeuner', '🌯', 'Wraps poulet & crudités', [600, 60, 38, 18], 10, 2, 'omnivore', CALM, ['2 tortillas', '100 g de poulet cuit', 'Salade, tomate', 'Sauce fromage blanc-moutarde']),
  m('dejeuner', '🥫', 'Lentilles en boîte, saucisse & pain', [650, 70, 32, 22], 8, 1.6, 'omnivore', ['repos', 'facile', 'intense'], ['½ boîte de lentilles cuisinées', '1 saucisse (ou 2 œufs durs)', '1 morceau de pain'], {
    lactoseFree: true,
    why: 'Fer + glucides, chauffé en 5 min.',
  }),
  m('dejeuner', '🌶️', 'Chili express riz-haricots rouges', [600, 105, 22, 5], 15, 1.3, 'vegan', ['facile', 'intense', 'long'], ['80 g de riz', '½ boîte de haricots rouges', '½ boîte de tomates concassées', 'Épices chili'], {
    glutenFree: true,
    lactoseFree: true,
    why: 'Fais-en 3 portions : ça se garde 3 jours au frigo.',
  }),
  m('dejeuner', '🥗', 'Salade de pâtes thon-maïs', [640, 90, 32, 14], 12, 1.5, 'pescetarien', ['facile', 'intense', 'long'], ['100 g de pâtes', '½ boîte de thon', '3 c. à soupe de maïs', 'Tomates cerises', 'Vinaigrette'], { lactoseFree: true }),
  m('dejeuner', '🥪', 'Croque-monsieur & salade', [600, 60, 32, 24], 10, 1.3, 'omnivore', CALM, ['4 tranches de pain de mie', '2 tranches de jambon', 'Emmental', 'Salade verte']),
  m('dejeuner', '🥔', 'Pommes de terre, œufs & haricots verts', [520, 60, 20, 20], 20, 1.1, 'vegetarien', CALM, ['300 g de pommes de terre', '2 œufs', 'Haricots verts surgelés', 'Huile, sel'], { glutenFree: true, lactoseFree: true }),
  m('dejeuner', '🍜', 'Nouilles sautées œuf & légumes', [600, 85, 20, 18], 10, 1.2, 'vegetarien', ['facile', 'intense'], ['1 paquet de nouilles (sans le sachet d’assaisonnement)', '1 œuf', 'Poêlée de légumes surgelés', 'Sauce soja'], { lactoseFree: true }),
  m('dejeuner', '🍛', 'Riz au poulet & curry', [650, 75, 40, 18], 15, 1.8, 'omnivore', ['intense', 'long'], ['80 g de riz', '120 g de poulet', '2 c. à soupe de crème', 'Curry'], { glutenFree: true }),
  m('dejeuner', '🫓', 'Quesadillas haricots-fromage', [620, 75, 26, 22], 10, 1.4, 'vegetarien', ['facile'], ['2 tortillas', '½ boîte de haricots rouges', 'Emmental râpé', 'Sauce salsa']),
  m('dejeuner', '🥘', 'Gnocchis poêlés à la tomate', [620, 105, 18, 12], 10, 1.3, 'vegetarien', FUEL, ['300 g de gnocchis', 'Sauce tomate', 'Mozzarella ou râpé']),
  m('dejeuner', '🍳', 'Omelette au fromage & pain', [520, 30, 30, 28], 8, 1, 'vegetarien', CALM, ['3 œufs', 'Emmental', '2 tranches de pain', 'Salade']),
  m('dejeuner', '🍝', 'Pâtes jambon-crème', [700, 90, 32, 22], 12, 1.4, 'omnivore', ['intense', 'long'], ['100 g de pâtes', '2 tranches de jambon', '2 c. à soupe de crème', 'Râpé']),
  m('dejeuner', '🥗', 'Taboulé maison & poulet', [600, 80, 35, 12], 10, 1.8, 'omnivore', ['facile', 'intense', 'long'], ['70 g de semoule', 'Tomate, concombre', 'Citron, huile d’olive', '100 g de poulet'], { lactoseFree: true }),

  // ── Collations ────────────────────────────────────────────
  m('collation', '🍌', 'Banane', [110, 27, 1, 0], 0, 0.25, 'vegan', ALL, ['1 banane'], { glutenFree: true, lactoseFree: true, why: 'Le carburant le plus simple, avant ou après la séance.' }),
  m('collation', '🥛', 'Yaourt & compote', [200, 32, 6, 3], 1, 0.6, 'vegetarien', ALL, ['1 yaourt', '1 compote'], { glutenFree: true }),
  m('collation', '🍫', 'Lait chocolaté', [280, 40, 11, 7], 1, 0.5, 'vegetarien', ['long', 'intense', 'jour_course'], ['300 ml de lait', '2 c. à soupe de cacao'], {
    glutenFree: true,
    why: 'La boisson de récup la moins chère : glucides + protéines.',
  }),
  m('collation', '🥖', 'Pain & carré de chocolat', [250, 42, 6, 7], 1, 0.4, 'vegetarien', FUEL, ['1 morceau de baguette', '2 carrés de chocolat']),
  m('collation', '🥜', 'Poignée de cacahuètes & raisins secs', [220, 15, 8, 14], 0, 0.5, 'vegan', CALM, ['1 poignée de cacahuètes', '1 poignée de raisins secs'], { glutenFree: true, lactoseFree: true }),
  m('collation', '🍪', 'Biscuits secs & compote à boire', [220, 45, 3, 4], 0, 0.6, 'vegetarien', RACE, ['4 petits-beurre', '1 gourde de compote'], { why: 'Encas d’attente avant le départ, très digeste.' }),
  m('collation', '🍓', 'Fromage blanc & confiture', [180, 24, 12, 3], 1, 0.5, 'vegetarien', ALL, ['150 g de fromage blanc', '1 c. à soupe de confiture'], { glutenFree: true }),
  m('collation', '🍎', 'Pomme & portion de fromage', [180, 20, 6, 9], 0, 0.6, 'vegetarien', CALM, ['1 pomme', '1 portion de fromage'], { glutenFree: true }),
  m('collation', '🥚', 'Deux œufs durs', [150, 1, 13, 10], 10, 0.5, 'vegetarien', ['repos'], ['2 œufs', 'Sel'], { glutenFree: true, lactoseFree: true }),
  m('collation', '🌾', 'Barre de céréales', [130, 22, 2, 4], 0, 0.4, 'vegetarien', ['intense', 'long'], ['1 barre de céréales']),
  m('collation', '🍮', 'Riz au lait', [200, 32, 5, 5], 0, 0.5, 'vegetarien', ['veille_course', 'long'], ['1 pot de riz au lait'], { glutenFree: true }),
  m('collation', '🥤', 'Smoothie banane-lait', [260, 42, 9, 6], 3, 0.6, 'vegetarien', ['long', 'intense'], ['1 banane', '250 ml de lait'], { glutenFree: true }),

  // ── Dîners ────────────────────────────────────────────────
  m('diner', '🍝', 'Pâtes bolognaise express', [700, 90, 40, 18], 15, 2, 'omnivore', FUEL, ['100 g de pâtes', '1 steak haché 5 %', 'Sauce tomate', 'Râpé'], { lactoseFree: true }),
  m('diner', '🐟', 'Riz, poisson pané & haricots verts', [620, 80, 28, 18], 15, 1.9, 'pescetarien', ['repos', 'facile', 'intense'], ['80 g de riz', '2 poissons panés (au four)', 'Haricots verts surgelés'], { lactoseFree: true }),
  m('diner', '🍳', 'Omelette pommes de terre-oignon', [520, 45, 24, 26], 20, 1, 'vegetarien', CALM, ['3 œufs', '2 pommes de terre', '1 oignon'], { glutenFree: true, lactoseFree: true }),
  m('diner', '🥣', 'Soupe, tartines fromage & œuf', [500, 50, 24, 22], 8, 1.5, 'vegetarien', CALM, ['½ brique de soupe de légumes', '2 tartines', 'Fromage', '1 œuf']),
  m('diner', '🍚', 'Riz cantonais express', [650, 90, 28, 18], 15, 1.4, 'omnivore', [...FUEL, 'facile'], ['80 g de riz (idéalement cuit la veille)', '1 œuf', 'Petits pois', '2 tranches de jambon en dés'], { lactoseFree: true }),
  m('diner', '🥔', 'Purée en flocons & jambon', [520, 55, 30, 18], 8, 1.3, 'omnivore', ['repos', 'facile', 'veille_course'], ['1 portion de purée en flocons au lait', '2 tranches de jambon (ou 1 filet de poisson)', 'Légumes surgelés'], { glutenFree: true }),
  m('diner', '🌮', 'Tacos maison au poulet', [680, 70, 40, 24], 15, 2.2, 'omnivore', ['intense', 'long'], ['3 tortillas', '120 g de poulet', '1 poivron', 'Fromage râpé, salsa']),
  m('diner', '🍝', 'Pâtes au pesto & poulet', [700, 90, 36, 22], 12, 1.9, 'omnivore', FUEL, ['100 g de pâtes', '1 c. à soupe de pesto', '100 g de poulet']),
  m('diner', '🍲', 'Dahl de lentilles corail & riz', [620, 100, 24, 12], 20, 1, 'vegan', ALL, ['70 g de lentilles corail', '60 g de riz', '½ brique de lait de coco (ou tomates concassées)', 'Curry'], {
    glutenFree: true,
    lactoseFree: true,
    why: 'Moins de 1 € la portion, à cuisiner en grande quantité.',
  }),
  m('diner', '🍳', 'Œufs à la tomate & pain', [480, 45, 22, 22], 15, 1.2, 'vegetarien', CALM, ['3 œufs', '½ boîte de tomates concassées', '1 oignon', 'Pain'], { lactoseFree: true }),
  m('diner', '🍕', 'Pizza sur pain pita', [650, 75, 32, 22], 12, 1.8, 'omnivore', ['intense', 'long'], ['2 pains pita', 'Sauce tomate', 'Jambon', 'Mozzarella']),
  m('diner', '🍚', 'Riz blanc, poulet & carottes', [620, 95, 38, 8], 20, 1.8, 'omnivore', ['veille_course'], ['110 g de riz blanc', '130 g de poulet', 'Carottes (en boîte ou cuites)'], {
    glutenFree: true,
    lactoseFree: true,
    why: 'Le dîner type de veille de course : glucides, peu de fibres et de gras.',
  }),
  m('diner', '🥓', 'Poêlée pommes de terre-lardons', [650, 60, 25, 32], 20, 1.5, 'omnivore', ['long', 'intense'], ['300 g de pommes de terre', '75 g de lardons', 'Salade verte'], { glutenFree: true, lactoseFree: true }),
  m('diner', '🥘', 'Couscous express pois chiches', [600, 95, 22, 10], 10, 1.2, 'vegan', ['facile', 'intense', 'long'], ['70 g de semoule', '½ boîte de pois chiches', 'Légumes surgelés', 'Épices à couscous'], { lactoseFree: true }),
  m('diner', '🐟', 'Semoule & sardines à la tomate', [580, 60, 30, 22], 8, 1.4, 'pescetarien', CALM, ['70 g de semoule', '1 boîte de sardines ou de maquereau', 'Tomates'], {
    lactoseFree: true,
    why: 'Des oméga-3 pour pas cher.',
  }),
]

export const MEAL_SLOTS: { key: MealSlot; label: string; time: string }[] = [
  { key: 'petit_dej', label: 'Petit-déjeuner', time: '7 h' },
  { key: 'dejeuner', label: 'Déjeuner', time: '12 h 30' },
  { key: 'collation', label: 'Collation', time: '16 h 30' },
  { key: 'diner', label: 'Dîner', time: '20 h' },
]

export function mealById(id: string): Meal | undefined {
  return MEALS.find((x) => x.id === id)
}

export function fmtPrice(eur: number): string {
  return `${eur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}
