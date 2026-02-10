FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 10000
CMD ["npm", "run", "start"]
