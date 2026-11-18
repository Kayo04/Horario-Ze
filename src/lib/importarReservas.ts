// Leitura do Excel/CSV de reservas exportado do sistema de reservas (colunas "Date", "Customer Email",
// "Booking Time", "Booking Description", "Party Departure Time", "Booking Notes", ...).
// Lógica que estava na página Gerir Horários (/scheduler), agora usada no Criar Horários.
// Ficheiro só para o browser: recebe o módulo xlsx já carregado.

import type * as XLSXTipo from 'xlsx'
import type { EventType } from '@/types/reservation'

type XLSX = typeof XLSXTipo

export interface ReservaImportada {
  eventType: EventType
  datetime: string
  adults: number
  children: number
  date: string
  startTime: string
  endTime: string
  people: number
  customerName: string
}

export type ErroImportacao = 'missing_email_col' | 'missing_cols' | 'no_valid' | null

/** Chave para não importar a mesma reserva duas vezes. */
export const chaveReserva = (r: { date: string; startTime: string; eventType: string; people: number }) =>
  `${r.date}_${r.startTime}_${r.eventType}_${r.people}`

function lerData(XLSX: XLSX, v: unknown): string {
  try {
    if (typeof v === 'number') {
      const partes = XLSX.SSF.format('dd/mm/yyyy', v).split('/')
      if (partes.length === 3) return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
    }
    if (typeof v === 'string' && v.includes('/')) {
      const partes = v.trim().split(/\s+/)[0].split('/')
      if (partes.length === 3 && partes[2].length === 4) return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
    }
  } catch {}
  return ''
}

function lerHora(v: unknown): string {
  if (typeof v === 'number') {
    const total = Math.round((v - Math.floor(v)) * 1440)
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
  if (typeof v === 'string' && v.includes(':')) return v.trim()
  return ''
}

function lerPessoas(descricao: string, notas: string): number {
  const desc = (descricao || '').toLowerCase()
  const texto = (notas || '').toLowerCase() + ' ' + desc
  let m = texto.match(/(\d+)\s*\+\s*(\d+)\s*(pax|px)/i)
  if (m) return parseInt(m[1]) + parseInt(m[2])
  m = texto.match(/(\d+)\s*(pax|px)/i)
  if (m) return parseInt(m[1])
  m = desc.match(/(\d+)\s*x/i)
  if (m) return parseInt(m[1])
  return 1
}

function lerTipo(descricao: string, notas: string): EventType {
  const texto = (notas || '').toLowerCase() + ' ' + (descricao || '').toLowerCase()
  if (texto.includes('aniversário') || texto.includes('aniversario')) return 'birthday'
  if (texto.includes('vr local')) return 'vrlocal'
  const experiencias = ['the break-in', 'mission planet x', 'nano clash', 'roboclash', 'dont scream', "don't scream", 'mask of the pharaoh']
  if (experiencias.some(k => texto.includes(k))) return 'experiencia'
  return 'teambuilding'
}

function lerFim(inicio: string, fim: string): string {
  if (fim && fim.includes(':')) return fim
  if (!inicio || !inicio.includes(':')) return '20:00'
  const [h, m] = inicio.split(':').map(Number)
  const total = (h * 60 + m + 90) % 1440 // sem hora de saída: 1h30 depois do início
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Lê o ficheiro (ArrayBuffer) e devolve as reservas encontradas, ou o tipo de erro. */
export function lerReservas(XLSX: XLSX, dados: ArrayBuffer): { reservas: ReservaImportada[]; erro: ErroImportacao } {
  const livro = XLSX.read(dados, { type: 'array' })
  const folha = livro.Sheets[livro.SheetNames[0]]
  const linhas = XLSX.utils.sheet_to_json<any[]>(folha, { header: 1, defval: '' })

  const iCabecalho = linhas.findIndex(l => Array.isArray(l) && l.includes('Customer Email'))
  if (iCabecalho === -1) return { reservas: [], erro: 'missing_email_col' }
  const cab = linhas[iCabecalho]
  const col = {
    date: cab.findIndex((h: any) => h && String(h).startsWith('Date')),
    email: cab.indexOf('Customer Email'),
    name: cab.findIndex((h: any) => h === 'Customer Name' || h === 'Customer: Account Name' || h === 'Nome do Cliente'),
    time: cab.indexOf('Booking Time'),
    description: cab.indexOf('Booking Description'),
    endTime: cab.indexOf('Party Departure Time'),
    notes: cab.indexOf('Booking Notes'),
  }
  if (col.date === -1 || col.email === -1 || col.time === -1) return { reservas: [], erro: 'missing_cols' }

  const reservas: ReservaImportada[] = []
  let dataAtual = '' // a data só aparece na 1.ª linha de cada dia
  for (const linha of linhas.slice(iCabecalho + 1)) {
    if (!linha || linha.length < cab.length) continue
    const email = linha[col.email]
    if (!(typeof email === 'string' && email.includes('@'))) continue

    const data = linha[col.date] ? lerData(XLSX, linha[col.date]) : ''
    if (data) dataAtual = data
    const inicio = lerHora(linha[col.time])
    const descricao = String(col.description >= 0 ? linha[col.description] ?? '' : '')
    const notas = String(col.notes >= 0 ? linha[col.notes] ?? '' : '')
    const fim = lerFim(inicio, col.endTime >= 0 ? lerHora(linha[col.endTime]) : '')
    const pessoas = lerPessoas(descricao, notas)

    let nome = 'Cliente'
    if (col.name !== -1 && linha[col.name]) nome = String(linha[col.name])
    else if (descricao && !/^\d+x/.test(descricao)) nome = descricao.split('-')[0].trim()

    if (dataAtual && inicio && fim && pessoas > 0) {
      reservas.push({
        eventType: lerTipo(descricao, notas),
        datetime: `${dataAtual}T${inicio}`,
        adults: pessoas,
        children: 0,
        date: dataAtual,
        startTime: inicio,
        endTime: fim,
        people: pessoas,
        customerName: nome,
      })
    }
  }
  return { reservas, erro: reservas.length ? null : 'no_valid' }
}
