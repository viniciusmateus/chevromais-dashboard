FROM node:22-slim

# Instala LibreOffice, Java Runtime e Fontes essenciais
RUN apt-get update && apt-get install -y \
    libreoffice \
    default-jre \
    fonts-liberation \
    fontconfig \
    && rm -rf /var/lib/apt-get/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["node", "./dist/server/entry.mjs"]