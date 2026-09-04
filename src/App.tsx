import { useState } from 'react'
import { PAYLOADS, parseUserPayload } from './boundary/apiClient'
import { COR_DO_STATUS, descreverStatus, type OrderStatus } from './tecnicas/exaustividade'
import { goTo, PLANOS, ROUTES, type RouteName } from './tecnicas/satisfies-e-unknown'

const STATUSES: readonly OrderStatus[] = [
  'rascunho',
  'aguardando_pagamento',
  'pago',
  'enviado',
  'entregue',
  'cancelado',
]

function BoundaryDemo() {
  const [selected, setSelected] = useState<string>('válido')
  const payload = PAYLOADS[selected]
  const result = parseUserPayload(payload)

  return (
    <div className="panel">
      <div className="row">
        <label>
          Resposta simulada da API:{' '}
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {Object.keys(PAYLOADS).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {result.ok ? (
          <p style={{ color: 'var(--good)' }}>
            Contrato válido. <code>{result.data.name}</code> —{' '}
            <code>{result.data.createdAt.getFullYear()}</code> (já é um <code>Date</code>,
            não uma string)
          </p>
        ) : (
          <div>
            <p style={{ color: 'var(--bad)' }}>Contrato quebrado:</p>
            <ul>
              {result.error.kind === 'contract' ? (
                result.error.issues.map((issue) => (
                  <li key={issue}>
                    <code>{issue}</code>
                  </li>
                ))
              ) : (
                <li>{result.error.kind}</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <p className="muted">
        Sem validação de runtime, cada um destes casos viraria{' '}
        <code>undefined is not an object</code> em algum componente distante, com stack
        trace apontando para o lugar errado.
      </p>
    </div>
  )
}

export function App() {
  return (
    <main>
      <h1>TypeScript defensivo</h1>
      <p>
        A lição central: <strong>tipo do TypeScript não existe em runtime</strong>. Ele é
        uma promessa que você faz ao compilador, e o compilador acredita. Tudo o que
        entra de fora do seu build precisa ser validado de verdade.
      </p>

      <h2>1. Validação na fronteira (Zod)</h2>
      <p>
        Escolha uma resposta quebrada abaixo. Note que o erro tem{' '}
        <strong>nome do campo e motivo</strong> — a diferença entre dois minutos e uma
        tarde de investigação.
      </p>
      <BoundaryDemo />

      <h2>2. Branded types</h2>
      <p>
        <code>UserId</code> e <code>OrderId</code> são ambos <code>string</code>, e por
        isso são intercambiáveis por padrão. A marca os torna incompatíveis, com custo
        zero em runtime. Veja <code>src/branded/ids.ts</code> — o bloco comentado no fim
        mostra o compilador recusando a troca.
      </p>

      <h2>3. Exaustividade</h2>
      <p>
        Adicione <code>&apos;reembolsado&apos;</code> ao tipo <code>OrderStatus</code> e
        rode <code>npm run typecheck</code>: as duas construções abaixo quebram, apontando
        exatamente onde faltou tratar.
      </p>
      <div className="panel row">
        {STATUSES.map((status) => (
          <span key={status} className="tag" style={{ color: COR_DO_STATUS[status] }}>
            {descreverStatus(status)}
          </span>
        ))}
      </div>

      <h2>4. satisfies</h2>
      <p>
        Valida a forma <em>e</em> preserva as chaves literais. Por isso{' '}
        <code>goTo(&apos;dashboard&apos;)</code> tem autocomplete e{' '}
        <code>goTo(&apos;dashbaord&apos;)</code> é erro de compilação, não 404.
      </p>
      <div className="panel">
        <ul>
          {(Object.keys(ROUTES) as RouteName[]).map((name) => (
            <li key={name}>
              <code>{name}</code> → <code>{goTo(name)}</code>
            </li>
          ))}
        </ul>
        <p className="muted">
          planos (<code>as const</code>): {PLANOS.join(', ')}
        </p>
      </div>

      <h2>5. unknown em vez de any</h2>
      <p>
        Em <code>src/tecnicas/satisfies-e-unknown.ts</code>: por que{' '}
        <code>catch (e) &#123; e.message &#125;</code> é a fonte silenciosa de erro dentro
        do próprio tratamento de erro — o pior lugar possível, porque mascara a causa
        original.
      </p>
    </main>
  )
}
