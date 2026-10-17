
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY prisma7.config.ts ./

# Prisma Client generation does not connect to the database.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/varianta"

RUN npx prisma generate --config prisma7.config.ts

COPY src ./src
COPY openapi.yaml ./openapi.yaml

RUN npm prune --omit=dev


FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma7.config.ts ./prisma7.config.ts
COPY --from=build --chown=node:node /app/openapi.yaml ./openapi.yaml

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
