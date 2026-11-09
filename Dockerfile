FROM node:22-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4174
WORKDIR /app
COPY --chown=node:node index.html 404.html favicon.svg social-preview.png robots.txt sitemap.xml ./
COPY --chown=node:node .well-known ./.well-known
COPY --chown=node:node scripts/build.mjs ./scripts/build.mjs
COPY --chown=node:node package.json server.mjs routing.mjs ./
RUN node scripts/build.mjs
USER node
EXPOSE 4174
CMD ["node", "server.mjs"]
