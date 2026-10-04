FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
EXPOSE 3000
CMD ["node", "server.mjs"]
