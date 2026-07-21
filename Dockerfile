FROM node:22.19-slim AS build

WORKDIR /app/railway

COPY railway/package.json ./
RUN npm install

COPY railway/ ./
RUN npm run build

FROM node:22.19-slim AS runner

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app/railway

COPY railway/package.json ./
RUN npm install --omit=dev

COPY --from=build /app/railway/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
