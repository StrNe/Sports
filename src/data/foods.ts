// Aliments courants (valeurs moyennes pour 100 g, d'après les tables de composition françaises)
// et portions habituelles. Sert à la recherche rapide quand on ne passe pas par Claude.

export interface FoodItem {
  id: string
  name: string
  emoji: string
  /** Mots-clés supplémentaires pour la recherche */
  aliases?: string
  kcal: number
  carbs: number
  protein: number
  fat: number
  portions: { label: string; g: number }[]
}

let n = 0
function f(emoji: string, name: string, [kcal, carbs, protein, fat]: [number, number, number, number], portions: [string, number][], aliases?: string): FoodItem {
  n++
  return { id: `f${n}`, emoji, name, kcal, carbs, protein, fat, aliases, portions: portions.map(([label, g]) => ({ label, g })) }
}

export const FOODS: FoodItem[] = [
  // Féculents
  f('🍝', 'Pâtes cuites', [150, 30, 5.5, 0.9], [['1 assiette', 250], ['1 petite assiette', 150], ['100 g', 100]], 'spaghetti coquillettes macaroni'),
  f('🍚', 'Riz blanc cuit', [130, 28, 2.7, 0.3], [['1 assiette', 200], ['1 petite portion', 120], ['100 g', 100]]),
  f('🍚', 'Riz complet cuit', [125, 26, 2.8, 1], [['1 assiette', 200], ['100 g', 100]]),
  f('🥣', 'Semoule cuite', [112, 23, 3.8, 0.2], [['1 assiette', 200], ['100 g', 100]], 'couscous'),
  f('🥔', 'Pommes de terre cuites', [80, 17, 2, 0.1], [['1 portion', 200], ['1 pomme de terre', 120]], 'patate vapeur'),
  f('🍟', 'Frites', [300, 37, 3.5, 15], [['1 portion moyenne', 150], ['1 grande portion', 220]]),
  f('🥔', 'Purée', [90, 13, 2, 3.5], [['1 portion', 200]], 'puree mousline'),
  f('🥟', 'Gnocchis', [150, 32, 4, 0.5], [['1 portion', 200]]),
  f('🍜', 'Nouilles instantanées (paquet)', [450, 60, 9, 19], [['1 paquet', 85]], 'ramen yum yum'),
  f('🌯', 'Tortilla / wrap', [300, 50, 8, 7], [['1 galette', 60]]),
  f('🥖', 'Baguette', [270, 55, 9, 1.5], [['1 morceau (1/8)', 30], ['1/4 de baguette', 60], ['1/2 baguette', 125]], 'pain'),
  f('🍞', 'Pain de mie', [280, 50, 8, 4], [['1 tranche', 25]], 'harry'),
  f('🍞', 'Pain complet', [240, 43, 9, 3], [['1 tranche', 35]]),
  f('🍘', 'Galette de riz', [380, 80, 8, 3], [['1 galette', 8]]),
  f('🥣', 'Flocons d’avoine', [370, 58, 13, 7], [['1 portion', 50], ['1 c. à soupe', 10]], 'porridge avoine'),
  f('🥣', 'Céréales (corn-flakes)', [375, 84, 7, 1], [['1 bol', 40]], 'cereales'),
  f('🥣', 'Muesli', [370, 62, 10, 7], [['1 bol', 50]], 'granola'),
  f('🍫', 'Céréales chocolatées', [400, 75, 8, 6], [['1 bol', 40]], 'chocapic'),
  f('🫘', 'Lentilles cuites', [116, 17, 9, 0.4], [['1 portion', 200], ['1/2 boîte', 200]]),
  f('🫘', 'Haricots rouges cuits', [110, 14, 8, 0.5], [['1/2 boîte', 200], ['100 g', 100]]),
  f('🫘', 'Pois chiches cuits', [140, 18, 8, 2.5], [['1/2 boîte', 200], ['100 g', 100]]),
  // Viandes, poissons, œufs
  f('🥚', 'Œuf', [145, 0.7, 12.5, 10], [['1 œuf', 55], ['2 œufs', 110], ['3 œufs', 165]], 'oeuf omelette'),
  f('🍗', 'Poulet (blanc cuit)', [165, 0, 31, 3.6], [['1 portion', 120], ['1 escalope', 150]], 'dinde escalope'),
  f('🥩', 'Steak haché 5 %', [150, 0, 26, 5], [['1 steak', 100]], 'boeuf'),
  f('🥩', 'Steak haché 15 %', [215, 0, 25, 13], [['1 steak', 100]], 'boeuf'),
  f('🥓', 'Jambon blanc', [115, 1, 21, 3], [['1 tranche', 40], ['2 tranches', 80]]),
  f('🥓', 'Lardons', [270, 0.5, 15, 23], [['1 portion', 75]]),
  f('🌭', 'Saucisse', [280, 1, 13, 25], [['1 saucisse', 100], ['1 knack', 35]], 'merguez chipolata'),
  f('🍗', 'Nuggets de poulet', [260, 15, 15, 15], [['6 nuggets', 100], ['9 nuggets', 150]]),
  f('🐟', 'Thon au naturel', [115, 0, 26, 1], [['1/2 boîte', 70], ['1 boîte', 140]]),
  f('🐟', 'Saumon', [200, 0, 21, 13], [['1 pavé', 125]]),
  f('🐟', 'Poisson pané', [220, 18, 13, 11], [['1 pièce', 60], ['2 pièces', 120]]),
  f('🐟', 'Sardines à l’huile (égouttées)', [210, 0, 24, 13], [['1 boîte', 85]], 'maquereau'),
  f('🍤', 'Crevettes', [100, 0, 21, 1.5], [['1 portion', 120]]),
  f('🧈', 'Tofu', [120, 2, 13, 7], [['1 portion', 100]]),
  // Produits laitiers
  f('🥛', 'Lait demi-écrémé', [46, 4.8, 3.3, 1.6], [['1 verre', 250], ['1 bol', 300]], 'lait'),
  f('🥛', 'Yaourt nature', [65, 5, 4, 3.2], [['1 pot', 125]], 'yaourt'),
  f('🍓', 'Yaourt aux fruits', [95, 14, 3.5, 2.5], [['1 pot', 125]]),
  f('🥛', 'Fromage blanc', [75, 4, 7.5, 3], [['1 portion', 100], ['1 bol', 200]]),
  f('🥛', 'Skyr', [60, 4, 10, 0.2], [['1 pot', 150]]),
  f('🧀', 'Emmental / gruyère', [380, 0, 28, 30], [['1 portion', 30], ['1 poignée râpé', 20]], 'fromage rape comte'),
  f('🧀', 'Camembert / fromage à pâte molle', [270, 0, 20, 21], [['1 portion', 30]], 'fromage brie'),
  f('🧀', 'Mozzarella', [250, 1, 18, 19], [['1/2 boule', 60], ['1 boule', 125]]),
  f('🧈', 'Beurre', [740, 0, 0.7, 82], [['1 noisette', 10], ['1 portion de table', 20]]),
  f('🥛', 'Crème fraîche', [290, 3, 2.5, 30], [['1 c. à soupe', 15], ['2 c. à soupe', 30]], 'creme'),
  // Fruits & légumes
  f('🍌', 'Banane', [90, 20, 1.1, 0.3], [['1 banane', 120]]),
  f('🍎', 'Pomme', [55, 12, 0.3, 0.2], [['1 pomme', 150]]),
  f('🍊', 'Orange', [47, 10, 1, 0.2], [['1 orange', 150]], 'clementine mandarine'),
  f('🍐', 'Fruit (moyenne)', [55, 12, 0.6, 0.2], [['1 fruit', 150]], 'poire peche kiwi raisin'),
  f('🍑', 'Compote', [65, 15, 0.3, 0.1], [['1 pot / gourde', 100]]),
  f('🍇', 'Raisins secs', [300, 66, 3, 0.5], [['1 poignée', 30]], 'dattes fruits secs'),
  f('🥑', 'Avocat', [160, 1, 2, 15], [['1/2 avocat', 80]]),
  f('🥦', 'Légumes cuits', [30, 4, 2, 0.2], [['1 portion', 200], ['1 petite portion', 100]], 'haricots verts brocoli courgette carotte epinard poelee'),
  f('🥗', 'Salade verte', [15, 1.5, 1.3, 0.2], [['1 bol', 50]], 'crudites'),
  f('🍅', 'Tomate', [20, 3, 1, 0.2], [['1 tomate', 120]]),
  f('🥕', 'Carottes râpées', [35, 7, 0.8, 0.2], [['1 portion', 100]]),
  f('🥣', 'Soupe de légumes', [35, 5, 1, 1], [['1 bol', 300]], 'potage veloute'),
  // Plats tout faits
  f('🍕', 'Pizza', [250, 28, 11, 10], [['1/2 pizza', 200], ['1 pizza entière', 400], ['1 part', 100]]),
  f('🍔', 'Burger', [250, 22, 13, 12], [['1 burger', 200], ['1 gros burger', 280]], 'hamburger cheeseburger mcdo'),
  f('🥙', 'Kebab', [215, 22, 11, 10], [['1 kebab', 400]], 'tacos'),
  f('🥪', 'Sandwich jambon-beurre', [280, 35, 12, 10], [['1 sandwich', 200]], 'sandwich'),
  f('🥪', 'Croque-monsieur', [250, 25, 13, 11], [['1 croque', 120]]),
  f('🥧', 'Quiche', [260, 18, 9, 17], [['1 part', 150]]),
  f('🍝', 'Lasagnes', [150, 13, 8, 7], [['1 portion', 300]]),
  f('🥗', 'Salade composée (traiteur)', [170, 15, 6, 9], [['1 barquette', 250]], 'salade de pates taboule'),
  f('🍣', 'Sushis', [150, 25, 6, 3], [['8 pièces', 200], ['12 pièces', 300]], 'maki'),
  f('🍜', 'Plat asiatique (wok)', [140, 18, 7, 4], [['1 portion', 350]], 'nouilles sautees riz cantonais'),
  // Sucré & grignotage
  f('🥐', 'Croissant', [400, 45, 8, 21], [['1 croissant', 60]]),
  f('🥐', 'Pain au chocolat', [420, 46, 8, 22], [['1 pain au chocolat', 70]], 'chocolatine'),
  f('🍞', 'Brioche', [360, 52, 8, 13], [['1 tranche', 30], ['1 grosse part', 60]]),
  f('🍪', 'Biscuits secs', [440, 75, 7, 12], [['4 biscuits', 33]], 'petit beurre gateaux'),
  f('🍪', 'Cookies', [480, 63, 6, 23], [['2 cookies', 40]], 'gateau'),
  f('🍫', 'Chocolat', [540, 50, 7, 33], [['2 carrés', 10], ['1/4 de tablette', 25]], 'chocolat noir lait'),
  f('🫙', 'Pâte à tartiner', [540, 57, 6, 31], [['1 c. à soupe', 15]], 'nutella'),
  f('🍓', 'Confiture', [250, 60, 0.4, 0.1], [['1 c. à soupe', 20]]),
  f('🍯', 'Miel', [320, 80, 0.4, 0], [['1 c. à café', 10]]),
  f('🍬', 'Sucre', [400, 100, 0, 0], [['1 morceau / 1 c. à café', 5]], 'cafe sucre'),
  f('🌾', 'Barre de céréales', [400, 66, 6, 12], [['1 barre', 25]]),
  f('🥜', 'Cacahuètes / amandes', [600, 10, 24, 50], [['1 poignée', 30]], 'noix cajou fruits a coque'),
  f('🥜', 'Beurre de cacahuète', [600, 12, 25, 50], [['1 c. à soupe', 15]]),
  f('🍿', 'Chips', [540, 50, 6, 35], [['1 petit paquet', 30], ['1/2 grand paquet', 75]], 'apero'),
  f('🍦', 'Glace', [200, 25, 3.5, 10], [['2 boules', 100]]),
  f('🍮', 'Riz au lait / crème dessert', [125, 20, 3, 3.5], [['1 pot', 125]], 'danette flan'),
  // Boissons & sport
  f('🥤', 'Soda', [42, 10.6, 0, 0], [['1 canette', 330], ['1 verre', 250]], 'coca cola'),
  f('🧃', 'Jus de fruits', [45, 10, 0.5, 0.1], [['1 verre', 200]], 'jus d orange'),
  f('🍺', 'Bière', [43, 3.5, 0.4, 0], [['1 demi', 250], ['1 pinte', 500]]),
  f('🍷', 'Vin', [85, 2.5, 0.1, 0], [['1 verre', 125]]),
  f('☕', 'Café au lait', [30, 3, 2, 1], [['1 tasse', 200]], 'latte cappuccino'),
  f('🧉', 'Boisson d’effort', [25, 6, 0, 0], [['1 bidon', 500]], 'isotonique'),
  f('⚡', 'Gel énergétique', [310, 78, 0, 0], [['1 gel', 32]], 'gel'),
  f('🥤', 'Lait chocolaté', [75, 11, 3.3, 1.8], [['1 verre', 250], ['1 bouteille', 300]], 'cacao'),
  // Sauces & matières grasses
  f('🫒', 'Huile', [900, 0, 0, 100], [['1 c. à soupe', 10], ['1 c. à café', 5]], 'huile olive'),
  f('🍅', 'Sauce tomate', [50, 8, 1.5, 1.5], [['3 c. à soupe', 60]], 'bolognaise'),
  f('🥫', 'Mayonnaise', [700, 1, 1, 77], [['1 c. à soupe', 15]], 'sauce'),
  f('🥫', 'Ketchup', [110, 25, 1.2, 0.2], [['1 c. à soupe', 15]]),
  f('🫙', 'Pesto', [450, 6, 5, 45], [['1 c. à soupe', 15]]),
  f('🫙', 'Houmous', [300, 14, 8, 24], [['2 c. à soupe', 30]]),
]

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
}

export function searchFoods(query: string, limit = 20): FoodItem[] {
  const q = norm(query.trim())
  if (!q) return []
  const words = q.split(/\s+/).filter(Boolean)
  return FOODS.map((food) => {
    const hay = norm(`${food.name} ${food.aliases ?? ''}`)
    const name = norm(food.name)
    if (!words.every((w) => hay.includes(w))) return null
    const score = (name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2) + name.length / 100
    return { food, score }
  })
    .filter((x): x is { food: FoodItem; score: number } => !!x)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.food)
}

export function portionValues(food: FoodItem, grams: number) {
  const k = grams / 100
  return { kcal: Math.round(food.kcal * k), carbs: Math.round(food.carbs * k), protein: Math.round(food.protein * k), fat: Math.round(food.fat * k) }
}
