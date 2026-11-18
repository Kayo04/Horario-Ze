// Passa os funcionários com a role antiga 'employee' para 'host'.
//
// Não é obrigatório: o código já trata 'employee' como 'host'. Serve para a base de dados
// ficar arrumada. Correr DEPOIS de publicar a versão nova do site (a versão antiga do
// Painel de Admin só listava role 'employee').
//
// Ver o que vai mudar (não altera nada):
//   node --env-file=.env.local -r ./scripts/dns-fix.cjs scripts/migrar-roles-host.mjs
// Aplicar:
//   node --env-file=.env.local -r ./scripts/dns-fix.cjs scripts/migrar-roles-host.mjs --aplicar
import { MongoClient } from 'mongodb'

const aplicar = process.argv.includes('--aplicar')
const cliente = new MongoClient(process.env.MONGODB_URI)
await cliente.connect()
try {
  const col = cliente.db('horaios').collection('employees')
  const antigos = await col.find({ role: 'employee' }, { projection: { name: 1 } }).toArray()
  console.log(`${antigos.length} funcionário(s) com role 'employee':`, antigos.map(e => e.name).join(', ') || '-')
  if (!aplicar) {
    console.log("Nada foi alterado. Para aplicar, junta --aplicar ao comando.")
  } else {
    const r = await col.updateMany({ role: 'employee' }, { $set: { role: 'host', updatedAt: new Date() } })
    console.log(`Feito: ${r.modifiedCount} funcionário(s) passaram a 'host'.`)
  }
} finally {
  await cliente.close()
}
