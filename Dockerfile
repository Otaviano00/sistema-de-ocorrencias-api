FROM node:24.22.3-bookworm-slim AS build
WORKDIR /app
COPY package*.json .npmrc* ./
RUN npm ci
COPY . .
RUN npx prisma generate --config prisma7.config.ts
RUN npm run build
# Remove devDependencies do node_modules existente em vez de baixar tudo de novo no runtime
RUN npm prune --omit=dev

FROM node:24.22.3-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma7.config.ts ./prisma7.config.ts

ENV NODE_ENV=production
USER node

CMD ["node", "dist/main.js"]