# Orquestra o ambiente de desenvolvimento (db + api + web) e o ciclo TDD/refactor
# da API. `make` (ou `make help`) lista os alvos.
.DEFAULT_GOAL := help
.NOTPARALLEL:
.PHONY: help up down logs reset seed install tdd refactor

COMPOSE := docker compose

# Arquivos gerados nos bind mounts ficam com o dono do usuário do host.
export HOST_UID := $(shell id -u)
export HOST_GID := $(shell id -g)

# Sem terminal (CI, scripts), desliga a alocação de TTY do docker compose.
TTY := $(shell [ -t 0 ] || echo -T)

# Roda no container 'api' em execução; se parado, num container efêmero sem banco.
api_exec = $(if $(shell $(COMPOSE) ps -q --status running api 2>/dev/null),$(COMPOSE) exec $(TTY) api,$(COMPOSE) run --rm --no-deps -e DB_SETUP=false $(TTY) api)

help: ## Lista os alvos disponíveis
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-9s\033[0m %s\n", $$1, $$2}'

up: ## Sobe db, api e web (build se preciso) com migrations e seed automáticas
	@$(COMPOSE) up -d --build --renew-anon-volumes --wait --wait-timeout 300 \
		|| { echo "Falha ao subir o ambiente. Veja: make logs"; exit 1; }
	@echo ""
	@echo "  API: http://$$($(COMPOSE) port api 3000 | sed 's/0.0.0.0/localhost/')"
	@echo "  Web: http://$$($(COMPOSE) port web 4200 | sed 's/0.0.0.0/localhost/')"

down: ## Para e remove os containers (mantém o volume do banco)
	$(COMPOSE) down --remove-orphans

logs: ## Acompanha os logs da api e do web em tempo real
	$(COMPOSE) logs -f --tail=100 api web

reset: ## Remove containers e volumes e recria o banco do zero (migrations + seed)
	$(COMPOSE) down -v --remove-orphans
	@$(MAKE) --no-print-directory up

seed: ## Executa a seed manualmente (idempotente; FORCE=1 apaga e recria os dados)
	$(COMPOSE) exec $(TTY) api npm run seed $(if $(FORCE),-- --force)

install: ## Instala pacotes no container api (evita Node do host): make install PKG="zod" [DEV=1]
	@test -n "$(PKG)" || { echo 'Uso: make install PKG="<pacote> [...]" [DEV=1 para devDependency]'; exit 1; }
	$(api_exec) npm install $(if $(DEV),--save-dev) $(PKG)

tdd: ## Vitest em modo watch, sem cobertura (ciclo Red/Green)
	$(api_exec) npm run test:watch

refactor: ## Prettier + ESLint --fix (gts) + Vitest com cobertura
	$(api_exec) sh -c 'npm run format && npm run lint:fix && npm run test:cov'
