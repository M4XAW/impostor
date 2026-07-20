# Impostor

Tout le monde reçoit un mot, mais l'imposteur reçoit un mot légèrement différent sans savoir qu'il est l'imposteur. Chacun à votre tour, écrivez un indice encore jamais proposé pendant la manche pour prouver que vous n'êtes pas l'imposteur. L'imposteur gagne s'il n'est pas le plus voté à la fin, sinon les autres joueurs gagnent.

## Prérequis

- Node.js 22 ou une version plus récente
- pnpm 10 (`corepack enable` permet de l’activer avec Node.js)
- Docker Desktop et Docker Compose pour le démarrage le plus simple

## Démarrage avec Docker

C’est la méthode recommandée : elle démarre l’application et PostgreSQL, applique les migrations, puis rend le jeu disponible sur [http://localhost:3000](http://localhost:3000).

```bash
docker compose up --build -d
```

Pour arrêter les services :

```bash
docker compose down
```

Pour supprimer aussi les données locales PostgreSQL :

```bash
docker compose down --volumes
```

## Développement local

### 1. Installer les dépendances

```bash
corepack enable
pnpm install
```

Si pnpm vous demande d’autoriser les scripts de Prisma, sélectionnez Prisma et ses moteurs avec :

```bash
pnpm approve-builds
```

### 2. Démarrer PostgreSQL

Vous pouvez utiliser uniquement le service de base de données fourni :

```bash
docker compose up -d db
```

### 3. Configurer l’environnement

Copiez le fichier d’exemple :

```bash
cp .env.example .env
```

Sous PowerShell :

```powershell
Copy-Item .env.example .env
```

La valeur par défaut de `DATABASE_URL` cible la base PostgreSQL exposée sur `localhost:5433`.
Le port PostgreSQL est lié uniquement à l’interface locale. En production, remplacez
`POSTGRES_PASSWORD`, configurez l’origine HTTPS exacte dans `APP_ORIGIN` et activez
`TRUST_PROXY` uniquement derrière un reverse proxy maîtrisé.

### 4. Générer Prisma et appliquer les migrations

```bash
pnpm prisma generate
pnpm prisma migrate deploy
```

### 5. Lancer le serveur de développement

```bash
pnpm dev
```

Le serveur personnalisé démarre Next.js et Socket.IO sur [http://localhost:3000](http://localhost:3000).

## Jouer une partie

1. Créez une partie et choisissez un pseudo.
2. Depuis le salon, copiez le lien d’invitation, par exemple `/?join=eUR-C7CDN`.
3. Les autres joueurs rejoignent la partie avec ce lien et leur pseudo.
4. À partir de trois joueurs, l’hôte lance la manche.
5. Les civils et l’imposteur reçoivent chacun leur mot, puis l’hôte ouvre le vote après les échanges d’indices.

## Commandes utiles

```bash
# Vérifier le style et les règles du projet
pnpm lint

# Construire l’application de production
pnpm build

# Générer le client Prisma après une modification de schéma
pnpm prisma generate

# Créer une nouvelle migration lors d’une évolution du schéma
pnpm prisma migrate dev --name description_du_changement
```

### Prisma Studio

Pour visualiser et modifier les données de jeu, démarrez PostgreSQL puis Prisma Studio :

```bash
docker compose up -d db
pnpm db:studio
```

Ouvrez ensuite [http://localhost:5555](http://localhost:5555).

## Architecture

- `app/` : pages App Router et routes API
- `components/` : composants d’interface
- `lib/game.ts` : règles du jeu exécutées sur le serveur
- `lib/session.ts` : session serveur par token aléatoire, distincte des identifiants publics
- `prisma/` : schéma PostgreSQL et migrations
- `server.ts` : serveur Next.js + Socket.IO

Les rôles, le mot secret, les votes et le résultat sont déterminés côté serveur. Le client ne reçoit que les informations qui le concernent.
Les identifiants Prisma des joueurs restent côté serveur ; le navigateur reçoit uniquement
des identifiants publics propres au salon. Une migration de sécurité invalide les cookies
des parties créées avant son déploiement.
