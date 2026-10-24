# The vault in one small image: Node, ffmpeg (SVT-AV1 + Opus), curl and par2.
FROM node:22-alpine
RUN apk add --no-cache ffmpeg curl par2cmdline
WORKDIR /vault
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV VAULT_DIR=/vault/data
EXPOSE 8088
CMD ["node", "vault.mjs", "serve"]
