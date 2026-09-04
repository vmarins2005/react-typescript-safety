# ADR-001 — Validar toda fronteira externa com Zod

- **Status:** Aceito
- **Data:** 2026-09-04

## Contexto

A base tratava dado externo com asserção de tipo (`as User`). Isso não valida
nada — é uma afirmação para o compilador, que a aceita sem verificar.

Incidentes que essa prática produziu, todos com a mesma assinatura:

- back-end renomeou um campo numa release; a tela quebrou em componente sem
  relação com a mudança, e o stack trace apontava para lá
- um campo documentado como obrigatório voltou `null` para registros antigos
- um proxy respondeu HTML de erro com status 200; `r.json()` lançou uma exceção
  genérica, capturada por um `catch` que a transformou em "erro desconhecido"
- variável de ambiente ausente em ambiente novo gerou requisições para
  `undefined/api/users` por meia hora até alguém notar

O que todos têm em comum: **a falha foi detectada longe da causa**. O custo não
está no bug em si, está no tempo de diagnóstico.

## Decisão

Toda entrada que cruza a fronteira do build é validada em runtime com **Zod**:

| Fronteira | Onde valida |
|---|---|
| Resposta de API | no cliente HTTP, antes de devolver |
| Variáveis de ambiente | na inicialização, com `throw` |
| `searchParams` / query | ao ler |
| `localStorage` / cookie | ao ler |
| `postMessage` / WebSocket | ao receber |
| Payload de formulário no servidor | na Server Action / handler |

Regras:
- o **schema é a fonte única**; o tipo vem de `z.infer`, nunca escrito ao lado
- `safeParse` onde a falha é tratável pela UI; `parse` onde ela deve derrubar
  (configuração na inicialização)
- erro de contrato é um **tipo de erro nomeado**, distinto de rede e de HTTP

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que não |
|---|---|---|---|
| `as Tipo` | Zero custo, zero código | Não valida; falha longe da causa | É o problema |
| Type guards à mão | Sem dependência | Verboso; erro sem detalhe ("inválido", sem dizer qual campo); ninguém mantém quando o tipo cresce | Custo de manutenção alto, qualidade baixa |
| `io-ts` / `runtypes` | Maduros | Ergonomia mais pesada; comunidade menor | Menos adoção |
| Valibot | Muito menor (~1kB), API similar | Ecossistema mais novo; menos integrações prontas | **Forte candidato** se o tamanho do bundle for crítico |
| ArkType | Sintaxe próxima de TS; rápido | Mais recente | Reavaliar em 12 meses |
| Zod | Ergonomia excelente; `z.infer`; integração com RHF, tRPC, Server Actions; enorme adoção | ~13kB gzip; v3 tem custo de bundle notável | **Escolhido** |

## Consequências

**Positivas**
- Falha de contrato é detectada **na fronteira**, com nome do campo e motivo.
  Diagnóstico cai de horas para minutos.
- Schema e tipo não podem divergir — são o mesmo artefato.
- O schema documenta o contrato de forma executável, e serve de base para mocks
  (`@anatine/zod-mock`) e para testes.
- O mesmo schema roda no cliente e no servidor, o que elimina a divergência
  clássica entre validação de front e de back.

**Negativas**
- Peso no bundle. Mitigação: schemas de rota carregados sob demanda com o código
  que os usa; avaliar Valibot se virar problema medido.
- Custo de runtime em payload grande (listas de milhares de itens). Mitigação:
  validar a forma do envelope e amostrar itens, ou validar apenas na borda de
  entrada da feature.
- Disciplina: um `fetch` novo sem `safeParse` reintroduz o problema. Vale uma
  regra de lint restringindo `fetch` fora do cliente HTTP oficial.

**Monitorar**
- Frequência de erros do tipo `contract` em produção. Um pico indica mudança não
  comunicada no back-end — o que, por si só, já é um alerta valioso que antes não
  existia.

## Nota transferível

> **"Parse, don't validate."**
> Não verifique e siga com o tipo original. **Transforme** o desconhecido num
> tipo que prova que a validação aconteceu. Depois da fronteira, o resto do
> código confia — e essa confiança passa a ser justificada.
