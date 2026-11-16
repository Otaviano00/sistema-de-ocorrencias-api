# Guia Consolidado de Infraestrutura e Deploy: API NestJS + Prisma 7 no Heroku

Este documento resume toda a arquitetura, os comandos de CLI e as configurações realizadas para hospedar a API (`otav-api-tp2`) no **Heroku** utilizando **Docker**, **PostgreSQL**, **GitHub Actions (CD)** e domínio próprio (`api.otav.com.br`) via **Cloudflare**.

## 0. Instalação da CLI e Login no Heroku

Antes de criar os recursos, instale a interface de linha de comando (CLI) do Heroku na sua máquina e realize a autenticação da sua conta (e do Docker local no registry do Heroku).

```bash
# Instala a CLI do Heroku (Ubuntu/Debian via Snap)
sudo snap install heroku --classic

# Abre o navegador para autenticar sua conta Heroku no terminal
heroku login

# Autentica o Docker local no Container Registry do Heroku
heroku container:login
```

## 1. Criação do App, Stack Docker e Banco de Dados

Por padrão, o Heroku utiliza a stack `heroku-24` (baseada em *buildpacks* via Git). Para utilizar imagens Docker personalizadas, alteramos a stack para `container` e provisionamos o PostgreSQL como um *add-on* gerenciado.

```bash
# Cria o aplicativo na plataforma Heroku
heroku create otav-api-tp2

# Altera a stack para aceitar imagens Docker em vez de código-fonte via Git
heroku stack:set container -a otav-api-tp2

# Provisiona o banco PostgreSQL e injeta automaticamente a variável DATABASE_URL
heroku addons:create heroku-postgresql:essential-0 -a otav-api-tp2
```

## 2. Sincronização de Variáveis de Ambiente (`.env`)

Arquivos `.env` nunca são enviados dentro da imagem Docker. Em vez disso, as variáveis são injetadas diretamente na memória do container (*Config Vars*). Para sincronizar em lote sem sobrescrever a `DATABASE_URL` gerenciada pelo Heroku:

```bash
# Envia todas as variáveis do .env.production em lote, ignorando comentários, linhas vazias e DATABASE_URL
grep -vE '^(#|$|DATABASE_URL=)' .env.production | xargs heroku config:set -a otav-api-tp2

# Retorna exclusivamente a string de conexão do PostgreSQL gerada pelo Heroku
heroku config:get DATABASE_URL -a otav-api-tp2

# Lista todas as variáveis ativas no container de produção para conferência
heroku config -a otav-api-tp2

# (Opcional) Baixa todas as variáveis atuais do Heroku para um arquivo local
heroku config -s -a otav-api-tp2 > .env.heroku
```

## 3. Containerização (Dockerfile Multi-Stage para NestJS + Prisma 7)

### Regras Críticas do Heroku & Prisma 7:

1. **Porta Dinâmica:** O Heroku ignora `EXPOSE` fixo e injeta uma porta aleatória na variável `process.env.PORT`. No `src/main.ts`, a aplicação deve escutar em:
   ```typescript
   await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
   ```
2. **OpenSSL:** Imagens `bookworm-slim` não incluem `openssl` por padrão, exigido pelo *Query Engine* do Prisma para conexões SSL com o banco.
3. **Artefatos do Prisma 7:** Como o `output` do Prisma 7 está em `src/generated`, essa pasta (junto com `prisma/` e `prisma7.config.ts`) deve ser copiada explicitamente do estágio `build` para o `runtime`.

### `Dockerfile` Final Otimizado:

```dockerfile
FROM node:24.22.3-bookworm-slim AS build
WORKDIR /app
COPY package*.json .npmrc* ./
RUN npm ci
COPY . .
RUN npx prisma generate --config prisma7.config.ts
RUN npm run build
RUN npm prune --omit=dev

FROM node:24.22.3-bookworm-slim AS runtime
WORKDIR /app

# Instala o OpenSSL exigido pelo Prisma Engine para conectar no Postgres do Heroku
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma7.config.ts ./prisma7.config.ts

ENV NODE_ENV=production
USER node

CMD ["node", "dist/main.js"]
```

### Comandos de Deploy Manual (via CLI local):

```bash
# Faz o build local e envia a imagem para o registry do Heroku (requer heroku container:login feito na Etapa 0)
heroku container:push web -a otav-api-tp2

# Ativa a imagem enviada colocando o container no ar
heroku container:release web -a otav-api-tp2
```

## 4. Automação de CD via GitHub Actions com Environments

Para acelerar o deploy com cache de camadas Docker (`type=gha`) e isolar credenciais por ambiente:

### 4.1. Gerar Token de Autorização no Heroku

```bash
heroku authorizations:create -d "GitHub Actions CD"
```

### 4.2. Configurar o Environment no GitHub

Acesse **Settings → Environments → New environment** (`PRD`) e cadastre:
* **Environment Secret:** `HEROKU_API_KEY` (token gerado no passo anterior).
* **Environment Variable:** `HEROKU_APP_NAME` (`otav-api-tp2`).

### 4.3. Workflow (`.github/workflows/deploy-heroku.yml`)

```yaml
name: Deploy API to Heroku

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: PRD
      url: https://api.otav.com.br

    env:
      HEROKU_APP_NAME: ${{ vars.HEROKU_APP_NAME }}
      IMAGE_TAG: registry.heroku.com/${{ vars.HEROKU_APP_NAME }}/web

    steps:
      - name: Code checkout
        uses: actions/checkout@v4

      - name: Configure Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Heroku Container Registry
        uses: docker/login-action@v3
        with:
          registry: registry.heroku.com
          username: _
          password: ${{ secrets.HEROKU_API_KEY }}

      - name: Build & Push with Cache
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ env.IMAGE_TAG }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Release new version on Heroku
        run: |
          IMAGE_ID=$(docker buildx imagetools inspect ${{ env.IMAGE_TAG }} --format '{{json .Manifest}}' | jq -r '.config.digest')
          curl -n -X PATCH https://api.heroku.com/apps/${{ env.HEROKU_APP_NAME }}/formation \
            -d "{
              \"updates\": [
                {
                  \"type\": \"web\",
                  \"docker_image\": \"$IMAGE_ID\"
                }
              ]
            }" \
            -H "Content-Type: application/json" \
            -H "Accept: application/vnd.heroku+json; version=3.docker-releases" \
            -H "Authorization: Bearer ${{ secrets.HEROKU_API_KEY }}"

```

`

## 5. Domínio Customizado (`api.otav.com.br`), SSL e Proxy no Cloudflare

### 5.1. Comandos no Heroku

```bash
# Registra o domínio customizado e exibe o DNS Target (*.herokudns.com)
heroku domains:add api.otav.com.br -a otav-api-tp2

# Ativa o gerenciamento automático de certificado SSL (ACM / Let's Encrypt)
heroku certs:auto:enable -a otav-api-tp2

# Verifica o status da emissão do certificado (deve retornar "Cert issued")
heroku certs:auto -a otav-api-tp2
```

### 5.2. Configuração Inicial no Painel do Cloudflare (`DNS → Records`)

* **Type:** `CNAME`
* **Name:** `api`
* **Target:** `<identificador-unico>.herokudns.com` (copiado da saída de `heroku domains`)
* **Proxy status:** **DNS Only (Nuvem Cinza)** — obrigatório inicialmente para evitar conflito de *SSL Handshake* (Erro 525) enquanto o Heroku valida e emite o certificado dele.

### 5.3. Ativação do Proxy do Cloudflare e Proteção contra Bots (Pós-Emissão do Certificado)

Depois que o certificado no Heroku estiver ativo (`Cert issued`), é recomendado ativar a proteção na borda do Cloudflare para filtrar *crawlers* e *scanners* automatizados (que geram requisições `404` nos logs) antes que cheguem ao container:

1. No painel do Cloudflare (`otav.com.br`), acesse **SSL/TLS → Overview** e altere o modo de criptografia para **Full (strict)** *(nunca deixe em "Flexible", pois causa loop de redirecionamento)*.
2. Volte em **DNS → Records**, edite o registro `CNAME` `api` e ative a **Nuvem Laranja (Proxied)**.
3. *(Opcional)* Acesse **Security → Bots** e ative o **Bot Fight Mode** para bloquear varreduras automatizadas na borda.

> **Nota:** Caso precise renovar ou gerar um novo certificado no Heroku no futuro, basta voltar temporariamente para a nuvem cinza (**DNS Only**) durante a validação.

## 6. Comandos Úteis de Operação e Debug

| Comando | Descrição |
| :--- | :--- |
| `heroku config:get DATABASE_URL -a otav-api-tp2` | Retorna exclusivamente a URL de conexão do banco PostgreSQL de produção. |
| `heroku logs --tail -a otav-api-tp2` | Acompanha os logs da aplicação e do roteador HTTP em tempo real. |
| `heroku run npx prisma migrate deploy --config prisma7.config.ts -a otav-api-tp2` | Executa as migrations pendentes do Prisma no banco PostgreSQL de produção. |
| `heroku ps:restart -a otav-api-tp2` | Reinicia o container da API sem necessidade de novo build. |
| `nslookup api.otav.com.br` | Valida se a propagação DNS está apontando corretamente para o Heroku. |
