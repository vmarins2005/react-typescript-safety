/**
 * BRANDED TYPES (também chamados de *nominal types* ou *opaque types*).
 *
 * O problema: TypeScript é **estrutural**. Se dois tipos têm a mesma forma, são
 * intercambiáveis. Como `UserId` e `OrderId` são ambos `string`, isto compila:
 *
 *     function cancelOrder(orderId: string) {}
 *     cancelOrder(user.id)          // ← bug silencioso, tipo perfeito
 *
 * Esse é um bug caro e real: id trocado gera consulta que não retorna nada, ou
 * pior, retorna o registro de outra entidade. Nenhum teste unitário pega, porque
 * ambos são strings válidas.
 *
 * A técnica: intersectar o primitivo com uma marca que **não existe em runtime**.
 * O tipo resultante continua sendo uma string na execução — custo zero, sem
 * wrapper, sem alocação — mas deixa de ser atribuível a outras strings.
 */

declare const brand: unique symbol

type Brand<T, TBrand extends string> = T & { readonly [brand]: TBrand }

export type UserId = Brand<string, 'UserId'>
export type OrderId = Brand<string, 'OrderId'>
export type Email = Brand<string, 'Email'>
export type PositiveInt = Brand<number, 'PositiveInt'>

/**
 * Construtores. São a ÚNICA porta de entrada para o tipo marcado, e é isso que
 * dá valor à técnica: o ponto de validação passa a ser único e localizável.
 *
 * Repare que `email()` valida. Depois que um valor vira `Email`, nenhuma função
 * abaixo precisa revalidar — o tipo carrega a garantia. Isso é "parse, don't
 * validate": você valida uma vez, na fronteira, e o resultado é um tipo que
 * prova que a validação aconteceu.
 */
export function userId(value: string): UserId {
  return value as UserId
}

export function orderId(value: string): OrderId {
  return value as OrderId
}

export function email(value: string): Email {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    throw new TypeError(`Email inválido: ${value}`)
  }
  return value as Email
}

export function positiveInt(value: number): PositiveInt {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`Esperado inteiro positivo, recebido: ${value}`)
  }
  return value as PositiveInt
}

/* ────────────────────────────────────────────────────────────────────────────
 * DEMONSTRAÇÃO — descomente para ver o compilador recusar.
 * ────────────────────────────────────────────────────────────────────────────

export function cancelOrder(_id: OrderId): void {}

const u = userId('u_123')
cancelOrder(u)      // Erro: UserId não é atribuível a OrderId ✅
cancelOrder('x')    // Erro: string não é atribuível a OrderId ✅
cancelOrder(orderId('o_9'))  // OK

 * Sem branded types, as três linhas compilam — e a primeira é um bug de produção.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Quando NÃO usar: em objeto de domínio já distinto (`User` vs `Order` já são
 * incompatíveis estruturalmente), ou em código que atravessa muitas fronteiras
 * com serialização — o cast fica repetitivo e o ganho some.
 *
 * O alvo certo são os **primitivos que carregam significado**: ids, email, CPF,
 * moeda, unidades de medida, hash, token. Em qualquer sistema com quatro ou mais
 * tipos de id, a técnica se paga na primeira troca evitada.
 */
