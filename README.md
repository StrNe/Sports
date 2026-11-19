# Foulée 🏃

Application web pour suivre toutes tes données sportives au même endroit : course à pied, renforcement, musculation, courses à venir, records, sommeil et idées de repas adaptées à l'entraînement du jour.

Elle est pensée pour un coureur qui prépare un objectif : chaque écran répond à une question simple (« qu'est-ce que je fais aujourd'hui ? », « est-ce que je progresse ? », « est-ce que je récupère bien ? »).

## Ce que fait l'application

| Section | Contenu |
| --- | --- |
| **Accueil** | Compte à rebours vers la prochaine course avec la phase de préparation, forme du jour (sommeil + FC de repos + charge), séance prévue, repas du jour, chiffres de la semaine, conseils du coach, derniers records |
| **Planning** | Semaine d'entraînement : séances prévues et réalisées, bouton « C'est fait » qui pré-remplit la saisie |
| **Course à pied** | Volume hebdomadaire, répartition 80/20 (facile / intense, d'après la FC si renseignée), régularité, efficacité aérobie (mètres par battement), usure des chaussures, historique filtrable, import de fichiers `.fit` / `.gpx` / `.tcx` |
| **Renforcement** | Programmes prêts à l'emploi pour coureurs (Renfo A/B, gainage, prévention, mobilité, PPG), modèles personnels, suivi de la régularité |
| **Musculation** | Séries × répétitions × charge, tonnage, 1RM estimé (Epley), progression et records par exercice, « Refaire » une séance |
| **Courses & records** | Calendrier des courses (priorité A/B/C), résultats, records 5 km → marathon, prédictions de temps (Riegel) et VDOT |
| **Sommeil** | Durée, qualité, dette de sommeil, régularité du coucher, FC de repos, heure de coucher idéale, conseils |
| **Repas** | 4 idées de repas par jour adaptées au type de journée (repos, séance facile/intense, sortie longue, veille et jour de course), repères glucides / protéines / eau, menu de la semaine et liste de courses. Régime végétarien, végan, sans gluten ou sans lactose pris en compte |
| **Outils coureur** | Calculateur d'allure et temps de passage, prédictions + allures d'entraînement (méthode Daniels), zones cardiaques (Karvonen) et zones VMA, plan de ravitaillement, planificateur **Backyard** (longueur de boucle réglable, marche-course, marge par boucle) |
| **Profil & données** | Profil, préférences, thème clair/sombre, export/import de sauvegarde, données de démonstration |

## Tes données

- Tout est stocké **dans ton navigateur, sur ton appareil**. Rien n'est envoyé sur un serveur.
- Pense à **exporter une sauvegarde** de temps en temps (Profil & données → Exporter). C'est aussi comme ça qu'on passe de l'ordinateur au téléphone : exporter d'un côté, importer de l'autre.
- Ne committe jamais tes sauvegardes dans ce dépôt (il est public) : le `.gitignore` ignore déjà les fichiers `foulee-*.json`.

### Importer depuis ta montre

Exporte une activité au format `.fit` depuis l'application de ta montre (COROS, Garmin, Suunto…) ou depuis Strava (`.gpx` / `.tcx`), puis utilise **+ → Importer depuis ma montre**. Les doublons sont ignorés.

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
