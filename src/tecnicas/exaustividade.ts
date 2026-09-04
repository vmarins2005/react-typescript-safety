/**
 * VERIFICAÇÃO DE EXAUSTIVIDADE — fazer o compilador cobrar por você.
 *
 * Cenário real: existe uma união de 6 status de pedido, tratada em 12 lugares
 * (badge, filtro, texto, ícone, permissão, relatório...). Produto pede um status
 * novo. Quantos dos 12 você lembra de atualizar?
 *
 * Sem exaustividade, a resposta é "os que você encontrar com Ctrl+F", e os
 * outros silenciosamente caem no `default` — o status novo aparece como "—" na
 * tela, ninguém percebe, e o bug chega ao cliente.
 *
 * Com exaustividade, **o build quebra em todos os 12**, com o arquivo e a linha.
 */

export type OrderStatus =
  | 'rascunho'
  | 'aguardando_pagamento'
  | 'pago'
  | 'enviado'
  | 'entregue'
  | 'cancelado'

/** O truque: `never` só aceita atribuição se todos os casos foram eliminados. */
function assertNunca(value: never, contexto: string): never {
  throw new Error(`Caso não tratado em ${contexto}: ${JSON.stringify(value)}`)
}

export function descreverStatus(status: OrderStatus): string {
  switch (status) {
    case 'rascunho':
      return 'Rascunho'
    case 'aguardando_pagamento':
      return 'Aguardando pagamento'
    case 'pago':
      return 'Pagamento confirmado'
    case 'enviado':
      return 'A caminho'
    case 'entregue':
      return 'Entregue'
    case 'cancelado':
      return 'Cancelado'
    default:
      // Se você adicionar 'reembolsado' ao tipo, `status` aqui deixa de ser
      // `never` e ESTA LINHA para de compilar. O compilador vira o revisor que
      // nunca esquece nenhum dos 12 lugares.
      return assertNunca(status, 'descreverStatus')
  }
}

/**
 * A alternativa sem `switch`: um `Record` completo.
 *
 * Vantagem: `Record<OrderStatus, T>` **exige** todas as chaves. Adicionar um
 * status quebra a compilação sem precisar do truque do `never`, e o código fica
 * mais declarativo.
 *
 * Desvantagem: constrói o objeto inteiro a cada chamada se não for içado para
 * fora, e não permite lógica por caso (só mapeamento).
 *
 * Use `Record` para mapeamento puro; `switch` + `never` quando há lógica.
 */
export const COR_DO_STATUS: Record<OrderStatus, string> = {
  rascunho: 'var(--muted)',
  aguardando_pagamento: '#b8860b',
  pago: 'var(--good)',
  enviado: 'var(--accent)',
  entregue: 'var(--good)',
  cancelado: 'var(--bad)',
}

/**
 * Bônus — o mesmo mecanismo aplicado a evento, que é onde ele mais salva:
 *
 *     type Event = { type: 'click'; x: number } | { type: 'key'; key: string }
 *
 *     function handle(event: Event) {
 *       switch (event.type) {
 *         case 'click': return event.x     // narrowing: `x` existe aqui
 *         case 'key':   return event.key   // narrowing: `key` existe aqui
 *         default:      return assertNunca(event, 'handle')
 *       }
 *     }
 *
 * Note que o narrowing é o outro benefício: dentro de cada `case`, o TypeScript
 * sabe exatamente qual variante é, e permite acessar só os campos daquela.
 */
