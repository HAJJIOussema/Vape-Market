# VAPE MARKET API

Architecture Express initiale du backend VAPE MARKET. La logique métier n'est
pas encore implémentée.

## Installation

```bash
npm install
```

Copier `.env.example` vers `.env`, puis renseigner `SUPABASE_URL`,
`SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`. Le client système utilise
la clé service ; les requêtes authentifiées utilisent la clé anon avec le JWT
de l'utilisateur afin de préserver `auth.uid()` et les policies RLS.
Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` au frontend ni la versionner.

## Développement

```bash
npm run dev
```

## Démarrage

```bash
npm start
```

## Structure

```text
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── validators/
│   ├── app.js
│   └── server.js
├── tests/
├── .env.example
├── package.json
└── README.md
```

## Route de santé

`GET /health` retourne :

```json
{
  "status": "ok",
  "service": "vape-market-api"
}
```
