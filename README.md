# Sistema de Registro e Acompanhamento de Ocorrências

Projeto prático desenvolvido para a disciplina de **Técnicas de Programação 2 (2/2026)** do Departamento de Ciência da Computação da Universidade de Brasília (UnB)

---

## Sobre

O sistema tem como objetivo permitir que usuários registrem problemas urbanos ou eventos específicos através de localização geográfica (GPS), com suporte a aplicativo ou site compatível com dispositivos móveis.

### Principais Funcionalidades
- **Registro Georreferenciado:** Criação de ocorrências a partir de categorias predefinidas, incluindo detalhes textuais, data, hora e coordenadas de GPS.
- **Mapa Interativo:** Visualização em mapa das ocorrências ativas com filtros por data, tipo e região.
- **Acompanhamento e Notificações:** Mecanismo para seguir ocorrências específicas ou assinar alertas de novos registros por área geográfica.
- **Estatísticas Regionais:** Análise da evolução temporal e da densidade de problemas por região.
- **Módulo de Administração:** Gerenciamento de tipos de ocorrências e locais permitidos, com geração de relatórios de métricas de uso e pesquisas.

---

## Definição de tecnologias e Ferramentas

O desenvolvimento adota metodologias ágeis (**Scrum**, **Kanban** e **XP**), além de desenvolvimento orientado a testes (**TDD**).

* **Linguagem Principal:** `TypeScript` (NestJS + Prisma + PostgreSQL)
* **Guia de Estilo:** [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), via [`gts`](https://github.com/google/gts)
* **Linter / Verificador de Estilo:** `ESLint` + `Prettier`
* **Framework de Testes:** `Vitest`
* **Cobertura de Código (meta ≥ 80%):** `@vitest/coverage-v8` (relatório `coverage/lcov.info`)
* **Gerador de Documentação:**
* **Gestão e Controle de Versão:** `Git` e `Github`
* **Apoio de IAs e Ferramentas Auxiliares:** `Gemini`

## Ambiente de desenvolvimento e fluxo de qualidade (DX)

Todo o ambiente (banco, API e front-end) roda em **Docker** e é controlado por comandos `make`. Você **não precisa** instalar Node.js nem PostgreSQL na sua máquina.

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) com o Docker Compose v2 (comando `docker compose`)
- `make`
- Os dois repositórios clonados **lado a lado**, na mesma pasta:

```text
sistema-de-ocorrencias/
├── sistema-de-ocorrencias-api/   ← este repositório (docker-compose.yml e Makefile principal)
└── sistema-de-ocorrencias-web/   ← front-end Angular
```

O arquivo `.env` é **opcional**: todas as variáveis têm valor padrão. Para trocar portas ou credenciais, copie o exemplo e edite:

```bash
cp .env.example .env
```

### Subir, parar, resetar e popular o banco

Rode na pasta deste repositório (o Makefile do front-end aceita os mesmos comandos):

| Comando      | O que faz |
| ------------ | --------- |
| `make up`    | Sobe banco, API e front-end em segundo plano (faz o build quando precisa). Aplica as migrations e a seed automaticamente e só termina quando a API está respondendo. |
| `make logs`  | Mostra os logs da API e do front-end em tempo real (`Ctrl+C` para sair). |
| `make down`  | Para e remove os containers. **Os dados do banco são mantidos.** |
| `make reset` | Apaga containers **e o banco**, e recria tudo do zero (migrations + seed). |
| `make seed`  | Roda a seed manualmente. Não duplica dados: se o banco já tem dados, ela é ignorada. Use `make seed FORCE=1` para apagar e recriar os dados de exemplo. |
| `make help`  | Lista todos os comandos disponíveis. |

Depois do `make up`:

| Serviço    | Endereço |
| ---------- | -------- |
| Front-end  | <http://localhost:4200> |
| API        | <http://localhost:3000> |
| PostgreSQL | `localhost:5432` (usuário `postgres`, senha `postgres`, banco `ocorrencias`) |

**Hot-reload:** salve qualquer arquivo em `src/` e a API reinicia sozinha (o mesmo vale para o front-end).

**O que acontece quando a API inicia** (script `docker/entrypoint.dev.sh`):

1. Gera o Prisma Client (`prisma generate`).
2. Aplica as migrations pendentes (`prisma migrate deploy`).
3. Roda a seed idempotente (`prisma/seed.ts`), que só insere dados se o banco estiver vazio.
4. Inicia a API em modo watch (`npm run start:dev`).

**Criar uma nova migration** depois de alterar o `prisma/schema.prisma` (com o ambiente no ar):

```bash
docker compose exec api npx prisma migrate dev --config prisma7.config.ts --name descricao_da_mudanca
```

### Instalar pacotes com segurança

Use o `make install`, que roda o `npm install` **dentro do container**, com a versão certa do Node:

```bash
make install PKG="zod"                # dependência normal
make install PKG="@types/lodash" DEV=1  # devDependency
make install PKG="pacote-a pacote-b"  # vários de uma vez
```

O `package.json` e o `package-lock.json` são atualizados na sua máquina. Faça commit dos dois.

> Quando alguém do time adicionar dependências (você vê `package.json` alterado após um `git pull`), rode `make up` de novo: a imagem é reconstruída com os pacotes novos.

### Fluxo de TDD: Red → Green → Refactor

1. **Red:** rode `make tdd` e escreva um teste que falha. O Vitest fica em modo watch e roda os testes de novo a cada arquivo salvo (sem cobertura, para ser o mais rápido possível).
2. **Green:** escreva o código mínimo para o teste passar e veja ele ficar verde no terminal do `make tdd`.
3. **Refactor:** com os testes verdes, melhore o código e rode `make refactor`, que executa em sequência:
   1. **Prettier**: formata o código no padrão Google.
   2. **ESLint** com `--fix`: corrige o que dá automaticamente e falha se sobrar algum erro.
   3. **Vitest com cobertura**: roda todos os testes e gera `coverage/lcov.info` (abra `coverage/lcov-report/index.html` no navegador para ver o relatório).

   Se uma etapa falhar, as seguintes não rodam. Corrija e rode de novo.

`make tdd` e `make refactor` usam o container da API se ele estiver no ar. Se o ambiente estiver parado, eles criam um container temporário, sem banco (os testes unitários usam mocks).

### Integração contínua (GitHub Actions)

O workflow `.github/workflows/ci.yml` roda a cada push na `main` ou na `dev` e em todo pull request para a `main` ou a `dev`. Se você enviar um novo commit, a execução anterior do mesmo PR é cancelada. O CI **só verifica**: ele não formata nem corrige nada. Por isso, rode `make refactor` antes de abrir o PR.

Ele usa o Node da versão em `.nvmrc` e um PostgreSQL 16 de teste, e confere, nesta ordem:

1. `npm ci`: instala as dependências exatamente como estão no `package-lock.json`.
2. **Prettier** (`--check`): falha se algum arquivo não estiver formatado.
3. **ESLint**: falha com qualquer erro **ou aviso** das regras do Google.
4. **Build** (`npm run build`): falha se houver erro de tipo no TypeScript.
5. **Migrations e seed**: aplica as migrations no banco de teste e roda a seed duas vezes, para garantir que ela não duplica dados.
6. **Testes unitários com cobertura** (`coverage/lcov.info`, que fica disponível como artefato `coverage` na página da execução).
7. **Testes de integração** (`npm run test:e2e`), que sobem a API conectada ao banco.

### Onde fica cada configuração

| Ferramenta | Arquivo | Observação |
| ---------- | ------- | ---------- |
| Google TypeScript Style | `eslint.config.mjs` | Regras do pacote `gts`, mantido pelo Google. |
| ESLint | `eslint.config.mjs` | Inclui `eslint-config-prettier`, então não conflita com o Prettier. |
| Prettier | `.prettierrc.json`, `.prettierignore` | Aspas simples, vírgula no final, sem espaço dentro de `{}`. |
| Vitest + cobertura | `vitest.config.ts` | Cobertura V8, relatório em `coverage/lcov.info`. |
| Docker (dev) | `Dockerfile.dev`, `docker-compose.yml`, `docker/entrypoint.dev.sh` | O `Dockerfile` é o da **produção** (Heroku); não use para desenvolvimento. |
| CI | `.github/workflows/ci.yml` | Verificações de todo PR (veja acima). |
| Versão do Node | `.nvmrc`, `engines` no `package.json` | Node 24.22.3 (mesma versão das imagens Docker). |

### Por que usar `make` em vez de `npm` direto na máquina?

- **Mesma versão do Node para todo mundo.** O projeto exige Node 24 (`engine-strict`). Com outra versão instalada, `npm install` falha ou gera um `package-lock.json` diferente do resto do time.
- **Mesmo ambiente para todos.** Banco, migrations e seed sobem iguais em qualquer máquina, sem "na minha funciona".
- **Sem conflito de binários.** Pacotes com partes nativas (Prisma, esbuild) são instalados para o Linux do container, não para o seu sistema.
- **Sem problema de permissão.** Os arquivos gerados pelos containers (`dist/`, `coverage/`) ficam com o seu usuário, não com o `root`.

> **Dica para o editor (opcional):** para o VS Code entender os tipos, você pode instalar as dependências também na sua máquina com Node 24 (`nvm install && nvm use && npm ci`). Esse `node_modules` local é usado só pelo editor. Os comandos do dia a dia continuam sendo os `make`.
