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

* **Linguagem Principal:** 
* **Guia de Estilo:** 
* **Linter / Verificador de Estilo:** 
* **Framework de Testes:**
* **Análise Estática de Código:** 
* **Cobertura de Código (meta ≥ 80%):** 
* **Gerador de Documentação:**
* **Gestão e Controle de Versão:** `Git` e `Github`
* **Apoio de IAs e Ferramentas Auxiliares:** `Gemini`

## Configuração do ambiente

O [contrato mínimo de mapas](docs/contratos-api.md) descreve a entrada, a resposta
normalizada e as falhas previstas para a integração da BASE-MAPA.

O projeto usa Node.js 24, indicado em `.nvmrc`. Com o nvm instalado, execute na raiz do projeto:

```bash
nvm install
nvm use
npm ci
npx prisma generate --config prisma7.config.ts
```

Para mapas, acrescente ao `.env` as variáveis de [.env.maps.example](.env.maps.example).
A configuração e os limites estão no [contrato de mapas](docs/contratos-api.md).

Para executar os testes:

```bash
npm test
```

