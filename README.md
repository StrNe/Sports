# Life

Application web pour suivre ton entraînement et ton quotidien au même endroit : séance du jour, course à pied, renforcement, musculation, courses et records, sommeil et récupération, calories et tâches ménagères.

L'accueil répond en un coup d'œil à « qu'est-ce que je fais aujourd'hui ? » et « est-ce que je suis en forme ? » ; tout le détail vit dans les pages dédiées. Thème sombre par défaut.

## Deux façons de l'utiliser

| | Version claude.ai (recommandée) | Version GitHub Pages |
| --- | --- | --- |
| Données COROS | **Synchronisées automatiquement** à l'ouverture : tout l'historique, chaque nouvelle sortie, les nuits, la VFC, la FC de repos, la récupération, la charge d'entraînement, les pas, le plan d'entraînement avec le détail de chaque séance, et les tours de tes sorties structurées | Import manuel (`.fit`, `.gpx`, `.tcx` ou sauvegarde) |
| Stockage | Sauvegarde en ligne privée : mêmes données sur téléphone et ordinateur | Dans le navigateur de l'appareil |
| Construction | `npm run build:artifact` → `dist-artifact/foulee.html`, publié comme artifact claude.ai avec les capacités `mcp` (connecteur COROS, lecture seule), `db` (lecture et écriture réservées au propriétaire), `sample` (estimation des repas par Claude, photos comprises) et `downloads` | `npm run build` → `dist/`, déployé par GitHub Actions |

La version claude.ai utilise le connecteur COROS de ton compte claude.ai : la page ne voit jamais tes identifiants, et claude.ai te demande ton accord à la première synchronisation.

## Ce que fait l'application

| Section | Contenu |
| --- | --- |
| **Accueil** | En haut, la **séance du jour** avec son déroulé (échauffement, répétitions, allures ou FC cibles, consignes du plan) puis, une fois faite, le **prévu / réalisé** étape par étape (« 2 efforts sur 3 dans la cible ») ; dessous, **sommeil de la nuit, forme du jour et récupération** mesurée par la montre ; puis 4 tuiles qui ouvrent chacune leur page : km de la semaine, calories du jour, tâches ménagères, sommeil moyen. Le lundi, un rappel mène au bilan de la semaine |
| **Bilan de la semaine** | Chaque semaine (lundi → dimanche) : synthèse en quelques phrases (volume et tendance, plan suivi, sommeil, calories, poids, tâches), chiffres clés comparés à la semaine d'avant, tableau jour par jour ; navigation vers les semaines passées |
| **Planning** | Semaine d'entraînement : séances prévues et réalisées, bouton « C'est fait » qui pré-remplit la saisie, conseils du coach (charge, sommeil, phase de préparation, chaussures…) |
| **Course à pied** | Charge d'entraînement (mesurée par COROS, sinon calculée à partir des séances), volume hebdomadaire, répartition 80/20 (facile / intense, d'après la FC si renseignée), régularité, efficacité aérobie (mètres par battement), usure des chaussures, historique filtrable, import de fichiers `.fit` / `.gpx` / `.tcx` |
| **Renforcement** | Programmes prêts à l'emploi pour coureurs (Renfo A/B, gainage, prévention, mobilité, PPG), modèles personnels, suivi de la régularité |
| **Musculation** | Séries × répétitions × charge, tonnage, 1RM estimé (Epley), progression et records par exercice, « Refaire » une séance |
| **Courses & records** | Compte à rebours vers la course objectif avec la phase de préparation, calendrier des courses (priorité A/B/C), résultats, records 5 km → marathon, prédictions de temps (Riegel) et VDOT |
| **Sommeil & récupération** | Forme du jour détaillée (sommeil, VFC, FC de repos, charge et récupération COROS), durée, qualité, dette de sommeil, régularité du coucher, FC de repos, heure de coucher idéale, conseils |
| **Repas & calories** | Journal alimentaire : tu décris ce que tu as mangé (Claude estime calories et macros, photo possible dans la version claude.ai), tu **scannes le code-barres** d’un produit (photo décodée dans le navigateur ; un produit inconnu est complété à partir de la photo de son étiquette ou d’Open Food Facts hors claude.ai, puis mémorisé), tu cherches parmi ~100 aliments courants avec leurs portions, tu reprends un repas récent ou tu saisis à la main. Objectif du jour calculé à partir du métabolisme de base, de l’activité mesurée par la montre (pas, calories actives) et des séances, selon ton but (garder, perdre ou prendre du poids). Onglet Suivi : mangé vs dépensé jour par jour, écart moyen, effet estimé sur le poids et pesées |
| **Tâches ménagères** | **À faire bientôt** : rythme de chaque tâche régulière (déduit de ton historique ou réglé à la main, ex. draps toutes les 2 semaines), échéances et retards, « Fait » en un geste. Les tâches faites à la maison, saisies par toi (plusieurs d’un coup séparées par des virgules, ou en un geste parmi tes tâches habituelles), affichées jour par jour sur la semaine ; récap du jour, de la semaine et du mois avec comparaison à la période précédente, et graphique du mois. **Tout l’historique est conservé** : saut direct à n’importe quelle date, onglet Historique (années → mois → calendrier → détail du jour), recherche (« quand ai-je fait les vitres ? ») et export tableur (`.csv`) |
| **Outils coureur** | Calculateur d'allure et temps de passage, prédictions + allures d'entraînement (méthode Daniels), zones cardiaques (Karvonen) et zones VMA, plan de ravitaillement, planificateur **Backyard** (longueur de boucle réglable, marche-course, marge par boucle) |
| **Profil & données** | Profil, préférences, thème (sombre par défaut, clair ou automatique), export/import de sauvegarde, données de démonstration |

## Tes données

- Tout est stocké **dans ton navigateur, sur ton appareil**. Rien n'est envoyé sur un serveur.
- Pense à **exporter une sauvegarde** de temps en temps (Profil & données → Exporter). C'est aussi comme ça qu'on passe de l'ordinateur au téléphone : exporter d'un côté, importer de l'autre.
- Ne committe jamais tes sauvegardes dans ce dépôt (il est public) : le `.gitignore` ignore déjà les fichiers `life-*.json`, `foulee-*.json` (anciennes sauvegardes) et les exports de tâches.

### Importer depuis ta montre

Exporte une activité au format `.fit` depuis l'application de ta montre (COROS, Garmin, Suunto…) ou depuis Strava (`.gpx` / `.tcx`), puis utilise **+ → Importer depuis ma montre**. Les doublons sont ignorés.

### Mettre à jour depuis COROS

Un fichier de sauvegarde généré à partir de ton compte COROS (séances, nuits, plan d'entraînement, courses) peut être importé autant de fois que nécessaire via **Profil & données → Importer une sauvegarde (en fusionnant)** :
- les séances déjà présentes ne sont pas dupliquées (y compris si tu les avais importées en `.fit`) ;
- ce que tu as modifié dans l'appli (RPE, notes, type de séance, profil, séances validées) est conservé ;
- les changements du plan d'entraînement sont repris.

## Installer sur ton téléphone

Ouvre l'application dans le navigateur puis :
- **iPhone** (Safari) : Partager → *Sur l'écran d'accueil*
- **Android** (Chrome) : ⋮ → *Installer l'application*

Elle fonctionne ensuite comme une app, même hors connexion.

## Mise en ligne (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` construit et publie l'application à chaque push.
Une seule action manuelle est nécessaire : dans le dépôt GitHub, **Settings → Pages → Build and deployment → Source : GitHub Actions**. L'adresse sera ensuite `https://<ton-compte>.github.io/Sports/`.

## Développement

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests des calculs (allures, VDOT, charge, nutrition…)
npm run build      # build de production dans dist/
```

Stack : React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, Zustand (persistance locale), vite-plugin-pwa.

Organisation du code :

```
src/
  pages/        un fichier par écran
  components/   interface (ui, graphiques, formulaires, navigation)
  lib/          calculs : format, course (VDOT, charge, records…), nutrition, conseils, imports
  data/         repas, programmes de renfo/muscu, données de démo
  store/        état global et persistance
```

> Les repères nutritionnels et les conseils sont des ordres de grandeur issus des recommandations courantes en nutrition du sport ; ils ne remplacent pas l'avis d'un professionnel de santé.
