// "npm run dev": arranca o "next dev" com a correção de DNS do MongoDB (scripts/dns-fix.cjs)
// carregada em TODOS os processos Node (o Next trata os pedidos em processos à parte, por isso
// não basta corrigir no processo principal). Os argumentos passam para o next (ex. -p 3005).
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const next = require.resolve('next/dist/bin/next')

// Caminho relativo à pasta do projeto (evita problemas com espaços no caminho absoluto)
const preload = '--require ./scripts/dns-fix.cjs'
const env = { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' ') }

console.log('[dev] Correção de DNS do MongoDB ativa (8.8.8.8 / 1.1.1.1)')
const filho = spawn(process.execPath, [next, 'dev', ...process.argv.slice(2)], { stdio: 'inherit', env })
filho.on('exit', code => process.exit(code ?? 0))
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => filho.kill(sinal))
