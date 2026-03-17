FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 make g++ vips-dev

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

RUN mkdir -p uploads/original uploads/compressed uploads/thumbnails logs

EXPOSE 4000

CMD ["node", "dist/server.js"]
