# TypeScript defensivo

> **Stack:** React 19 + Vite + Zod + TypeScript strict
> **Conceito:** o tipo não existe em runtime — valide a fronteira, e faça o
> compilador trabalhar para você

---

## O problema que este projeto ataca

Esta linha compila, passa no lint, e é uma mentira:

```ts
const user = await fetch('/api/user').then(r => r.json()) as User
```

`as User` **não verifica nada**. É uma promessa sua ao compilador — e ele
acredita. Se a API renomear um campo, devolver `null` onde você esperava string,
ou responder com o HTML de erro do proxy, o TypeScript continua achando que ali
existe um `User`.

O erro aparece quinze componentes adiante, como
`Cannot read properties of undefined`, com stack trace apontando para o lugar
errado. É a categoria de bug que consome tarde inteira.

A regra que resolve: **valide em runtime toda entrada que vem de fora do seu
build.**

- resposta de API
- variáveis de ambiente
- query string / `searchParams`
- `localStorage`, `sessionStorage`, cookie
- `postMessage`, WebSocket, webhook
- payload de formulário no servidor

---

## Rodando

```bash
npm install
npm run dev
npm run typecheck
```

O primeiro painel deixa você escolher respostas de API quebradas e ver o
diagnóstico que a validação produz.

---

## O que ler, em ordem

1. **`boundary/apiClient.ts`** — "parse, don't validate". O detalhe que mais
   importa: erro de **contrato** é um tipo de erro de primeira classe, no mesmo
   nível de "sem rede" e "500". Isso muda o diagnóstico de produção.

2. **`boundary/env.ts`** — configuração validada na inicialização. Se a variável
   está errada, é melhor a aplicação **não subir** do que subir fazendo requisição
   para `undefined/users`.

3. **`branded/ids.ts`** — TypeScript é estrutural, então `UserId` e `OrderId` são
   intercambiáveis por padrão. A marca os separa com custo zero em runtime.
   Descomente o bloco final para ver o compilador recusar a troca.

4. **`tecnicas/exaustividade.ts`** — `never` como verificação de completude, e
   quando usar `Record<Union, T>` no lugar do `switch`.

5. **`tecnicas/satisfies-e-unknown.ts`** — `satisfies`, `as const`, template
   literal types, e por que `catch (e) { e.message }` é a fonte silenciosa de
   erro dentro do próprio tratamento de erro.

---

## A configuração de `strict` que vale a pena

O `tsconfig.json` deste projeto liga mais do que o `strict: true` padrão. Cada
flag paga por si:

| Flag | O que pega |
|---|---|
| `strict` | o pacote base — sem ele, TypeScript é decoração |
| `noUncheckedIndexedAccess` | `arr[0]` passa a ser `T \| undefined`. Pega o off-by-one e o acesso a chave inexistente |
| `exactOptionalPropertyTypes` | distingue "campo ausente" de "campo com valor `undefined`" — a diferença importa em `PATCH` de API |
| `noImplicitOverride` | método que sobrescreve precisa dizer que sobrescreve |
| `noFallthroughCasesInSwitch` | `case` sem `break` |
| `verbatimModuleSyntax` | força `import type`, evitando import de runtime desnecessário no bundle |

`noUncheckedIndexedAccess` é o que mais incomoda no começo e o que mais evita
crash. Ligue.

---

## Decisões documentadas

- [ADR-001 — Validar toda fronteira externa com Zod](./docs/ADR-001-zod-em-toda-fronteira.md)
- [ADR-002 — Gerar tipos a partir do contrato, nunca escrevê-los à mão](./docs/ADR-002-tipos-gerados-nao-escritos.md)

---

## Exercícios

1. **Sinta o diagnóstico.** No primeiro painel, escolha cada resposta quebrada e
   leia a mensagem. Depois comente o `safeParse` e faça um `as User`. Observe o
   que acontece: a aplicação quebra num lugar sem relação com a causa.

2. **Prove os branded types.** Descomente o bloco final de `branded/ids.ts`. Veja
   os três erros. Agora remova a marca de `OrderId` (deixe `type OrderId = string`)
   e observe as três linhas compilando — inclusive a que é um bug.

3. **Force a exaustividade.** Adicione `'reembolsado'` a `OrderStatus` e rode
   `npm run typecheck`. Conte quantos lugares quebram. Depois remova o
   `assertNunca` do `default` e rode de novo: agora só um lugar quebra, e o
   status novo aparece silenciosamente sem tratamento.

4. **Quebre a configuração.** Importe `env` no `App.tsx` sem criar o `.env.local`
   (copie de `.env.example`). Veja a aplicação recusar-se a subir, com uma
   mensagem que diz o que fazer. Compare com o que aconteceria em produção sem
   essa validação.

5. **Escreva um type guard.** Implemente `isUser(value: unknown): value is User`
   à mão, sem Zod. Depois compare o tamanho, a legibilidade e a qualidade da
   mensagem de erro com a versão em Zod. É o melhor argumento a favor de adotar
   um validador.

6. **`satisfies` na prática.** Troque `satisfies Record<string, RouteConfig>` por
   `: Record<string, RouteConfig>` (anotação normal). Observe `goTo('dashboard')`
   perder o autocomplete e `goTo('qualquercoisa')` passar a compilar.

7. **O exercício de tech lead.** Liste toda entrada externa da sua aplicação de
   trabalho. Para cada uma, responda: ela é validada em runtime? Quantas há? A
   resposta típica na primeira auditoria é "nenhuma" — e isso é um ADR esperando
   para ser escrito.

---

## A frase para levar

> **`as` não valida. Ele silencia o compilador.**
> Todo `as` numa fronteira de dados é uma aposta de que o mundo externo vai se
> comportar. Ele não vai.


---

## Faz parte de uma série

16 projetos independentes, um por conceito, sobre o que separa um dev pleno de um
senior/tech lead em React e Next.js. Cada um tem README, ADRs documentando as
decisões, e exercícios.

| Projeto | Conceito |
|---|---|
| [react-solid-na-pratica](https://github.com/vmarins2005/react-solid-na-pratica) | Os 5 principios SOLID traduzidos para componentes React, com anti-exemplo e versao boa lado a lado |
| [quando-abstrair](https://github.com/vmarins2005/quando-abstrair) | A mesma feature em 3 versoes: duplicada, abstraida cedo demais, e abstraida na hora certa |
| [padroes-de-componentes-react](https://github.com/vmarins2005/padroes-de-componentes-react) | Compound, headless, slots, state reducer e estado controlavel: como absorver variacao sem explodir em props |
| [arquitetura-por-feature](https://github.com/vmarins2005/arquitetura-por-feature) | Organizacao por feature em Next.js, com fronteiras garantidas por ESLint em vez de disciplina |
| [regra-de-negocio-no-front](https://github.com/vmarins2005/regra-de-negocio-no-front) | Clean Architecture no front: dominio puro, portas e adaptadores, sem uma linha de React no nucleo |
| [onde-mora-o-estado](https://github.com/vmarins2005/onde-mora-o-estado) | Os 6 tipos de estado em React e a ferramenta certa para cada um |
| [estados-impossiveis](https://github.com/vmarins2005/estados-impossiveis) | Da sopa de booleanos ao XState: tornar estados invalidos inexprimiveis |
| `typescript-na-fronteira` **(você está aqui)** | Tipo nao existe em runtime: validacao com Zod, branded types e verificacao de exaustividade |
| [testes-que-valem-a-pena](https://github.com/vmarins2005/testes-que-valem-a-pena) | Testing Trophy com Vitest, Testing Library, MSW, Playwright e axe |
| [performance-no-next](https://github.com/vmarins2005/performance-no-next) | Waterfalls de requisicao, streaming com Suspense e o que RSC realmente economiza de bundle |
| [entendendo-o-cache-do-next](https://github.com/vmarins2005/entendendo-o-cache-do-next) | As 4 camadas de cache do App Router e como diagnosticar dado velho na tela |
| [acessibilidade-na-pratica](https://github.com/vmarins2005/acessibilidade-na-pratica) | WCAG 2.2 AA em React: foco, teclado, live regions e os requisitos invisiveis em code review |
| [seguranca-no-next](https://github.com/vmarins2005/seguranca-no-next) | Server Action e endpoint publico: autorizacao, validacao, rate limit e CSP com nonce |
| [quando-quebra-em-producao](https://github.com/vmarins2005/quando-quebra-em-producao) | Taxonomia de erros, error boundaries, log estruturado e feature flags com kill switch |
| [design-system-em-monorepo](https://github.com/vmarins2005/design-system-em-monorepo) | Design system como pacote versionado: Turborepo, design tokens e changesets |
| [commits-que-contam-historia](https://github.com/vmarins2005/commits-que-contam-historia) | Commit atomico e Conventional Commits, com historico curado e um bug para achar via git bisect |
