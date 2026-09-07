import { z } from 'zod'

/**
 * VARIÁVEIS DE AMBIENTE TIPADAS E VALIDADAS.
 *
 * O modo padrão de usar env em front é este:
 *
 *     const apiUrl = import.meta.env.VITE_API_URL   // string | undefined
 *     fetch(`${apiUrl}/users`)                      // "undefined/users"
 *
 * O erro não aparece no build. Não aparece no deploy. Aparece em produção,
 * como uma requisição para `undefined/users`, meia hora depois do release —
 * geralmente porque alguém esqueceu de configurar a variável no ambiente novo.
 *
 * A correção é validar **na inicialização**, e deixar quebrar alto:
 * se a configuração está errada, é melhor a aplicação não subir do que subir
 * quebrada de um jeito difícil de diagnosticar. Isto é *fail fast* aplicado a
 * configuração.
 */

const envSchema = z.object({
  VITE_API_URL: z.string().url('VITE_API_URL precisa ser uma URL completa'),
  VITE_FEATURE_NEW_CHECKOUT: z
    .enum(['true', 'false'])
    .default('false')
    // Transformação faz parte do parse: quem consome recebe boolean, não string.
    .transform((value) => value === 'true'),
  VITE_SENTRY_DSN: z.string().url().optional(),
  MODE: z.enum(['development', 'production', 'test']),
})

export type Env = z.infer<typeof envSchema>

/**
 * Em Vite, apenas variáveis com prefixo `VITE_` chegam ao cliente. Em Next, o
 * prefixo é `NEXT_PUBLIC_`.
 *
 * ATENÇÃO DE SEGURANÇA: esse prefixo significa que o valor vai **para dentro do
 * bundle** e é legível por qualquer pessoa que abra o DevTools. Nenhum segredo
 * pode ter esse prefixo — nem chave de API privada, nem string de conexão, nem
 * token de serviço. Ver o projeto `react-nextjs-security`.
 */
function loadEnv(): Env {
  const parsed = envSchema.safeParse(import.meta.env)

  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    // Mensagem que diz o que fazer. Um erro de configuração deve ser resolvível
    // em segundos por quem está fazendo o deploy, sem abrir o código.
    throw new Error(
      `Configuração de ambiente inválida:\n${detalhes}\n\n` +
        'Confira o arquivo .env.local e a configuração do ambiente de deploy.',
    )
  }

  return parsed.data
}

/**
 * Carregado uma vez, na importação do módulo. Se a configuração estiver errada,
 * a aplicação não inicia — que é exatamente o comportamento desejado.
 *
 * Em produção, considere `@t3-oss/env-core`, que separa variáveis de servidor e
 * de cliente e impede, em tempo de compilação, que um segredo do servidor seja
 * lido em código de cliente.
 */
export const env: Env = loadEnv()
