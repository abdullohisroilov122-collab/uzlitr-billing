# Small UDP listener for the modems (see receiver.js).
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY receiver.js ./
USER node
CMD ["node", "receiver.js"]
