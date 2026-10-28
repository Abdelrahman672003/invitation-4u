# Three images from one build: `api` (Express + Prisma), `web` (static files behind nginx) and `backup`.

FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
# DATABASE_URL is only needed so `prisma generate` can read the schema; no database is touched.
RUN DATABASE_URL=mysql://build:build@localhost:3306/build npx prisma generate && npm run build

FROM node:22-slim AS api
ENV NODE_ENV=production API_PORT=4000
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
# Uploaded files go here (a volume); it is created from this directory, so it must belong to the API's user.
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrations are applied on start; they are additive and safe to re-run.
CMD ["sh", "-c", "npx prisma migrate deploy && node apps/api/dist/index.js"]

FROM nginx:1.27-alpine AS web
COPY deploy/nginx-container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

# Daily dump of the database and archive of the uploads; see deploy/backup.sh. It is the MySQL image
# so that `mysqldump` and `mysql` are exactly the version that matches the server.
FROM mysql:8.4 AS backup
USER root
RUN microdnf install -y gzip tar findutils && microdnf clean all
COPY deploy/backup.sh /backup.sh
# Strip Windows line endings so the script runs whatever machine the repository was checked out on.
RUN sed -i 's/\r$//' /backup.sh && chmod +x /backup.sh
ENTRYPOINT ["/backup.sh"]
