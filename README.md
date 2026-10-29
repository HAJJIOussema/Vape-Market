# VAPE MARKET

VAPE MARKET est un projet de site e-commerce destiné au marché tunisien,
consacré aux produits de l'univers de la vape, sous réserve de leur
conformité aux règles applicables.

Le projet est encore en phase d'initialisation. Les données utilisées pendant
le développement doivent rester fictives et aucune vente réelle ne doit être
activée avant la validation des obligations légales et réglementaires.

## Objectifs

- proposer un catalogue responsive et administrable ;
- gérer les comptes, le panier, les commandes et le stock ;
- protéger les données et les opérations sensibles ;
- préparer une architecture testable et évolutive.

## Stack prévue

- **Frontend :** React, Vite, Tailwind CSS, React Router et Lucide React ;
- **Backend :** Node.js, Express et API REST ;
- **Données et authentification :** Supabase PostgreSQL, Supabase Auth et RLS ;
- **Tests :** Vitest, React Testing Library, Playwright et Postman.

Ces choix restent prévisionnels et seront confirmés pendant la conception
technique.

## Structure

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

## Prérequis

- Node.js en version LTS ;
- npm ;
- Git ;
- un compte Supabase pour les futures intégrations.

Vérifier l'installation :

```bash
node --version
npm --version
git --version
```

## Démarrer le frontend

```bash
cd frontend
npm install
npm run dev
```

Commandes disponibles dans `frontend/` :

```bash
npm run lint
npm run build
npm run preview
```

## Configuration

Les secrets doivent rester dans des fichiers `.env` locaux ignorés par Git.
Utiliser des fichiers `.env.example` pour documenter les variables nécessaires,
sans y placer de valeur sensible. Les clés secrètes Supabase et Cloudinary ne
doivent jamais être exposées dans le frontend.

## Développement

Les migrations seront ajoutées dans `supabase/migrations/` après validation
du modèle relationnel, des contraintes et des politiques RLS. Le fichier
`supabase/seed.sql` est réservé aux données fictives, reproductibles et
compatibles avec ces migrations.

Avant chaque livraison, lancer le lint et le build du frontend. Les tests
d'authentification, d'autorisations, de validation, de stock et de commandes
devront couvrir les cas nominaux et les erreurs.

## Statut et conformité

Le dépôt contient actuellement la structure initiale du frontend. Les ventes
réelles, les paiements et le déploiement en production nécessitent une
validation explicite de la sécurité, de la configuration et des obligations
applicables en Tunisie.

Projet privé ; aucune licence de distribution n'est définie pour le moment.