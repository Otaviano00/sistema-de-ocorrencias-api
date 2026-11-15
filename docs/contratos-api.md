# Contrato mínimo de mapas — BASE-MAPA

Esta seção define o contrato interno da integração geográfica. Não define ainda
rotas HTTP, autenticação, cadastro de ocorrências ou o restante da BASE-CONTRATOS.
Os tipos estão em `src/maps/maps.contract.ts`. Os nomes seguem o padrão em inglês
do backend; mensagens da interface podem ser apresentadas em português.

## Operação prevista

O futuro `MapasService` exportado pelo `MapasModule` oferecerá:

```ts
reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult>
```

A implementação do serviço e do provedor será feita na próxima etapa. Estes tipos
não consultam a rede nem validam valores em tempo de execução.

Entrada: coordenadas WGS84 obtidas pelo navegador. Latitude e longitude devem ser
números finitos, respectivamente nos intervalos inclusivos [-90, 90] e [-180, 180].
Zero é válido. Strings, NaN e infinitos devem ser rejeitados antes da consulta.
O contrato de serviço não converte strings implicitamente; eventual conversão de
parâmetros HTTP pertence à camada de entrada da API.

## Resposta de sucesso

Exemplo ilustrativo, sem representar uma consulta real:

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

- `coordinates` preserva os números recebidos, sem arredondamento. As coordenadas
  do objeto encontrado pelo provedor não substituem a localização do dispositivo.
- Todos os campos são presentes; informação ausente é `null`, nunca texto como
  “Não informado” nem uma string vazia.
- `neighborhood`, quando presente, contém `name` e `sourceField`, por exemplo
  `{ "name": "Bairro de exemplo", "sourceField": "suburb" }`.
  Trata-se de um candidato reportado pelo provedor, não de autorização de cadastro.
- `provider` identifica a implementação usada sem expor seu JSON original.

### Normalização prevista para Nominatim

| Campo interno | Origem |
| --- | --- |
| `displayAddress` | `display_name` |
| `municipality` | Primeiro valor não vazio de `city`, `town`, `village`, `municipality` |
| `state` | `address.state` |
| `stateCode` | `address['ISO3166-2-lvl4']`, quando disponível |
| `countryCode` | `address.country_code`, em minúsculas |
| `neighborhood` | Candidato de `address.suburb` ou `address.neighbourhood`, com chave de origem preservada |

Não usar `city_district`, município ou estado como substituto automático de bairro.
Se `suburb` e `neighbourhood` trouxerem nomes diferentes após remover espaços nas
extremidades e ignorar caixa, retornar `neighborhood: null`; se forem iguais,
usar `suburb`. Um único candidato não vazio pode ser retornado com sua origem.
Valores que não sejam strings não compõem os campos de endereço.

**Ter um candidato não comprova identificação confiável.** O critério territorial
para aceitar esses campos, inclusive no Distrito Federal, precisa ser validado
com exemplos representativos na HU07.1/HU07.2. O serviço de regiões verificará
contexto geográfico e região ativa; candidato ausente ou contexto insuficiente
não devem liberar um cadastro. Esta consulta não informa `isActive` ou `canRegister`.

Não usar o `place_id` nem o identificador OSM do objeto encontrado como identificador
do bairro. A identidade geográfica da região será definida na HU07.1; o modelo
`Region` atual ainda não possui município, estado ou referência geográfica.

## Falhas esperadas

```json
{ "success": false, "code": "MAP_PROVIDER_UNAVAILABLE" }
```

| Código | Significado |
| --- | --- |
| `INVALID_COORDINATES` | Coordenadas inválidas; nenhuma requisição externa deve ocorrer |
| `LOCATION_NOT_FOUND` | O provedor respondeu validamente que não há resultado para o ponto |
| `MAP_PROVIDER_UNAVAILABLE` | Timeout, falha de rede, limite externo, erro HTTP inesperado ou resposta inválida |

Um endereço válido sem bairro é sucesso com `neighborhood: null`. Não confundir
essa situação com indisponibilidade externa nem com região não atendida. Erros
internos inesperados continuam sendo exceções; não devem ser mascarados como
falhas esperadas. Status HTTP e envelope público serão definidos quando houver
um endpoint consumidor, sem expor detalhes ou mensagens brutas do provedor.

## Provedor e frontend

A implementação proposta usa a API reverse do Nominatim por um adaptador
substituível, com `format=jsonv2`, `addressdetails=1`, `accept-language=pt-BR`,
`zoom=18` e `layer=address`. O serviço público não exige chave de API. Endpoint,
User-Agent identificando a aplicação e timeout devem ser configuráveis no backend.
Nenhuma credencial de provedores futuros deve ir para o Angular.

O Nominatim encontra um objeto adequado próximo, não garante o endereço exato
ou a inclusão do ponto em um bairro. Seu uso público exige limite agregado de
uma requisição por segundo, identificação, atribuição ao OpenStreetMap, cache e
possibilidade de trocar de serviço. Não implementar autocomplete ou varreduras.
Se houver múltiplas instâncias, um limitador em memória por processo não basta.
Esses mecanismos precisam estar implementados antes de habilitar consultas reais.

O Angular pode usar Leaflet para exibir mapas. A geolocalização é obtida pelo
navegador mediante permissão. O cadastro exige a localização atual e não deve
reutilizar a seleção manual de ponto do laboratório. Um futuro endpoint poderá
expor os dados necessários à interface; o contrato interno não cria esse endpoint.
Tiles e sua atribuição possuem configuração e política próprias.

## Próximas entregas e verificação

- Implementar e exportar `MapasService` e seu provedor substituível no NestJS.
- Documentar as variáveis de ambiente efetivamente usadas e um exemplo de injeção.
- Implementar timeout, cache e limitação agregada de consultas, sem fila ilimitada.
- Testar coordenadas inválidas, endereço completo/parcial, bairro conflitante,
  ausência de resultado, resposta inválida e falhas externas com mocks.
- Verificar preservação das coordenadas, cache e limitação sem chamadas públicas.
- Validar o critério de bairro nas HUs de regiões antes de autorizar cadastros.

Esta entrega inicia a BASE-MAPA pelo contrato; não conclui a task.

Referências: [reverse do Nominatim](https://nominatim.org/release-docs/latest/api/Reverse/),
[formatos e identificadores](https://nominatim.org/release-docs/latest/api/Output/),
[política do serviço público](https://operations.osmfoundation.org/policies/nominatim/)
e [política de tiles](https://operations.osmfoundation.org/policies/tiles/).
