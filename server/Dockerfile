##########################
# 🔨 Build stage
##########################
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY migrations ./migrations
COPY src ./src

RUN npm ci
RUN npm run build:prod && \
    [ -f dist/index.js ] || (echo "❌ index.js missing" && exit 1)

##########################
# 🚀 Production stage
##########################
FROM node:20-alpine

RUN apk add --no-cache postgresql-client

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/drizzle.config.ts ./

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s CMD wget --spider -q http://localhost:4000/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
