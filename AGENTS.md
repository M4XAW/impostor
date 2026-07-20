<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Projet

Ce projet est un jeu web multijoueur de déduction sociale inspiré du concept de "L'Imposteur", développé avec une architecture moderne full-stack.

L'objectif est de construire une application robuste, maintenable et évolutive en suivant les meilleures pratiques de l'écosystème React et Next.js.

Le code doit toujours privilégier la lisibilité, la simplicité et la maintenabilité plutôt que les solutions complexes.

---

# Stack technique

Toujours utiliser les dernières versions stables.

- Next.js 16.2.10 ou latest (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS
- shadcn/ui
- Prisma ORM
- PostgreSQL
- Socket.IO (ou WebSocket si plus pertinent)
- Docker
- Docker Compose

Ne jamais utiliser le Pages Router.

Toujours utiliser l'App Router.

---

# Philosophie

Chaque fonctionnalité doit être :

- simple
- modulaire
- réutilisable
- facilement testable
- facilement extensible

Éviter les gros composants.

Favoriser une architecture composée de petits composants spécialisés.

---

# Architecture

Toujours respecter une architecture claire.

Exemple :

app/
components/
features/
hooks/
lib/
providers/
services/
types/
utils/
prisma/
public/

Ne jamais mélanger la logique métier avec les composants d'affichage.

---

# TypeScript

Toujours utiliser TypeScript strict.

Ne jamais utiliser :

- any
- @ts-ignore
- assertions inutiles

Toujours préférer :

- interfaces
- types explicites
- génériques lorsque pertinent

Le code doit compiler sans erreur TypeScript.

---

# React

Privilégier :

- Server Components par défaut
- Client Components uniquement lorsque nécessaire

Utiliser "use client" uniquement si :

- useState
- useEffect
- événements utilisateur
- hooks navigateur

Limiter au maximum le JavaScript envoyé au client.

---

# Next.js

Toujours utiliser :

- App Router
- Server Components
- Route Handlers
- Server Actions lorsque pertinent
- layouts
- loading.tsx
- error.tsx
- not-found.tsx

Ne jamais utiliser les anciennes API du Pages Router.

---

# UI

Utiliser :

- Tailwind CSS
- shadcn/ui

Éviter les styles inline.

Utiliser les composants shadcn dès qu'ils répondent au besoin.

Créer des composants UI réutilisables.

Dark mode

Toujours privilégier :

- accessibilité
- responsive

---

# Accessibilité

Toujours respecter :

- labels
- aria attributes
- navigation clavier
- contrastes suffisants

---

# État de l'application

Utiliser :

- React Context uniquement pour l'état global léger
- Server Components lorsque possible

Ne pas introduire Redux ou Zustand sans justification.

---

# Base de données

Utiliser :

- Prisma

Convention :

- modèles clairs
- relations explicites
- migrations versionnées

Ne jamais écrire de SQL brut lorsqu'une solution Prisma existe.

---

# API

Utiliser :

- Route Handlers

Validation obligatoire des entrées.

Ne jamais faire confiance aux données du client.

---

# Jeu

Le serveur est toujours la source de vérité.

Le client ne décide jamais :

- du rôle
- du mot
- du résultat
- des votes
- des scores

Toute la logique métier est exécutée côté serveur.

---

# Temps réel

Utiliser Socket.IO (ou WebSocket si plus pertinent).

Toutes les actions critiques passent par le serveur.

Ne jamais faire confiance aux événements envoyés par le client.

---

# Sécurité

Toujours :

- valider les entrées
- nettoyer les données
- protéger les routes sensibles
- utiliser les variables d'environnement
- ne jamais exposer les secrets

Préparer le projet pour une authentification future.

---

# Docker

Le projet doit fonctionner entièrement via Docker.

Prévoir :

- application
- PostgreSQL

Le développement doit être reproductible avec Docker Compose.

---

# Qualité du code

Toujours écrire un code :

- lisible
- documenté lorsque nécessaire
- cohérent
- factorisé

Éviter :

- duplication
- fonctions trop longues
- composants dépassant plusieurs centaines de lignes

---

# Nommage

Utiliser des noms explicites.

Exemple :

createRoom()

plutôt que

create()

Les composants doivent avoir un seul rôle.

---

# Commentaires

Éviter les commentaires inutiles.

Le code doit être auto-explicatif.

Commenter uniquement :

- logique complexe
- algorithmes
- règles métier

---

# Dépendances

Ne jamais ajouter une dépendance sans réelle nécessité.

Toujours privilégier les fonctionnalités natives de Next.js et React.

---

# Git

Produire des commits atomiques.

Une fonctionnalité = un commit.

---

# IA

Avant d'implémenter une fonctionnalité :

1. Expliquer brièvement l'approche.
2. Identifier les impacts sur l'architecture.
3. Réutiliser l'existant avant de créer du nouveau.
4. Respecter les conventions du projet.

Lorsqu'une fonctionnalité est importante, procéder par petites étapes plutôt que de générer une grande quantité de code d'un seul coup.

Si plusieurs solutions existent, choisir la plus idiomatique pour Next.js.

Ne jamais utiliser une approche obsolète lorsqu'une API moderne existe.

---

# Objectif

Construire une application :

- moderne
- performante
- sécurisée
- maintenable
- évolutive

Le résultat doit respecter les standards d'un projet professionnel de production.