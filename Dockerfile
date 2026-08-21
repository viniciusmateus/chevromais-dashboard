FROM node:22-slim

# Instala o LibreOffice e bibliotecas de suporte a texto/PDF
RUN apt-get update && apt-get install -y \
    libreoffice-writer \
    fonts-dejavu \
    fonts-liberation \
    libfontconfig1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV HOST=0.0.0.0
ENV PORT=8080
ENV SOFFICE_PATH=/usr/bin/soffice

EXPOSE 8080

CMD ["node", "./dist/server/entry.mjs"]