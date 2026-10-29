# VAPE MARKET

## 1. Présentation du projet

VAPE MARKET est un projet de site e-commerce destiné au marché tunisien, consacré aux produits de l'univers de la vape, sous réserve de leur conformité à la réglementation applicable.

L'objectif est de développer une application web moderne, responsive, sécurisée et évolutive permettant de consulter un catalogue de produits, de gérer un panier, de passer des commandes et d'administrer la boutique.

Le projet sera développé progressivement, en respectant les bonnes pratiques d'ingénierie logicielle.

**État actuel :** initialisation de la structure du projet et préparation de la conception technique.

## 2. Objectifs

- Créer une interface utilisateur moderne et responsive.
- Développer un catalogue de produits administrable.
- Mettre en place une authentification sécurisée.
- Concevoir une base de données relationnelle.
- Développer une API backend structurée.
- Gérer les produits, les stocks, les paniers et les commandes.
- Créer un espace administrateur.
- Mettre en place des tests automatisés.
- Préparer le déploiement et le référencement SEO.
- Respecter les exigences légales applicables en Tunisie.

## 3. Technologies prévues

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Router
- Lucide React

### Backend
- Node.js
- Express.js
- API REST

### Base de données et authentification
- Supabase PostgreSQL
- Supabase Auth
- Row Level Security (RLS)

### Images
- Cloudinary

### Tests
- Postman
- Vitest
- React Testing Library
- Playwright

### Outils et déploiement
- Visual Studio Code
- Claude Code
- Git
- GitHub
- Vercel pour le frontend, sous réserve de validation de la configuration
- Hébergement Node.js pour le backend

Cette stack est prévisionnelle. Les choix définitifs seront confirmés pendant la conception technique.

## 4. Structure du projet

```text
VAPE-MARKET/
├── frontend/
├── backend/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── docs/
├── tests/
├── .gitignore
├── README.md
└── CLAUDE.md
```

### Description des dossiers

- `frontend/` : application React.
- `backend/` : serveur Express et logique métier.
- `supabase/migrations/` : migrations SQL versionnées.
- `supabase/seed.sql` : données fictives pour les tests.
- `docs/` : documentation fonctionnelle et technique.
- `tests/` : tests transversaux et tests de parcours.
- `README.md` : documentation principale.
- `CLAUDE.md` : instructions destinées à Claude Code.

## 5. Prérequis

Les outils suivants seront nécessaires :

- Node.js, dans une version LTS compatible avec les dépendances.
- npm.
- Git.
- Visual Studio Code.
- Un compte Supabase.
- Un compte Cloudinary lorsque la gestion des images sera mise en place.
- Claude Code pour l'assistance au développement.

Vérifier les installations avec :

```bash
node --version
npm --version
git --version
```

## 6. État du développement

Le développement suivra les étapes suivantes :

1. Initialisation du dépôt Git et de la structure.
2. Cahier des charges et conception technique.
3. Validation des rôles, permissions et règles métier.
4. Conception du modèle relationnel PostgreSQL.
5. Création et validation des migrations SQL.
6. Configuration du backend Express.
7. Configuration du frontend React.
8. Intégration de Supabase Auth.
9. Développement du catalogue et des images.
10. Développement du panier et des commandes.
11. Développement de l'espace administrateur.
12. Tests de sécurité et tests fonctionnels.
13. Déploiement en préproduction.
14. Vérification de la conformité et préparation de la mise en production.
15. Optimisation SEO et suivi après lancement.

Les fonctionnalités seront développées et validées progressivement.

## 7. Configuration et sécurité

Les secrets et les variables d'environnement doivent rester dans des fichiers locaux ignorés par Git.

Les fichiers `.env.example` pourront documenter les variables nécessaires, sans contenir de véritables clés.

Les clés secrètes Supabase et Cloudinary ne doivent jamais être exposées dans le frontend.

Les prix, les quantités, le stock, les rôles et les autorisations doivent être vérifiés côté serveur.

Les données des clients doivent être protégées par une authentification et des permissions adaptées.

## 8. Base de données

Les migrations SQL seront stockées dans :

```text
supabase/migrations/
```

Chaque migration devra être versionnée et documentée.

Les données de test seront définies dans `supabase/seed.sql`.

Aucune migration ne doit être exécutée sur une base contenant des données importantes sans vérification préalable et stratégie de sauvegarde.

## 9. Tests

Les tests couvriront notamment :

- Le fonctionnement des API.
- La validation des données.
- L'authentification et les autorisations.
- L'affichage du catalogue.
- Le calcul des prix.
- La gestion du stock.
- La création et le suivi des commandes.
- Les erreurs et les accès non autorisés.
- Les parcours utilisateur sur ordinateur et mobile.

## 10. Déploiement

Le déploiement sera préparé après validation de l'architecture, des tests, de la configuration de sécurité et des variables d'environnement.

La mise en production commerciale restera conditionnée à la vérification des obligations légales et réglementaires applicables aux produits vendus en Tunisie.

## 11. Licence

Projet privé. Aucune licence de distribution n'est définie pour le moment.