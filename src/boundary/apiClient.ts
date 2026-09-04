import { z } from 'zod'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  A LIÇÃO CENTRAL DESTE PROJETO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   **Tipo do TypeScript não existe em runtime.**
 *
 * Isto compila, passa no lint, e é uma mentira:
 *
 *     const user = await fetch('/api/user').then(r => r.json()) as User
 *
 * `as User` não verifica nada. É uma promessa sua ao compilador — e o compilador
 * acredita. Se a API mudar `name` para `full_name`, se devolver `null` num campo
 * que você tipou como obrigatório, ou se retornar um HTML de erro 502, o
 * TypeScript continua achando que ali existe um `User`. O erro aparece quinze
 * componentes adiante, como `Cannot read properties of undefined`, e o stack
 * trace aponta para o lugar errado.
 *
 * A regra: **valide em runtime toda entrada que vem de fora do seu build.**
 *
 *   - resposta de API              ← este arquivo
 *   - variáveis de ambiente        ← env.ts
 *   - query string / searchParams
 *   - localStorage / sessionStorage / cookie
 *   - postMessage, WebSocket, webhook
 *   - payload de formulário no servidor
 *
 * "Parse, don't validate": em vez de checar e seguir com o tipo original, você
 * **transforma** o desconhecido num tipo que prova a validação. Depois da
 * fronteira, o resto do código confia — e essa confiança é justificada.
 */

/* ── 1. O schema é a fonte única ─────────────────────────────────────────── */

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
  // `coerce` para o caso clássico: a API manda data como string ISO.
  createdAt: z.coerce.date(),
  // Campo que pode não vir. Explícito, em vez de descoberto em produção.
  avatarUrl: z.string().url().nullable().default(null),
})

/**
 * O tipo é DERIVADO do schema, nunca escrito à mão ao lado dele.
 *
 * Escrever `type User = { ... }` separado do schema é duplicar conhecimento —
 * e os dois divergem na primeira mudança que alguém fizer com pressa.
 */
export type User = z.infer<typeof userSchema>

/* ── 2. A fronteira ──────────────────────────────────────────────────────── */

export type ApiError =
  | { kind: 'network'; message: string }
  | { kind: 'http'; status: number }
  | { kind: 'contract'; issues: string[] }

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

/**
 * Note que `contract` é um tipo de erro **de primeira classe**, no mesmo nível
 * de "sem rede" e "500".
 *
 * Isso muda o diagnóstico de produção completamente. Sem essa distinção, um
 * contrato quebrado aparece como `undefined is not an object` num componente
 * aleatório. Com ela, você recebe: "a API devolveu algo que não é um User, e o
 * campo problemático é `email`". A diferença entre uma tarde de investigação e
 * dois minutos.
 */
export async function fetchUser(id: string): Promise<ApiResult<User>> {
  let response: Response
  try {
    response = await fetch(`/api/users/${encodeURIComponent(id)}`)
  } catch (error) {
    return {
      ok: false,
      error: { kind: 'network', message: error instanceof Error ? error.message : 'offline' },
    }
  }

  if (!response.ok) {
    return { ok: false, error: { kind: 'http', status: response.status } }
  }

  const json: unknown = await response.json()

  // `safeParse` em vez de `parse`: erro de contrato não deve derrubar a árvore
  // via exceção. Ele é um resultado previsto, e a UI decide o que fazer.
  const parsed = userSchema.safeParse(json)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        kind: 'contract',
        issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      },
    }
  }

  return { ok: true, data: parsed.data }
}

/* ── 3. Demonstração sem rede, para o exercício ──────────────────────────── */

/** Simula respostas de API, incluindo as quebradas. */
export function parseUserPayload(payload: unknown): ApiResult<User> {
  const parsed = userSchema.safeParse(payload)
  return parsed.success
    ? { ok: true, data: parsed.data }
    : {
        ok: false,
        error: {
          kind: 'contract',
          issues: parsed.error.issues.map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`),
        },
      }
}

export const PAYLOADS: Record<string, unknown> = {
  'válido': {
    id: 'u1',
    name: 'Ana Ribeiro',
    email: 'ana@exemplo.com',
    role: 'admin',
    createdAt: '2026-01-15T10:00:00Z',
    avatarUrl: null,
  },
  'campo renomeado pelo back-end': {
    id: 'u1',
    full_name: 'Ana Ribeiro',
    email: 'ana@exemplo.com',
    role: 'admin',
    createdAt: '2026-01-15T10:00:00Z',
  },
  'enum com valor novo': {
    id: 'u1',
    name: 'Ana',
    email: 'ana@exemplo.com',
    role: 'superadmin',
    createdAt: '2026-01-15T10:00:00Z',
  },
  'null onde não devia': {
    id: 'u1',
    name: null,
    email: 'ana@exemplo.com',
    role: 'member',
    createdAt: '2026-01-15T10:00:00Z',
  },
  'HTML de erro do proxy': '<html><body>502 Bad Gateway</body></html>',
}
