import type { DayType, Diet, MealSlot } from '../types'

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
    .replace(/[\u0300-\u036f]/g, '')
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
  diet: Diet,
  goodFor: DayType[],
  ingredients: string[],
  opts: Opts = {},
): Meal {
  return { id: `${slot}-${slugify(name)}`, slot, emoji, name, kcal, carbs, protein, fat, prepMin, diet, goodFor, ingredients, ...opts }
}

export const MEALS: Meal[] = [
  // ── Petits-déjeuners ──────────────────────────────────────
  m('petit_dej', '🥣', 'Porridge banane & beurre de cacahuète', [560, 80, 18, 17], 8, 'vegetarien', ALL,
    ['70 g de flocons d’avoine', '250 ml de lait (ou boisson végétale)', '1 banane', '1 c. à soupe de beurre de cacahuète', 'Cannelle'],
    { why: 'Glucides à libération progressive, parfait avant une séance.' }),
  m('petit_dej', '🍳', 'Œufs brouillés, avocat & pain complet', [520, 45, 25, 26], 10, 'vegetarien', ['repos', 'facile', 'intense'],
    ['2 tranches de pain complet', '2 œufs', '½ avocat', 'Tomates cerises', 'Sel, poivre, piment d’Espelette'], { lactoseFree: true }),
  m('petit_dej', '🫐', 'Skyr, granola & fruits rouges', [450, 65, 28, 9], 3, 'vegetarien', ALL,
    ['200 g de skyr ou fromage blanc', '40 g de granola', '100 g de fruits rouges', '1 c. à café de miel'], { why: 'Riche en protéines pour la récupération musculaire.' }),
  m('petit_dej', '🥞', 'Pancakes banane-avoine & sirop d’érable', [520, 75, 20, 14], 15, 'vegetarien', FUEL,
    ['1 banane bien mûre', '2 œufs', '50 g de flocons d’avoine', '1 c. à soupe de sirop d’érable', 'Quelques myrtilles'], { lactoseFree: true }),
  m('petit_dej', '🍚', 'Riz au lait vanille & compote', [480, 90, 12, 7], 5, 'vegetarien', [...RACE, 'long'],
    ['Riz au lait (maison ou nature)', '1 compote de pomme', '1 c. à café de miel'], { glutenFree: true, why: 'Glucides faciles à digérer, peu de fibres : idéal avant une course.' }),
  m('petit_dej', '🍞', 'Pain blanc, confiture, miel & yaourt', [500, 90, 14, 9], 3, 'vegetarien', [...RACE, 'intense'],
    ['3 tranches de pain blanc ou brioche', 'Confiture / miel', '1 yaourt nature', 'Jus d’orange'], { why: 'Le classique d’avant-course : énergie rapide et digeste. À prendre 3 h avant le départ.' }),
  m('petit_dej', '🥬', 'Omelette épinards-fromage & tartine', [480, 30, 30, 25], 10, 'vegetarien', CALM,
    ['3 œufs', 'Poignée d’épinards', '20 g d’emmental râpé', '1 tranche de pain complet']),
  m('petit_dej', '🍓', 'Smoothie bowl banane-fruits rouges', [450, 75, 14, 11], 7, 'vegan', ALL,
    ['1 banane congelée', '100 g de fruits rouges', '150 ml de boisson soja', '30 g de flocons d’avoine', '1 c. à soupe de graines de chia'], { lactoseFree: true }),
  m('petit_dej', '🍎', 'Overnight oats pomme-cannelle', [480, 72, 18, 12], 5, 'vegan', ALL,
    ['60 g de flocons d’avoine', '200 ml de boisson soja', '1 pomme râpée', '1 c. à soupe de purée d’amande', 'Cannelle — à préparer la veille'], { lactoseFree: true }),
  m('petit_dej', '🐟', 'Tartines saumon fumé & fromage frais', [430, 40, 26, 18], 5, 'pescetarien', CALM,
    ['2 tranches de pain de seigle', '60 g de saumon fumé', 'Fromage frais', 'Concombre, aneth, citron'], { why: 'Oméga-3 anti-inflammatoires.' }),
  m('petit_dej', '🥛', 'Bircher muesli', [470, 65, 18, 15], 5, 'vegetarien', ALL,
    ['50 g de flocons d’avoine', '125 g de yaourt', '1 pomme râpée', '15 g de noisettes', 'Raisins secs']),
  m('petit_dej', '🍌', 'Toasts beurre de cacahuète, banane & agave', [480, 70, 15, 16], 4, 'vegan', FUEL,
    ['2 tranches de pain de mie complet', '1 c. à soupe de beurre de cacahuète', '1 banane', 'Filet de sirop d’agave'], { lactoseFree: true }),
  m('petit_dej', '🥭', 'Quinoa sucré lait de coco & mangue', [470, 75, 12, 14], 15, 'vegan', ALL,
    ['60 g de quinoa', '150 ml de lait de coco léger', '½ mangue', 'Zeste de citron vert'], { glutenFree: true, lactoseFree: true }),
  m('petit_dej', '🍅', 'Tofu brouillé au curcuma & pain complet', [430, 38, 26, 18], 10, 'vegan', CALM,
    ['150 g de tofu ferme', 'Curcuma, poivre', 'Tomates & oignon', '1 tranche de pain complet'], { lactoseFree: true }),
  m('petit_dej', '🥝', 'Pudding de chia coco & kiwi', [380, 40, 10, 20], 5, 'vegan', CALM,
    ['3 c. à soupe de graines de chia', '200 ml de boisson coco', '2 kiwis', 'Noix de coco râpée — préparé la veille'], { glutenFree: true, lactoseFree: true }),
  m('petit_dej', '🥣', 'Semoule au lait & banane', [450, 85, 13, 6], 8, 'vegetarien', [...RACE, 'long'],
    ['50 g de semoule fine', '300 ml de lait', '1 banane', '1 c. à café de sucre vanillé'], { why: 'Pauvre en fibres, très digeste le matin d’une course.' }),
  m('petit_dej', '🥜', 'Yaourt grec, fruits, noix & pain complet', [430, 45, 25, 16], 4, 'vegetarien', CALM,
    ['150 g de yaourt grec', '1 fruit de saison', '15 g de noix', '1 tranche de pain complet']),

  // ── Déjeuners ─────────────────────────────────────────────
  m('dejeuner', '🍝', 'Pâtes complètes, poulet, brocolis & parmesan', [720, 90, 45, 18], 20, 'omnivore', ['facile', 'intense', 'long'],
    ['100 g de pâtes complètes (cru)', '130 g de blanc de poulet', '150 g de brocolis', '15 g de parmesan', 'Huile d’olive, ail']),
  m('dejeuner', '🍣', 'Poke bowl saumon, avocat & edamame', [700, 80, 35, 25], 20, 'pescetarien', ALL,
    ['80 g de riz (cru)', '120 g de saumon', '½ avocat', '50 g d’edamame', 'Concombre, sauce soja (tamari si sans gluten), sésame'], { glutenFree: true, lactoseFree: true }),
  m('dejeuner', '🥗', 'Salade de lentilles, feta & tomates', [600, 65, 28, 22], 15, 'vegetarien', CALM,
    ['200 g de lentilles cuites', '50 g de feta', 'Tomates, oignon rouge, persil', 'Vinaigrette moutarde'], { glutenFree: true, why: 'Fer et fibres : top les jours calmes.' }),
  m('dejeuner', '🌯', 'Wrap poulet, houmous & crudités', [620, 60, 38, 22], 10, 'omnivore', CALM,
    ['2 galettes de blé', '120 g de poulet', '3 c. à soupe de houmous', 'Carottes râpées, salade, concombre'], { lactoseFree: true }),
  m('dejeuner', '🥙', 'Buddha bowl quinoa, pois chiches & patate douce', [650, 85, 22, 22], 30, 'vegan', ALL,
    ['70 g de quinoa (cru)', '150 g de pois chiches rôtis', '1 petite patate douce', 'Épinards frais', 'Sauce tahini-citron'], { glutenFree: true, lactoseFree: true }),
  m('dejeuner', '🍛', 'Riz basmati, dinde & courgettes sauce curry', [680, 85, 42, 14], 20, 'omnivore', ['intense', 'long'],
    ['90 g de riz basmati (cru)', '130 g d’escalope de dinde', '1 courgette', 'Yaourt + curry doux'], { glutenFree: true }),
  m('dejeuner', '🍅', 'Gnocchis tomate, mozzarella & basilic', [650, 100, 22, 16], 15, 'vegetarien', FUEL,
    ['300 g de gnocchis', 'Sauce tomate maison', '60 g de mozzarella', 'Basilic frais']),
  m('dejeuner', '🍝', 'Pâtes blanches au thon & sauce tomate', [700, 115, 35, 9], 15, 'pescetarien', ['veille_course', 'long'],
    ['120 g de pâtes (cru)', '1 boîte de thon au naturel', 'Sauce tomate', 'Huile d’olive'], { lactoseFree: true, why: 'Recharge glucidique, peu de fibres : parfait la veille d’une course.' }),
  m('dejeuner', '🫒', 'Salade niçoise aux pommes de terre', [600, 50, 35, 26], 20, 'pescetarien', CALM,
    ['200 g de pommes de terre', '2 œufs durs', '1 boîte de thon', 'Haricots verts, tomates, olives'], { glutenFree: true, lactoseFree: true }),
  m('dejeuner', '🌶️', 'Chili sin carne & riz', [680, 110, 26, 12], 25, 'vegan', ['facile', 'intense', 'long'],
    ['70 g de riz (cru)', '150 g de haricots rouges', '80 g de maïs', 'Tomates concassées, oignon, épices'], { glutenFree: true, lactoseFree: true }),
  m('dejeuner', '🥔', 'Tortilla de pommes de terre & salade verte', [580, 55, 25, 28], 25, 'vegetarien', CALM,
    ['3 œufs', '250 g de pommes de terre', 'Oignon', 'Salade verte, vinaigrette'], { glutenFree: true, lactoseFree: true }),
  m('dejeuner', '🥪', 'Club sandwich poulet-avocat', [620, 55, 38, 24], 10, 'omnivore', ['facile'],
    ['3 tranches de pain complet', '120 g de poulet', '½ avocat', 'Tomate, salade, moutarde'], { lactoseFree: true }),
  m('dejeuner', '🌿', 'Taboulé boulgour, poulet grillé & menthe', [650, 85, 38, 16], 20, 'omnivore', ['facile', 'intense', 'long'],
    ['80 g de boulgour (cru)', '120 g de poulet', 'Tomates, concombre, menthe, persil', 'Citron, huile d’olive, grenade'], { lactoseFree: true }),
  m('dejeuner', '🍄', 'Risotto champignons & parmesan', [640, 95, 20, 18], 30, 'vegetarien', ['intense', 'veille_course'],
    ['90 g de riz arborio', '150 g de champignons', '20 g de parmesan', 'Bouillon de légumes, échalote'], { glutenFree: true }),
  m('dejeuner', '🥩', 'Steak haché 5 %, purée & haricots verts', [650, 60, 42, 24], 20, 'omnivore', ['repos', 'facile', 'intense'],
    ['1 steak haché 5 %', '250 g de pommes de terre', '150 g de haricots verts', 'Un peu de lait et de beurre'], { glutenFree: true, why: 'Fer héminique pour l’oxygénation des muscles.' }),
  m('dejeuner', '🍛', 'Curry de pois chiches coco & riz basmati', [700, 105, 22, 20], 25, 'vegan', ['intense', 'long'],
    ['80 g de riz basmati (cru)', '150 g de pois chiches', '100 ml de lait de coco léger', 'Épinards, tomates, pâte de curry'], { glutenFree: true, lactoseFree: true }),
  m('dejeuner', '🥗', 'Salade de pâtes, mozzarella, pesto & roquette', [680, 90, 25, 24], 15, 'vegetarien', ['intense', 'long'],
    ['100 g de pâtes (cru)', '60 g de mozzarella', 'Tomates cerises', '1 c. à soupe de pesto', 'Roquette']),
  m('dejeuner', '🍜', 'Soupe miso, soba, tofu & légumes', [550, 80, 26, 12], 15, 'vegan', CALM,
    ['80 g de nouilles soba', '100 g de tofu', 'Pâte miso', 'Champignons, pak choï, oignon nouveau'], { lactoseFree: true }),
  m('dejeuner', '🍚', 'Riz cantonais au poulet & petits pois', [700, 105, 35, 14], 20, 'omnivore', ['veille_course', 'long'],
    ['100 g de riz (cru)', '100 g de poulet', '1 œuf', 'Petits pois, sauce soja'], { lactoseFree: true }),
  m('dejeuner', '🧆', 'Pita falafels, houmous & crudités', [680, 85, 22, 26], 15, 'vegetarien', ['facile'],
    ['1 grand pain pita', '5 falafels', 'Houmous', 'Crudités, sauce yaourt-menthe']),
  m('dejeuner', '🐟', 'Pavé de saumon, quinoa & légumes rôtis', [680, 60, 40, 28], 30, 'pescetarien', ['repos', 'facile', 'intense'],
    ['130 g de saumon', '70 g de quinoa (cru)', 'Poivrons, courgettes, oignon rôtis', 'Citron, aneth'], { glutenFree: true, lactoseFree: true }),
  m('dejeuner', '🥞', 'Galette de sarrasin complète & salade', [560, 45, 32, 26], 15, 'omnivore', CALM,
    ['1 galette de sarrasin', '1 œuf', '1 tranche de jambon', '20 g d’emmental', 'Salade verte'], { glutenFree: true }),

  // ── Collations ────────────────────────────────────────────
  m('collation', '🍌', 'Banane & amandes', [250, 30, 6, 12], 1, 'vegan', ALL, ['1 banane', '20 g d’amandes'], { glutenFree: true, lactoseFree: true }),
  m('collation', '🍯', 'Yaourt grec, miel & noix', [250, 20, 18, 11], 2, 'vegetarien', CALM, ['150 g de yaourt grec', '1 c. à café de miel', '10 g de noix'], { glutenFree: true }),
  m('collation', '🌾', 'Barre maison avoine-dattes-cacahuètes', [230, 32, 6, 9], 2, 'vegan', ['intense', 'long'], ['Flocons d’avoine, dattes mixées et cacahuètes (à préparer pour la semaine)'], { lactoseFree: true }),
  m('collation', '🍏', 'Fromage blanc & compote', [200, 28, 14, 3], 1, 'vegetarien', ALL, ['150 g de fromage blanc', '1 compote sans sucre ajouté'], { glutenFree: true }),
  m('collation', '🍞', 'Pain d’épices & verre de lait', [250, 45, 8, 4], 1, 'vegetarien', FUEL, ['2 tranches de pain d’épices', '1 verre de lait']),
  m('collation', '🥜', 'Tartine beurre de cacahuète', [250, 25, 9, 13], 2, 'vegan', ALL, ['1 tranche de pain complet', '1 c. à soupe de beurre de cacahuète'], { lactoseFree: true }),
  m('collation', '🥤', 'Smoothie récup banane-cacao', [320, 50, 15, 6], 4, 'vegetarien', ['intense', 'long', 'jour_course'], ['1 banane', '250 ml de lait', '1 c. à soupe de cacao', '20 g de flocons d’avoine'], { why: 'Dans les 30 min après l’effort : glucides + protéines.' }),
  m('collation', '🌴', 'Dattes & noix de cajou', [230, 30, 5, 10], 1, 'vegan', ['intense', 'long'], ['4 dattes', '15 g de noix de cajou'], { glutenFree: true, lactoseFree: true }),
  m('collation', '🧀', 'Pomme & morceau de comté', [200, 20, 8, 10], 1, 'vegetarien', CALM, ['1 pomme', '25 g de comté'], { glutenFree: true }),
  m('collation', '🥕', 'Houmous, carottes & crackers', [220, 22, 7, 11], 3, 'vegan', CALM, ['3 c. à soupe de houmous', 'Bâtonnets de carotte', '3 crackers'], { lactoseFree: true }),
  m('collation', '🍮', 'Riz au lait', [250, 40, 8, 6], 1, 'vegetarien', ['veille_course', 'long'], ['1 riz au lait', '1 poignée de raisins secs'], { glutenFree: true }),
  m('collation', '🥚', 'Œufs durs & tomates cerises', [170, 3, 13, 11], 10, 'vegetarien', ['repos'], ['2 œufs durs', 'Tomates cerises', 'Sel, poivre'], { glutenFree: true, lactoseFree: true }),
  m('collation', '🍪', 'Compote à boire & biscuits secs', [220, 48, 3, 2], 1, 'vegetarien', RACE, ['1 gourde de compote', '4 boudoirs ou petits-beurre'], { why: 'Encas d’attente avant le départ, très digeste.' }),
  m('collation', '🫛', 'Edamame salés', [180, 12, 16, 7], 5, 'vegan', CALM, ['150 g d’edamame', 'Fleur de sel'], { glutenFree: true, lactoseFree: true }),
  m('collation', '🍫', 'Lait chocolaté & banane', [330, 58, 13, 6], 1, 'vegetarien', ['long', 'intense', 'jour_course'], ['300 ml de lait chocolaté', '1 banane'], { glutenFree: true, why: 'Ratio glucides/protéines 3:1, la boisson de récup la plus simple.' }),
  m('collation', '🥝', 'Skyr & kiwi', [180, 22, 15, 1], 1, 'vegetarien', CALM, ['150 g de skyr', '2 kiwis'], { glutenFree: true }),

  // ── Dîners ────────────────────────────────────────────────
  m('diner', '🐟', 'Saumon au four, patate douce & haricots verts', [650, 60, 40, 26], 30, 'pescetarien', ALL,
    ['130 g de saumon', '1 patate douce', '150 g de haricots verts', 'Citron, herbes'], { glutenFree: true, lactoseFree: true, why: 'Oméga-3 + glucides : récupération optimale.' }),
  m('diner', '🍗', 'Poulet rôti, riz & ratatouille', [650, 75, 45, 16], 30, 'omnivore', ALL,
    ['130 g de poulet', '80 g de riz (cru)', 'Ratatouille (courgette, aubergine, poivron, tomate)'], { glutenFree: true, lactoseFree: true }),
  m('diner', '🍲', 'Dahl de lentilles corail & riz basmati', [620, 100, 26, 12], 25, 'vegan', ALL,
    ['80 g de lentilles corail', '60 g de riz basmati', 'Lait de coco léger, tomates', 'Curcuma, cumin, coriandre'], { glutenFree: true, lactoseFree: true }),
  m('diner', '🍝', 'Pâtes bolognaise maison', [720, 95, 40, 18], 25, 'omnivore', FUEL,
    ['110 g de pâtes (cru)', '120 g de bœuf haché 5 %', 'Sauce tomate, carotte, oignon', 'Parmesan']),
  m('diner', '🥣', 'Soupe de légumes, tartines chèvre & œuf', [520, 50, 26, 24], 25, 'vegetarien', CALM,
    ['Grand bol de soupe de légumes', '2 tartines de pain complet', '30 g de chèvre', '1 œuf mollet']),
  m('diner', '🥢', 'Wok de bœuf, nouilles de riz & légumes', [650, 85, 38, 16], 20, 'omnivore', ['intense', 'long'],
    ['80 g de nouilles de riz', '120 g de bœuf émincé', 'Poivron, carotte, brocoli', 'Sauce soja (tamari), gingembre'], { glutenFree: true, lactoseFree: true }),
  m('diner', '🐠', 'Cabillaud, purée maison & épinards', [560, 55, 40, 18], 25, 'pescetarien', ['repos', 'facile', 'veille_course'],
    ['150 g de cabillaud', '250 g de pommes de terre', 'Épinards', 'Un peu de lait et de beurre'], { glutenFree: true }),
  m('diner', '🍳', 'Omelette aux légumes & pommes de terre sautées', [560, 45, 28, 28], 20, 'vegetarien', CALM,
    ['3 œufs', 'Poivron, champignons, oignon', '200 g de pommes de terre', 'Salade verte'], { glutenFree: true, lactoseFree: true }),
  m('diner', '🍱', 'Tofu laqué, riz complet & brocolis', [600, 80, 28, 18], 25, 'vegan', ['facile', 'intense'],
    ['150 g de tofu', '70 g de riz complet', 'Brocolis', 'Sauce soja, sirop d’érable, sésame'], { lactoseFree: true }),
  m('diner', '🍕', 'Pizza maison jambon-champignons', [720, 90, 35, 24], 30, 'omnivore', ['intense', 'long'],
    ['Pâte à pizza fine', 'Sauce tomate', 'Jambon, champignons', '60 g de mozzarella', 'Roquette'], { why: 'Plaisir + recharge en glucides après une grosse séance.' }),
  m('diner', '🌶️', 'Chili con carne & riz', [700, 90, 42, 18], 30, 'omnivore', ['intense', 'long'],
    ['120 g de bœuf haché 5 %', '100 g de haricots rouges', '60 g de riz (cru)', 'Tomates, poivron, épices'], { glutenFree: true, lactoseFree: true }),
  m('diner', '🍋', 'Pâtes au saumon & citron', [700, 90, 35, 22], 20, 'pescetarien', FUEL,
    ['110 g de pâtes (cru)', '100 g de saumon', 'Crème légère', 'Citron, aneth, petits pois']),
  m('diner', '🍳', 'Shakshuka & pain', [520, 50, 24, 24], 25, 'vegetarien', CALM,
    ['3 œufs', 'Tomates concassées, poivrons, oignon', 'Cumin, paprika', '1 morceau de pain'], { lactoseFree: true }),
  m('diner', '🥘', 'Lasagnes aux légumes & ricotta', [650, 70, 30, 26], 45, 'vegetarien', ['intense', 'long'],
    ['Feuilles de lasagnes', 'Courgettes, épinards', '100 g de ricotta', 'Sauce tomate, mozzarella']),
  m('diner', '🍤', 'Bowl riz, crevettes & ananas', [600, 90, 32, 10], 20, 'pescetarien', ['intense', 'long'],
    ['80 g de riz (cru)', '120 g de crevettes', 'Ananas, poivron', 'Sauce sweet chili, coriandre'], { glutenFree: true, lactoseFree: true }),
  m('diner', '🎃', 'Velouté de potimarron, quinoa & feta', [520, 60, 20, 22], 30, 'vegetarien', CALM,
    ['Velouté de potimarron', '60 g de quinoa (cru)', '40 g de feta', 'Graines de courge'], { glutenFree: true }),
  m('diner', '🫓', 'Dinde, semoule & légumes du couscous', [640, 85, 42, 12], 30, 'omnivore', ['intense', 'long', 'veille_course'],
    ['130 g de dinde', '80 g de semoule (cru)', 'Carottes, courgettes, navets', 'Épices à couscous'], { lactoseFree: true }),
  m('diner', '🐟', 'Salade tiède pommes de terre & maquereau', [600, 45, 30, 32], 20, 'pescetarien', CALM,
    ['250 g de pommes de terre', '1 filet de maquereau', 'Oignon rouge, ciboulette', 'Vinaigrette moutarde'], { glutenFree: true, lactoseFree: true, why: 'Riche en oméga-3 et vitamine D.' }),
  m('diner', '🍔', 'Burger maison & potatoes au four', [750, 80, 42, 28], 30, 'omnivore', ['long', 'intense'],
    ['1 pain à burger complet', '1 steak haché 5 %', 'Crudités, cheddar', '200 g de pommes de terre au four']),
  m('diner', '🌿', 'Pâtes au pesto, haricots blancs & tomates séchées', [700, 100, 24, 22], 15, 'vegetarien', ['veille_course', 'long'],
    ['110 g de pâtes (cru)', '1 c. à soupe de pesto', '100 g de haricots blancs', 'Tomates séchées, roquette']),
  m('diner', '🍚', 'Riz blanc, poulet & carottes fondantes', [620, 100, 40, 6], 25, 'omnivore', ['veille_course'],
    ['110 g de riz blanc (cru)', '130 g de blanc de poulet', 'Carottes cuites', 'Un filet d’huile d’olive'], { glutenFree: true, lactoseFree: true, why: 'Le dîner type de veille de course : glucides, peu de fibres et de graisses.' }),
  m('diner', '🥥', 'Curry de légumes & tempeh, riz', [640, 85, 28, 20], 30, 'vegan', ['facile', 'intense'],
    ['100 g de tempeh', '70 g de riz (cru)', 'Chou-fleur, petits pois, carotte', 'Lait de coco léger, pâte de curry'], { glutenFree: true, lactoseFree: true }),
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
