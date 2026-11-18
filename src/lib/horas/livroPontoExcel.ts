// Leitura do "Livro de Ponto The Park" (Excel preenchido à mão pelos funcionários).
//
// Estrutura de cada folha mensal (Janeiro ... Dezembro):
//   B12 "Funcionário"  C12 <nome>               M12 <1.º dia do mês (data)>
//   B16 "Data" | C Entrada | D Saída | E Entrada | F Saída | ... (2 períodos por dia)
//   B17..B47  um dia por linha (pode passar para o mês seguinte, ex. Fevereiro tem 1-3 Março)
//   B48 "TOTAL H"
//
// O mês é lido da data dentro da folha (M12), NUNCA do nome da folha.
// Só contam os dias que pertencem a esse mês.
// Ficheiro só para o browser: recebe o módulo xlsx já carregado.

import type * as XLSXTipo from 'xlsx'
import type { DiaLivro, MesLivro } from './regras'

type XLSX = typeof XLSXTipo
type Folha = XLSXTipo.WorkSheet

const texto = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Valor de uma célula de hora -> "HH:MM" (ou "" se vazia / 0:00). */
function hora(celula: XLSXTipo.CellObject | undefined): string {
  const v = celula?.v
  if (typeof v === 'number') {
    const minutos = Math.round((v - Math.floor(v)) * 1440) % 1440
    if (minutos === 0) return '' // 0:00 = não preenchido no livro
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
  }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2}):(\d{2})/)
    if (m && !(Number(m[1]) === 0 && Number(m[2]) === 0)) return `${m[1].padStart(2, '0')}:${m[2]}`
  }
  return ''
}

function dataISO(XLSX: XLSX, v: unknown): string {
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return ''
}

const minutosEntre = (a: string, b: string) =>
  Number(b.slice(0, 2)) * 60 + Number(b.slice(3)) - (Number(a.slice(0, 2)) * 60 + Number(a.slice(3)))

function lerFolha(XLSX: XLSX, folha: Folha): MesLivro | null {
  const intervalo = XLSX.utils.decode_range(folha['!ref'] ?? 'A1:A1')
  const ultima = Math.min(intervalo.e.r + 1, 200)

  // Procura a linha "Funcionário" (nome em C, data do mês em M) e a linha de cabeçalho "Data"
  let linhaNome = 0
  let linhaCabecalho = 0
  for (let r = 1; r <= ultima; r++) {
    const b = texto(folha['B' + r]?.v)
    if (!linhaNome && b === 'funcionario') linhaNome = r
    if (!linhaCabecalho && b === 'data') linhaCabecalho = r
  }
  if (!linhaNome || !linhaCabecalho) return null

  const inicioMes = dataISO(XLSX, folha['M' + linhaNome]?.v)
  if (!inicioMes) return null
  const month = inicioMes.slice(0, 7)
  const name = String(folha['C' + linhaNome]?.v ?? '').replace(/\s+/g, ' ').trim()

  const days: DiaLivro[] = []
  for (let r = linhaCabecalho + 1; r <= ultima; r++) {
    const b = folha['B' + r]?.v
    if (typeof b === 'string' && texto(b).startsWith('total')) break
    const date = dataISO(XLSX, b)
    if (!date || !date.startsWith(month)) continue // dias do mês seguinte no fim da folha

    const [c, d, e, f] = ['C', 'D', 'E', 'F'].map(col => hora(folha[col + r]))
    // Normalmente: C-D = 1.º período, E-F = 2.º período.
    // Mas há quem escreva só a entrada em C e a saída em F (ex. 9:30 | 0:00 | 0:00 | 15:00):
    // nesse caso é um período único C-F.
    const pares: [string, string][] = c && !d && !e && f ? [[c, f]] : [[c, d], [e, f]]

    const periods: [string, string][] = []
    let minutes = 0
    for (const [entrada, saida] of pares) {
      if (!entrada || !saida) continue
      const duracao = minutosEntre(entrada, saida)
      if (duracao <= 0) continue // igual ao livro: só conta se a saída for depois da entrada
      periods.push([entrada, saida])
      minutes += duracao
    }
    if (periods.length) days.push({ date, periods, minutes })
  }

  return { month, name, days, total: days.reduce((n, d) => n + d.minutes, 0) }
}

/** Lê todas as folhas mensais de um livro de ponto. Devolve só os meses com horas. */
export function lerLivroPonto(XLSX: XLSX, dados: ArrayBuffer): MesLivro[] {
  const livro = XLSX.read(dados)
  const meses: MesLivro[] = []
  for (const nome of livro.SheetNames) {
    const mes = lerFolha(XLSX, livro.Sheets[nome])
    if (mes && mes.total > 0 && !meses.some(m => m.month === mes.month)) meses.push(mes)
  }
  return meses.sort((a, b) => a.month.localeCompare(b.month))
}
