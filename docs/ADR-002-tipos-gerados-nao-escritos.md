# ADR-002 — Gerar tipos a partir do contrato; nunca escrevê-los à mão

- **Status:** Aceito
- **Data:** 2026-09-04

## Contexto

Os tipos de resposta da API eram escritos manualmente em `types/api.ts`, a partir
da leitura da documentação (ou, com frequência, de um `console.log` da resposta).

O problema não é o esforço inicial — é a **sincronização**. O tipo escrito à mão
é uma cópia do contrato, e cópias divergem:

- back-end adiciona um campo: o front não sabe que ele existe
- back-end torna um campo opcional: o front continua achando que é obrigatório e
  quebra em produção para os registros afetados
- back-end renomeia: o front compila perfeitamente e falha em runtime
- ninguém percebe até virar incidente, porque **nada verifica a cópia**

O TypeScript dá uma falsa sensação de segurança aqui: ele valida o código contra
o tipo, mas ninguém valida o tipo contra a realidade.

## Decisão

O tipo é **derivado** de uma fonte de verdade, com uma ordem de preferência:

1. **Contrato publicado pelo back-end** (OpenAPI, GraphQL schema, Protobuf)
   → gerar com `openapi-typescript`, `graphql-codegen` ou equivalente, em passo
   de build ou script versionado.
2. **Schema compartilhado em monorepo** (tRPC, ou um pacote de schemas Zod
   consumido pelos dois lados) → o tipo é inferido, não existe geração.
3. **Sem contrato disponível** → schema Zod escrito no front, tratado como
   **anticorruption layer** explícita, com `z.infer` gerando o tipo.

O que fica proibido: escrever `interface UserResponse { ... }` à mão para
descrever uma resposta de API.

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que não |
|---|---|---|---|
| Tipos escritos à mão | Zero ferramenta; controle total | Divergem em silêncio; nada verifica; falha em produção | É o problema |
| `openapi-typescript` | Tipos exatos do contrato; roda no CI | Depende de o back-end manter o spec atualizado | **Preferido** quando há spec |
| GraphQL Codegen | Tipos + hooks gerados; contrato é obrigatório no GraphQL | Só se a API for GraphQL | Contextual |
| tRPC | Type safety ponta a ponta sem geração | Exige monorepo e back-end em TypeScript | **Ideal** quando aplicável |
| Zod escrito no front | Valida em runtime; não depende do back-end | É uma cópia — pode divergir do contrato real | Terceira opção, com validação de runtime compensando |

## Consequências

**Positivas**
- Mudança de contrato aparece como **erro de compilação** no front, no momento em
  que o spec é atualizado — não como incidente semanas depois.
- Some a categoria "esqueci de atualizar o tipo".
- O contrato vira artefato compartilhado entre times, e a conversa sobre API
  passa a ter um objeto concreto.

**Negativas**
- Dependência de processo do outro time: se o spec não é mantido, os tipos
  gerados mentem — com o agravante de parecerem confiáveis. **Este é o risco
  principal**, e o motivo pelo qual a validação de runtime do ADR-001 continua
  valendo mesmo com tipos gerados.
- Um passo a mais no build e um artefato gerado no repositório (ou um script que
  todos precisam lembrar de rodar).
- Tipos gerados costumam ser feios e verbosos; muitas vezes vale um mapeamento
  para o modelo do domínio (anticorruption layer).

**Combinação recomendada**
- **Tipos gerados** dão segurança em tempo de compilação contra o contrato
  *declarado*.
- **Zod na fronteira** (ADR-001) dá segurança em runtime contra o contrato
  *real*.

As duas coisas resolvem problemas diferentes. Ter só a primeira é o cenário
perigoso: confiança alta sem verificação.

**Monitorar**
- Divergência entre spec e comportamento real (erros de contrato em produção com
  tipos gerados presentes). Cada ocorrência é assunto para conversar com o time
  de back-end, não para "arrumar no front".

## Nota transferível

> **Todo tipo escrito à mão para descrever um sistema externo é uma cópia — e
> cópias divergem.**

Onde houver contrato, derive. Onde não houver, valide em runtime e trate o
schema como uma tradução explícita, não como a verdade.
