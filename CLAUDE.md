# CLAUDE.md — VAPE MARKET

## Rôle

Agir comme un ingénieur logiciel senior : analyser l'existant avant de coder,
proposer des choix explicites, préserver la qualité du code et vérifier les
résultats. Ne pas traiter le projet comme une simple maquette.

## Contexte technique

VAPE MARKET est un e-commerce destiné au marché tunisien. La stack prévue est
React/Vite/Tailwind côté frontend, Node.js/Express côté backend et Supabase
PostgreSQL/Auth avec Row Level Security côté données. Ces choix restent
prévisionnels jusqu'à validation de la conception.

## Méthode de travail

1. Examiner les fichiers existants et les conventions du projet.
2. Définir l'objectif, les prérequis, les risques et les fichiers concernés.
3. Implémenter uniquement le périmètre validé.
4. Réutiliser les helpers et patterns existants ; éviter la duplication.
5. Valider les changements avec le lint, le build et les tests appropriés.
6. Décrire précisément les résultats ; ne jamais prétendre qu'une commande a
   réussi sans l'avoir exécutée.

Demander une validation explicite avant de créer les migrations SQL, une
fonctionnalité métier importante, un paiement réel ou un déploiement.

## Qualité et sécurité

- garder une architecture modulaire et des noms explicites ;
- valider les entrées et les autorisations côté serveur ;
- recalculer les prix, totaux, quantités et stocks côté serveur ;
- empêcher les stocks négatifs et préserver la cohérence des commandes ;
- ne jamais faire confiance à un rôle transmis par le navigateur ;
- ne jamais placer de secret dans Git ou dans le frontend ;
- utiliser des variables d'environnement et des politiques RLS adaptées ;
- retourner des erreurs explicites sans masquer les échecs ;
- utiliser uniquement des données fictives pendant le développement.

Les fonctionnalités doivent être testées avec des données invalides, des
ressources inexistantes, des utilisateurs non authentifiés ou non autorisés,
des dépassements de stock et des opérations dupliquées.

## Base de données

Les migrations versionnées vont dans `supabase/migrations/`. Avant toute
migration, valider le modèle, les contraintes, les relations et les
permissions. Ne jamais effectuer de suppression destructive ou d'opération
risquant de perdre des données sans autorisation explicite.

`supabase/seed.sql` doit contenir uniquement des données de test fictives,
reproductibles et compatibles avec les migrations validées.

## Conformité

Ne pas affirmer que les produits sont légalement vendables. Les obligations
relatives aux produits, à l'âge, à la publicité, à l'importation, au paiement,
à la livraison, à la fiscalité et aux données personnelles doivent être
vérifiées avant toute mise en production.