FROM node:20-alpine AS base
WORKDIR /app

COPY package.json tsconfig.json ./
COPY prisma ./prisma
RUN npm install --production=false

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
