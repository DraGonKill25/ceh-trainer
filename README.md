# CEH v13 Trainer — Exam 312-50v13

Application web de révision pour l'examen **Certified Ethical Hacker v13** (EC-Council **312-50v13**).

## Fonctionnalités

- **Base de questions** fusionnée depuis plusieurs sources CEH v13
- **Mode entraînement** : correction immédiate après chaque question
- **Mode examen blanc** : sans feedback, seuil de réussite à 70 %
- **Sessions configurables** : 10, 20, 50, 100, 125 (taille réelle de l'examen) ou nombre personnalisé
- Questions et réponses **mélangées** à chaque session

## Démarrage local

```bash
npm install
npm run dev
```

Ouvrir http://localhost:5173

## Déploiement GitHub Pages

1. Poussez ce dossier comme racine de votre dépôt GitHub (ex. `ceh-trainer`)
2. Dans **Settings → Pages**, source : **GitHub Actions**
3. Le workflow `.github/workflows/deploy.yml` déploie à chaque push sur `main`

L'URL sera : `https://<votre-username>.github.io/ceh-trainer/`

Déploiement manuel :

```bash
GITHUB_PAGES=true npm run build
npm run deploy
```

## Enrichir la base de questions

```bash
node scripts/parse-dumpsbase.mjs
node scripts/restore-examtopics-page1.mjs
node scripts/merge-questions.mjs
npm run build
```

## Structure du dépôt

```
ceh-trainer/              ← racine du repo GitHub
├── src/
│   ├── App.jsx           # application
│   └── data/
│       └── questions.json
├── data/                 # sources brutes (HTML, xlsx…)
├── scripts/              # parseurs & scrapers
├── .github/workflows/    # déploiement Pages
└── package.json
```

## Examen officiel CEH v13

- **Code** : 312-50v13
- **Questions** : 125 QCM
- **Durée** : 4 heures
- **Seuil** : ~70 %

## Avertissement

Ces questions proviennent de dumps communautaires à des fins de **révision personnelle**. Complétez avec les supports officiels EC-Council et la pratique en lab.
