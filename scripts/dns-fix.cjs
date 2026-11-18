// Carregado em todos os processos Node do "npm run dev" (ver scripts/dev.mjs).
//
// Problema que resolve: em alguns PCs o Node usa um servidor DNS local (ex. 127.0.0.1, de uma
// VPN/hotspot) que recusa pedidos SRV, e a ligação "mongodb+srv://" ao MongoDB Atlas falha com
//   querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net
// Aqui passamos a usar DNS públicos. Só em desenvolvimento; a produção (Vercel) não usa isto.
// Para usar outros servidores: MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8
const dns = require('dns')

const servidores = (process.env.MONGODB_DNS_SERVERS || '8.8.8.8,1.1.1.1')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

dns.setServers(servidores)
