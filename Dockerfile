FROM node:26-bookworm-slim@sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68
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
