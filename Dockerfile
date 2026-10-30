FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
RUN npm install
COPY . .
# Railway hands these to the build when they're declared; they stamp dist/build.json.
ARG RAILWAY_GIT_COMMIT_SHA
ARG RAILWAY_GIT_BRANCH
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
COPY logCore.mjs ./logCore.mjs
COPY radioBrowserApi.mjs ./radioBrowserApi.mjs
COPY server ./server
COPY scripts/discord-roles.mjs ./scripts/discord-roles.mjs
COPY src/rewards ./src/rewards
EXPOSE 3000
CMD ["node", "server.mjs"]
