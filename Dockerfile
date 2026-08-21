# 1. Altere a imagem base para Node 22
FROM node:22-slim

# 2. Instala o LibreOffice e fontes essenciais no contêiner Linux
RUN apt-get update && apt-get install -y \
    libreoffice \
    fonts-dejavu \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copia e instala as dependências
COPY package*.json ./
RUN npm ci

# 4. Copia o código-fonte e gera o build do Astro
COPY . .
RUN npm run build

# 5. Configurações de porta do Firebase App Hosting
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

# 6. Inicializa o servidor Node do Astro
CMD ["node", "./dist/server/entry.mjs"]