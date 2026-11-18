// Regras da Gestão de Horas, partilhadas entre a página (browser) e a API.
// Não importar aqui nada que só funcione no servidor.

export const VALOR_HORA_CENTIMOS = 700 // 7 €/hora

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
