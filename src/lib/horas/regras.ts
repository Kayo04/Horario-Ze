// Regras da Gestão de Horas, partilhadas entre a página (browser) e a API.
// Não importar aqui nada que só funcione no servidor.

export const VALOR_HORA_CENTIMOS = 700 // 7 €/hora

// IDs do relógio NGTeco que NUNCA entram na gestão de horas (não são pagos à hora):
//   1 = Jose Marques (o chefe)
//   5 = Camila Marques (filha do chefe)
export const IDS_EXCLUIDOS: readonly number[] = [1, 5]
export const estaExcluido = (id: number) => IDS_EXCLUIDOS.includes(id)

export const ESTADOS = ['Completo', 'Por confirmar', 'Corrigido manualmente'] as const
export type Estado = (typeof ESTADOS)[number]

export interface Marcacao {
  key: string
  id: number          // ID do funcionário no relógio NGTeco
  name: string
  date: string        // "2026-10-02"
  start: string       // "10:02" ou "" se em falta
  end: string         // "15:03" ou "" se em falta
  minutes: number | null
  nextDay: boolean
  state: Estado
  revision: number    // 0 = sem correções
}

export interface Correcao {
  start: string
  end: string
  nextDay: boolean
  minutes: number
  state: 'Corrigido manualmente'
  revision: number
}

const RELOGIO = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const DATA = /^\d{4}-\d{2}-\d{2}$/

const paraMinutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3))

/** Valida uma correção pedida pelo utilizador e devolve os dados a guardar (ou null). */
export function validarCorrecao(input: any): Correcao | null {
  if (!input || !Number.isSafeInteger(input.revision) || input.revision < 0) return null
  if (typeof input.nextDay !== 'boolean') return null
  if (!RELOGIO.test(input.start) || !RELOGIO.test(input.end)) return null
  const duracao = paraMinutos(input.end) - paraMinutos(input.start) + (input.nextDay ? 1440 : 0)
  if (duracao <= 0 || duracao > 1440) return null
  return {
    start: input.start,
    end: input.end,
    nextDay: input.nextDay,
    minutes: duracao,
    state: 'Corrigido manualmente',
    revision: input.revision + 1,
  }
}

/** Chave estável de uma marcação, para as correções sobreviverem a reimportações. */
export const chaveMarcacao = (id: number, date: string, start: string) => `${id}-${date}-${start || 'sem-entrada'}`

// ---------------------------------------------------------------------------
// Importação do ficheiro exportado do relógio (CSV ou Excel)
// Colunas esperadas: ID; Funcionário; Data; Entrada; Saída; Duração (minutos); Estado
// ---------------------------------------------------------------------------

export interface LinhaImportada {
  id: number
  name: string
  date: string
  start: string
  end: string
  minutes: number | null
  state: Estado
}

const semAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const COLUNAS: Record<string, keyof LinhaImportada> = {
  id: 'id',
  funcionario: 'name',
  nome: 'name',
  data: 'date',
  entrada: 'start',
  saida: 'end',
  'duracao (minutos)': 'minutes',
  duracao: 'minutes',
  minutos: 'minutes',
  estado: 'state',
}

function normalizarData(valor: string): string {
  const v = valor.trim()
  if (DATA.test(v)) return v
  const pt = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/) // 02/10/2026
  if (pt) return `${pt[3]}-${pt[2].padStart(2, '0')}-${pt[1].padStart(2, '0')}`
  return ''
}

function normalizarHora(valor: string): string {
  const m = valor.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''
}

/**
 * Converte as linhas de um ficheiro (array de objetos por cabeçalho) em marcações.
 * Devolve as linhas válidas e os números das linhas com erro (para mostrar ao utilizador).
 */
export function lerLinhasImportadas(linhas: Record<string, unknown>[]): { validas: LinhaImportada[]; erros: number[] } {
  const validas: LinhaImportada[] = []
  const erros: number[] = []
  linhas.forEach((original, i) => {
    const linha: Partial<Record<keyof LinhaImportada, string>> = {}
    for (const [cabecalho, valor] of Object.entries(original)) {
      const campo = COLUNAS[semAcentos(cabecalho)]
      if (campo) linha[campo] = String(valor ?? '').trim()
    }
    const resultado = validarLinhaImportada(linha)
    if (resultado) validas.push(resultado)
    else if (Object.values(original).some(v => String(v ?? '').trim() !== '')) erros.push(i + 2) // +2: cabeçalho e base 1
  })
  return { validas, erros }
}

/** Valida uma linha já mapeada. Usada no browser e outra vez no servidor. */
export function validarLinhaImportada(linha: any): LinhaImportada | null {
  if (!linha) return null
  const id = Number(linha.id)
  const name = String(linha.name ?? '').trim().slice(0, 100)
  const date = normalizarData(String(linha.date ?? ''))
  const start = normalizarHora(String(linha.start ?? ''))
  const end = normalizarHora(String(linha.end ?? ''))
  if (!Number.isSafeInteger(id) || id < 0 || !name || !date) return null
  if (!start && !end) return null

  const textoMinutos = String(linha.minutes ?? '').trim()
  let minutes: number | null = textoMinutos === '' ? null : Number(textoMinutos)
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) return null
  if (!start || !end) minutes = null

  let state = ESTADOS.find(e => semAcentos(e) === semAcentos(String(linha.state ?? '')))
  if (!state) state = minutes === null ? 'Por confirmar' : 'Completo'
  if (minutes === null) state = 'Por confirmar'

  return { id, name, date, start, end, minutes, state }
}

// ---------------------------------------------------------------------------
// Relatório "Timecard Report" exportado pelo NGTeco Time
// ---------------------------------------------------------------------------
// O ficheiro tem um bloco por funcionário:
//
//   ,,,,Timecard Report,
//   Pay Period,,,01/10/2026-31/10/2026,
//   Employee,,,Matilde Osorio (2),
//   Date,,IN,OUT,Work Time, Daily Total, Note,
//   THU,01/10/2026,10:02 AM,03:03 PM,05:01,05:01,      <- 1.ª marcação do dia
//   ,,01:37 PM,04:55 PM,03:18,05:43,                   <- outra marcação no mesmo dia
//   SAT,03/10/2026,08:37 AM,,,,Missing OUT             <- falta a saída
//   FRI,02/10/2026,                                    <- dia sem marcações
//   Total Hours,,,,,90:01,
//
// As horas vêm em formato 12h (AM/PM) e a "Work Time" em HH:MM.

/** true se o texto parece um relatório do NGTeco Time (e não o CSV simples). */
export const eRelatorioNGTeco = (texto: string) => /^Employee,/m.test(texto) && /Timecard Report|Pay Period/.test(texto)

/** "07:51 AM" -> "07:51", "12:20 PM" -> "12:20", "12:05 AM" -> "00:05" */
function hora12para24(valor: string): string | null {
  const m = valor.trim().match(/^(\d{1,2}):(\d{2})\s*([AP])M$/i)
  if (!m) return null
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'P' ? 12 : 0)
  if (h > 23 || Number(m[2]) > 59) return null
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

/** "04:51" -> 291 */
function duracaoParaMinutos(valor: string): number | null {
  const m = valor.trim().match(/^(\d{1,3}):(\d{2})$/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

export interface ResultadoRelatorio {
  validas: LinhaImportada[]
  erros: number[]                       // números das linhas que não se perceberam
  totais: Record<string, number>        // "Total Hours" de cada funcionário (minutos), por ID
}

/** Lê o "Timecard Report" do NGTeco Time e devolve uma marcação por cada par entrada/saída. */
export function lerRelatorioNGTeco(texto: string): ResultadoRelatorio {
  const validas: LinhaImportada[] = []
  const erros: number[] = []
  const totais: Record<string, number> = {}
  let funcionario: { id: number; name: string } | null = null
  let data = ''

  texto.replace(/^﻿/, '').split(/\r?\n/).forEach((linha, i) => {
    const numero = i + 1
    const c = linha.split(',').map(v => v.trim())
    if (c.every(v => v === '')) return

    if (c[0] === 'Employee') {
      // "Miguel  Santos  (12)" -> nome "Miguel Santos", ID 12
      const m = c.slice(1).join(' ').match(/^\s*(.+?)\s*\((\d+)\)\s*$/)
      funcionario = m ? { id: Number(m[2]), name: m[1].replace(/\s+/g, ' ') } : null
      if (!m) erros.push(numero)
      data = ''
      return
    }
    if (c[0] === 'Total Hours') {
      const total = duracaoParaMinutos(c[5] ?? '')
      if (funcionario && total != null) totais[String(funcionario.id)] = total
      funcionario = null
      return
    }
    if (c[0] === 'Pay Period' || c[0] === 'Date' || c[4] === 'Timecard Report') return
    if (!funcionario) return

    // Linha de dia ("THU,01/10/2026,...") ou continuação do mesmo dia (",,01:37 PM,...")
    if (c[0] !== '') {
      const d = c[1]?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      if (!d) { erros.push(numero); return }
      data = `${d[3]}-${d[2]}-${d[1]}`
    } else if (!data) {
      erros.push(numero)
      return
    }

    const entradaTexto = c[2] ?? ''
    const saidaTexto = c[3] ?? ''
    if (!entradaTexto && !saidaTexto) return // dia sem marcações

    const start = entradaTexto ? hora12para24(entradaTexto) : ''
    const end = saidaTexto ? hora12para24(saidaTexto) : ''
    if (start === null || end === null) { erros.push(numero); return }

    let minutes: number | null = null
    if (start && end) {
      minutes = duracaoParaMinutos(c[4] ?? '')
      if (minutes == null) {
        // Sem "Work Time": calcula pela diferença (saída depois da meia-noite conta como dia seguinte)
        const diff = paraMinutos(end) - paraMinutos(start)
        minutes = diff >= 0 ? diff : diff + 1440
      }
    }

    validas.push({
      id: funcionario.id,
      name: funcionario.name,
      date: data,
      start,
      end,
      minutes,
      state: minutes == null ? 'Por confirmar' : 'Completo',
    })
  })

  return { validas, erros, totais }
}

// ---------------------------------------------------------------------------
// Livro de ponto (Excel escrito pelos funcionários) - para comparar com o relógio
// ---------------------------------------------------------------------------

export interface DiaLivro {
  date: string                 // "2026-10-04"
  periods: [string, string][]  // [["15:00","19:05"]]
  minutes: number
}

export interface MesLivro {
  month: string                // "2026-10"
  name: string                 // nome escrito no livro
  days: DiaLivro[]
  total: number                // minutos
}

/** Horas do livro de ponto de um funcionário, como a API as devolve. */
export interface LivroFuncionario {
  employeeName: string
  livroName: string
  total: number
  days: DiaLivro[]
}

/** Normaliza um nome para comparar ("Inês  Paquete" -> "ines paquete"). */
export const normalizarNome = (s: string) => semAcentos(s).replace(/\s+/g, ' ')

/**
 * Sugere o funcionário do relógio para um nome do livro de ponto.
 * Os livros usam nomes completos ("Miguel Marques Santos") e o relógio nomes curtos
 * ("Miguel Santos"): é o mesmo se todas as palavras do nome do relógio estiverem no do livro.
 */
export function sugerirFuncionario(livroName: string, pessoas: [number, string][]): number | null {
  const palavrasLivro = new Set(normalizarNome(livroName).split(' '))
  const candidatos = pessoas.filter(([, nome]) => {
    const palavras = normalizarNome(nome).split(' ').filter(Boolean)
    return palavras.length > 0 && palavras.every(p => palavrasLivro.has(p))
  })
  return candidatos.length === 1 ? candidatos[0][0] : null
}

/** Valida o pedido de importação de um livro de ponto (no servidor). Devolve os dias limpos ou null. */
export function validarLivro(input: any): { month: string; employeeId: number; days: DiaLivro[]; total: number } | null {
  if (!input || typeof input.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) return null
  const employeeId = Number(input.employeeId)
  if (!Number.isSafeInteger(employeeId) || employeeId < 0 || estaExcluido(employeeId)) return null
  if (!Array.isArray(input.days) || input.days.length > 31) return null

  const days: DiaLivro[] = []
  const vistos = new Set<string>()
  for (const d of input.days) {
    if (!d || typeof d.date !== 'string' || !DATA.test(d.date) || !d.date.startsWith(input.month) || vistos.has(d.date)) return null
    if (!Array.isArray(d.periods) || d.periods.length === 0 || d.periods.length > 4) return null
    vistos.add(d.date)
    let minutes = 0
    const periods: [string, string][] = []
    for (const p of d.periods) {
      if (!Array.isArray(p) || !RELOGIO.test(p[0]) || !RELOGIO.test(p[1])) return null
      const duracao = paraMinutos(p[1]) - paraMinutos(p[0])
      if (duracao <= 0) return null
      periods.push([p[0], p[1]])
      minutes += duracao // recalculado no servidor, não confiar no browser
    }
    days.push({ date: d.date, periods, minutes })
  }
  days.sort((a, b) => a.date.localeCompare(b.date))
  return { month: input.month, employeeId, days, total: days.reduce((n, d) => n + d.minutes, 0) }
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

export const formatarHoras = (m: number | null, porConfirmar = 'Por confirmar') =>
  m == null ? porConfirmar : (m < 0 ? '−' : '') + Math.floor(Math.abs(m) / 60) + 'h ' + String(Math.abs(m) % 60).padStart(2, '0') + 'm'

export const dataPT = (d: string) => d.split('-').reverse().join('/')

/** Segunda-feira da semana de uma data ("2026-10-08" -> "2026-10-05"). */
export function segundaFeira(date: string): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export const centimosAPagar = (minutos: number) => Math.round((minutos * VALOR_HORA_CENTIMOS) / 60)
