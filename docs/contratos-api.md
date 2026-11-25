# Contrato de categorias - HU06.1

## Consultar categorias

`GET /categories` é público e retorna todas as categorias, inclusive inativas,
ordenadas por nome. O formato de cada item é:

```json
{"id": 1, "name": "Iluminação", "isActive": true}
```

## Criar e modificar categorias

- `POST /categories` cria uma categoria ativa (`isActive: true`).
- `PATCH /categories/:id` modifica somente o nome da categoria.
- Ambas as operações exigem um token JWT com papel `ADMIN`.

Request body:

```json
{"name": "Iluminação"}
```

`name` é uma string obrigatória, não vazia após remoção de espaços nas extremas,
com no máximo 100 caracteres. A criação e a alteração removem esses espaços
antes de persistir. Um identificador inexistente em `PATCH` retorna HTTP 404.
Campos adicionais são rejeitados pela validação global.

# Contrato de mapas — BASE-MAPA

O `MapsModule` exporta `MapasService`, que usa o `MapProvider` injetável.
A implementação padrão é `NominatimProvider`. Os tipos aprovados estão em
`src/maps/maps.contract.ts`. Este contrato é interno; endpoints e regras
territoriais pertencem às HU07.1/HU07.2.

## Entrada e saída

```ts
reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult>
```

Recebe coordenadas WGS84 do navegador: latitude em [-90, 90] e longitude em
[-180, 180], inclusive. Rejeita strings, NaN e infinitos; zero é válido.

Exemplo ilustrativo, sem consulta real:

```json
{
  "success": true,
  "location": {
    "coordinates": { "latitude": -15.7939, "longitude": -47.8828 },
    "provider": "nominatim",
    "displayAddress": "Brasília, Distrito Federal, Brasil",
    "neighborhood": null,
    "municipality": "Brasília",
    "state": "Distrito Federal",
    "stateCode": "BR-DF",
    "countryCode": "br"
  }
}
```

Preserva o GPS original, sem arredondamento nem substituição pelas coordenadas
do objeto encontrado. Campos ausentes são `null`. Resultados do cache são
reutilizados e devem ser tratados como somente leitura pelo consumidor.

| Campo | Origem no Nominatim |
| --- | --- |
| `displayAddress` | `display_name` |
| `municipality` | Primeiro texto não vazio de `city`, `town`, `village`, `municipality` |
| `state` | `address.state` |
| `stateCode` | `address['ISO3166-2-lvl4']` |
| `countryCode` | `address.country_code`, em minúsculas |
| `neighborhood` | `{ name, sourceField }`, usando `suburb` ou `neighbourhood` |

Valores não textuais são ignorados. Se os campos de bairro divergirem, ignorando
caixa e espaços nas extremidades, retorna `null`; se forem iguais, usa `suburb`.
Não usa `city_district` como bairro. O candidato não comprova atendimento:
contexto, confiança e região ativa serão verificados nas HUs de regiões.
O `place_id` do endereço não deve ser usado como identificador do bairro.

## Falhas

```json
{ "success": false, "code": "MAP_PROVIDER_UNAVAILABLE" }
```

| Código | Situação |
| --- | --- |
| `INVALID_COORDINATES` | Entrada inválida; não consulta o provedor |
| `LOCATION_NOT_FOUND` | `Unable to geocode` em HTTP 200 ou 404 |
| `MAP_PROVIDER_UNAVAILABLE` | Timeout, rede, HTTP, resposta inválida ou limite local/externo |

Endereço sem bairro é sucesso com `neighborhood: null`. A resposta externa precisa
ter `lat`/`lon` válidos. `address` pode estar ausente, mas, se presente, deve ser
um objeto. Erros inesperados continuam sendo exceções; os futuros endpoints
definirão o envelope HTTP público.

## Configuração e limites

Acrescente ao `.env` as variáveis de `.env.maps.example`, preservando as demais:

| Variável | Regra |
| --- | --- |
| `NOMINATIM_API_URL` | Obrigatória: URL HTTP(S) completa do reverse, sem credenciais, query ou fragmento |
| `NOMINATIM_USER_AGENT` | Obrigatória: identificação em uma linha; use nome/versão e contato real |
| `NOMINATIM_TIMEOUT_MS` | Inteiro positivo; padrão 5000 milissegundos |

O serviço público não exige chave. Para trocar o endpoint compatível, altere o
ambiente e reinicie a API, sem recompilar. Usa `jsonv2`, `addressdetails=1`,
`accept-language=pt-BR`, `zoom=18` e `layer=address`, sem retries ou redirects.

O cache guarda até 1000 respostas bem-sucedidas por 24 horas, em memória, usando
coordenadas exatas. Remove a mais antiga ao encher e não armazena falhas. Há
intervalo de 1,1 segundo e uma única consulta em andamento; outra consulta sem
cache durante o bloqueio recebe `MAP_PROVIDER_UNAVAILABLE`, sem fila ou
compartilhamento de consultas pendentes. HTTP 403, 429 e 503 impõem pausa mínima
de 60 segundos; `Retry-After` pode estendê-la. O cache continua disponível.

O módulo atende **uma única instância/processo**. Reiniciar limpa cache e limite;
múltiplas instâncias exigem controle compartilhado ou outro provedor. Leia a
[política pública](https://operations.osmfoundation.org/policies/nominatim/):
o limite vale para todos os usuários somados; não usar autocomplete, varreduras
ou enviar dados pessoais/confidenciais. Para GPS associado a pessoas, use
instância própria ou provedor com contrato apropriado.

## Uso e verificação

O módulo consumidor importa `MapsModule`, injeta `MapasService` pelo construtor
e chama `reverseGeocode`. Nos testes, substitua `MapProvider` por mock.
O Angular pode manter Leaflet; GPS e permissão pertencem ao navegador.
O cadastro não usa seleção manual de ponto. A interface deve atribuir os dados
[© OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
Os tiles possuem [política própria](https://operations.osmfoundation.org/policies/tiles/).

```bash
npm test -- src/maps
npm run build
npm run lint
```

Os testes usam mocks e MSW, sem Nominatim real ou banco. Referências:
[reverse](https://nominatim.org/release-docs/latest/api/Reverse/) e
[formatos e identificadores](https://nominatim.org/release-docs/latest/api/Output/).
