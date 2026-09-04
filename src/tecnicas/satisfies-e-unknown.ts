/* ────────────────────────────────────────────────────────────────────────────
 * 1. `satisfies` — validar sem perder a inferência
 * ──────────────────────────────────────────────────────────────────────────── */

type RouteConfig = {
  path: string
  title: string
  requiresAuth: boolean
}

/**
 * O dilema anterior ao `satisfies` (TypeScript 4.9):
 *
 *   const routes: Record<string, RouteConfig> = {...}
 *     ✔ valida a forma
 *     ✘ perde as chaves: `routes.dashboard` não existe para o compilador,
 *       e `keyof typeof routes` é `string`
 *
 *   const routes = {...}
 *     ✔ mantém as chaves literais
 *     ✘ não valida nada: um typo em `requiresAuth` passa despercebido
 *
 * `satisfies` resolve: valida a forma **e** preserva o tipo literal inferido.
 */
export const ROUTES = {
  home: { path: '/', title: 'Início', requiresAuth: false },
  dashboard: { path: '/painel', title: 'Painel', requiresAuth: true },
  settings: { path: '/config', title: 'Configurações', requiresAuth: true },
} satisfies Record<string, RouteConfig>

/**
 * Agora isto funciona, e é o ganho concreto:
 *
 *   - `RouteName` é `'home' | 'dashboard' | 'settings'`, não `string`
 *   - `ROUTES.dashboard.path` é `'/painel'` (literal), não `string`
 *   - errar um campo dentro de qualquer rota quebra a compilação
 *
 * Isso permite tipar navegação: `goTo('dashbaord')` vira erro de compilação em
 * vez de 404 em produção.
 */
export type RouteName = keyof typeof ROUTES

export function goTo(name: RouteName): string {
  return ROUTES[name].path
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. `unknown` em vez de `any` — principalmente no `catch`
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `any` desliga o compilador. `unknown` mantém a verificação e **obriga** você a
 * estreitar antes de usar. A diferença aparece exatamente onde mais dói: no
 * tratamento de erro.
 *
 * O engano comum é achar que `catch (e)` te dá um `Error`. Não dá. Em JavaScript
 * é possível lançar qualquer coisa — e bibliotecas fazem isso:
 *
 *     throw 'algo deu errado'     // string
 *     throw { code: 500 }         // objeto
 *     throw null                  // sim, isso é válido
 *
 * Por isso `e.message` é a fonte silenciosa de "Cannot read properties of
 * undefined (reading 'message')" **dentro do próprio bloco de erro** — que é o
 * pior lugar possível para um erro acontecer, porque mascara a causa original.
 */
export function mensagemDoErro(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Erro desconhecido'
}

/**
 * Type guard — a função que ensina o compilador a estreitar um tipo.
 * `value is Foo` no retorno é o que faz o narrowing funcionar em quem chama.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. `as const` — congelar literais
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Sem `as const`, `PLANOS` seria `string[]` e `Plano` seria `string`.
 * Com ele, o array é readonly e `Plano` é a união dos três valores — o que
 * permite exaustividade e autocomplete.
 */
export const PLANOS = ['free', 'pro', 'enterprise'] as const
export type Plano = (typeof PLANOS)[number]

/**
 * Bônus: template literal types. O compilador entende composição de strings, e
 * isso permite tipar chaves de evento, classes utilitárias, chaves de tradução.
 */
export type EventoDeAnalytics = `${'checkout' | 'signup'}_${'iniciado' | 'concluido' | 'abandonado'}`

export function track(_evento: EventoDeAnalytics): void {
  // `track('checkout_iniciado')`  ✅
  // `track('checkout_iniciada')`  ❌ erro de compilação — o typo não chega ao dashboard
}
