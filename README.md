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
- **Backend :** aucun serveur à déployer. Le frontend appelle Supabase
  directement (`supabase-js`) ; les règles métier (prix, stock, commandes,
  rôles) sont appliquées dans PostgreSQL par les politiques RLS et des
  fonctions `SECURITY DEFINER` (`checkout`, `confirm_order`, …). L'ancienne
  API Express a été supprimée (elle reste dans l'historique Git et sur la
  branche `old-main`) ;
- **Données et authentification :** Supabase PostgreSQL, Supabase Auth et RLS ;
- **Hébergement :** Vercel (site statique) ;
- **Tests :** Vitest, React Testing Library, Playwright et Postman.

Ces choix restent prévisionnels et seront confirmés pendant la conception
technique.

## Structure

```text
VAPE-MARKET/
├── frontend/          # application déployée (Vercel)
├── supabase/
│   ├── migrations/
│   ├── tests/
│   └── seed.sql
├── scripts/           # outils locaux (données de démonstration)
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

## Déploiement (Supabase + Vercel)

1. **Base de données** — appliquer les migrations sur le projet Supabase
   (après les avoir relues) :

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

   Tester ensuite les fonctions de commande sur une base de test :
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/guest_checkout_orders.sql`
   (tout est annulé par un `rollback`).
2. **Vercel** — importer le dépôt, choisir **Root Directory : `frontend`**
   (Vite est détecté ; `frontend/vercel.json` gère les routes de la SPA), puis
   définir les variables d'environnement :
   - `VITE_SUPABASE_URL` — URL du projet ;
   - `VITE_SUPABASE_ANON_KEY` — clé *anon / publishable* (publique) ;
   - `VITE_STORAGE_BUCKET` — `product-images` par défaut.

   Ne jamais mettre la clé `service_role` dans Vercel : tout ce qui commence
   par `VITE_` est visible dans le navigateur.
3. **Supabase Auth** — dans *Authentication > URL Configuration*, mettre l'URL
   Vercel comme *Site URL* et l'ajouter aux *Redirect URLs* (confirmation
   d'e-mail).
4. **Administrateurs** — promouvoir un compte depuis l'éditeur SQL Supabase :
   `update public.profiles set role = 'super_admin' where id = '<uuid>';`
   (depuis le site, seul un `super_admin` peut changer un rôle).

Commandes invitées : `public.checkout` accepte les visiteurs non connectés,
limite à 3 commandes par heure et par téléphone/e-mail, et renvoie un code de
suivi affiché une seule fois (page `/suivi-commande`).

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