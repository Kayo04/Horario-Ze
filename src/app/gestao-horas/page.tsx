'use client'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TableCellsIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import {
  ESTADOS,
  type Marcacao,
  formatarHoras,
  dataPT,
  segundaFeira,
  centimosAPagar,
  lerLinhasImportadas,
  lerRelatorioNGTeco,
  eRelatorioNGTeco,
  estaExcluido,
  normalizarNome,
  sugerirFuncionario,
  type LivroFuncionario,
  type MesLivro,
} from '@/lib/horas/regras'
import { lerLivroPonto } from '@/lib/horas/livroPontoExcel'

type Comparacao = Record<string, Record<string, number | null>>
type Livros = Record<string, Record<string, LivroFuncionario>>

// Um ficheiro de livro de ponto escolhido na janela de importação
interface FicheiroLivro {
  fileName: string
  meses: MesLivro[]
  employeeId: string // "" = ainda não escolhido
  erro: boolean      // não parece um livro de ponto
}

interface Grupo {
  id: number
  name: string
  minutes: number
  missing: number
  cents: number
}

const euro = (valor: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor)

export default function GestaoHorasPage() {
  const { language } = useLanguage()
  const t = translations[language]
  const locale = language === 'pt' ? 'pt-PT' : 'en-GB'
  const estadoTexto = (estado: string) => (t as any)[`hm_state_${estado}`] ?? estado
  const horas = (m: number | null) => formatarHoras(m, (t as any)['hm_state_Por confirmar'])

  const [records, setRecords] = useState<Marcacao[]>([])
  const [comparison, setComparison] = useState<Comparacao>({})
  const [livros, setLivros] = useState<Livros>({})
  const [nomesLivro, setNomesLivro] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Filtros
  const [month, setMonth] = useState('')
  const [week, setWeek] = useState('')
  const [person, setPerson] = useState('')
  const [status, setStatus] = useState('')
  const [aberto, setAberto] = useState<number | null>(null) // funcionário com o dia a dia aberto na conferência

  // Correção
  const [editing, setEditing] = useState<Marcacao | null>(null)
  const [form, setForm] = useState({ start: '', end: '', nextDay: false })
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/horas', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados.')
      setRecords(data.records)
      setComparison(data.comparison)
      setLivros(data.livros ?? {})
      setNomesLivro(data.nomesLivro ?? {})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // --- Importar o ficheiro exportado do relógio (CSV ou Excel) ---
  const [importing, setImporting] = useState(false)

  // Aceita dois formatos (deteta sozinho):
  //  1. "Timecard Report" exportado pelo NGTeco Time (CSV ou Excel) - o normal
  //  2. CSV/Excel simples com colunas ID; Funcionário; Data; Entrada; Saída; ... (site antigo)
  const lerFicheiro = async (ficheiro: File) => {
    if (/\.csv$/i.test(ficheiro.name)) {
      const texto = (await ficheiro.text()).replace(/^﻿/, '')
      if (eRelatorioNGTeco(texto)) return lerRelatorioNGTeco(texto)
      const Papa = (await import('papaparse')).default
      return lerLinhasImportadas(Papa.parse<Record<string, unknown>>(texto, { header: true, skipEmptyLines: true }).data)
    }
    const XLSX = await import('xlsx')
    const livro = XLSX.read(await ficheiro.arrayBuffer(), { cellDates: true })
    const folha = livro.Sheets[livro.SheetNames[0]]
    const comoTexto = XLSX.utils.sheet_to_csv(folha, { blankrows: true })
    if (eRelatorioNGTeco(comoTexto)) return lerRelatorioNGTeco(comoTexto)
    return lerLinhasImportadas(XLSX.utils.sheet_to_json<Record<string, unknown>>(folha, { raw: false, defval: '', dateNF: 'yyyy-mm-dd' }))
  }

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ficheiro = e.target.files?.[0]
    e.target.value = '' // permite voltar a escolher o mesmo ficheiro
    if (!ficheiro) return
    setImporting(true)
    setMessage('')
    setError('')
    try {
      const lido = await lerFicheiro(ficheiro)
      const erros = lido.erros
      const validas = lido.validas.filter(l => !estaExcluido(l.id)) // o chefe e a filha não entram
      if (erros.length) throw new Error(t.hm_import_errors.replace('{lines}', erros.slice(0, 10).join(', ') + (erros.length > 10 ? '…' : '')))
      if (!validas.length) throw new Error(t.hm_import_empty)
      const res = await fetch('/api/horas/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage(
        t.hm_import_done
          .replace('{total}', String(data.total))
          .replace('{new}', String(data.novas))
          .replace('{updated}', String(data.atualizadas)),
      )
      await carregar()
      // Abre o separador do mês que acabou de ser importado (o mais recente do ficheiro).
      // Só depois de carregar, para o mês novo já existir na lista de separadores.
      const mesImportado = validas.map(l => l.date.slice(0, 7)).sort().pop()
      if (mesImportado) {
        setMonth(mesImportado)
        setWeek('')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  // --- Opções dos filtros ---
  // Todos os meses com marcações do relógio OU livros de ponto (para ver e mexer em meses antigos)
  const meses = useMemo(
    () => Array.from(new Set([...records.map(r => r.date.slice(0, 7)), ...Object.keys(livros)])).sort().reverse(),
    [records, livros],
  )

  // Escolher automaticamente o mês mais recente
  useEffect(() => {
    if (meses.length && !meses.includes(month)) {
      setMonth(meses[0])
      setWeek('')
    }
  }, [meses, month])

  const semanas = useMemo(() => {
    const datas = [
      ...records.filter(r => r.date.startsWith(month)).map(r => r.date),
      ...Object.values(livros[month] ?? {}).flatMap(l => l.days.map(d => d.date)),
    ]
    return Array.from(new Set(datas.map(segundaFeira))).sort()
  }, [records, livros, month])

  const pessoas = useMemo(
    () =>
      Array.from(new Map(records.map(r => [r.id, r.name])).entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt')),
    [records],
  )

  // --- Importar livros de ponto (Excel escrito pelos funcionários) ---
  const [livroFicheiros, setLivroFicheiros] = useState<FicheiroLivro[] | null>(null) // null = janela fechada
  const [livroMes, setLivroMes] = useState('')
  const [livroLendo, setLivroLendo] = useState(false)
  const [livroGuardando, setLivroGuardando] = useState(false)
  const [livroErro, setLivroErro] = useState('')

  const mesesNosLivros = useMemo(
    () => Array.from(new Set((livroFicheiros ?? []).flatMap(f => f.meses.map(m => m.month)))).sort().reverse(),
    [livroFicheiros],
  )

  const abrirLivros = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ficheiros = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!ficheiros.length) return
    setLivroLendo(true)
    setMessage('')
    setError('')
    try {
      const XLSX = await import('xlsx')
      const lidos: FicheiroLivro[] = []
      for (const f of ficheiros) {
        let meses: MesLivro[] = []
        try {
          meses = lerLivroPonto(XLSX, await f.arrayBuffer())
        } catch {
          meses = []
        }
        // Nome escrito no livro (o mais recente que estiver preenchido)
        const nome = [...meses].reverse().find(m => m.name)?.name ?? ''
        // 1.º a escolha feita numa importação anterior, 2.º um nome parecido no relógio
        const conhecido = nome ? nomesLivro[normalizarNome(nome)] : undefined
        const sugerido = conhecido ?? (nome ? sugerirFuncionario(nome, pessoas) : null)
        lidos.push({
          fileName: f.name,
          meses,
          employeeId: sugerido != null && !estaExcluido(sugerido) ? String(sugerido) : '',
          erro: meses.length === 0,
        })
      }
      const todosMeses = Array.from(new Set(lidos.flatMap(f => f.meses.map(m => m.month)))).sort().reverse()
      // Por defeito compara o mês que está aberto na página (se existir nos livros)
      setLivroMes(todosMeses.includes(month) ? month : todosMeses[0] ?? '')
      setLivroErro('')
      setLivroFicheiros(lidos)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLivroLendo(false)
    }
  }

  const livrosParaImportar = (livroFicheiros ?? [])
    .map(f => ({ f, mes: f.meses.find(m => m.month === livroMes) }))
    .filter(x => x.mes && x.f.employeeId !== '')

  const importarLivros = async () => {
    const ids = livrosParaImportar.map(x => x.f.employeeId)
    if (new Set(ids).size !== ids.length) {
      setLivroErro(t.hm_book_duplicate)
      return
    }
    setLivroGuardando(true)
    setLivroErro('')
    try {
      const res = await fetch('/api/horas/livro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          livros: livrosParaImportar.map(({ f, mes }) => ({
            month: livroMes,
            employeeId: Number(f.employeeId),
            employeeName: pessoas.find(([id]) => String(id) === f.employeeId)?.[1] ?? '',
            livroName: mes!.name,
            fileName: f.fileName,
            days: mes!.days,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLivroFicheiros(null)
      setMessage(t.hm_book_done.replace('{n}', String(data.total)).replace('{month}', nomeMes(livroMes)))
      await carregar()
      setMonth(livroMes) // abre o separador do mês importado
      setWeek('')
    } catch (err: any) {
      setLivroErro(err.message)
    } finally {
      setLivroGuardando(false)
    }
  }

  const nomeMes = (m: string) =>
    new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(m + '-01T00:00:00Z'))

  // --- Dados filtrados ---
  const mensais = useMemo(
    () => records.filter(r => r.date.startsWith(month) && (!person || String(r.id) === person)),
    [records, month, person],
  )
  const selecionadas = useMemo(
    () => mensais.filter(r => !week || segundaFeira(r.date) === week),
    [mensais, week],
  )

  const grupos: Grupo[] = useMemo(() => {
    const mapa = new Map<number, Grupo>()
    for (const r of mensais) if (!mapa.has(r.id)) mapa.set(r.id, { id: r.id, name: r.name, minutes: 0, missing: 0, cents: 0 })
    for (const r of selecionadas) {
      const g = mapa.get(r.id)!
      g.minutes += r.minutes ?? 0
      if (r.minutes == null) g.missing++
    }
    const lista = Array.from(mapa.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    for (const g of lista) g.cents = centimosAPagar(g.minutes)
    return lista
  }, [mensais, selecionadas])

  const visiveis = selecionadas.filter(r => !status || r.state === status)
  const totalMinutos = grupos.reduce((n, g) => n + g.minutes, 0)
  const totalCentimos = grupos.reduce((n, g) => n + g.cents, 0)
  const totalPendentes = grupos.reduce((n, g) => n + g.missing, 0)
  // --- Conferência relógio vs. livro de ponto ---
  // Usa os livros importados (dia a dia, por isso funciona também por semana).
  // Se não houver livro importado, usa os totais antigos do site do chefe (só mês inteiro).
  const naSemana = (date: string) => !week || segundaFeira(date) === week
  const livrosMes = livros[month] ?? {}
  const legado = !week ? comparison[month] ?? {} : {}

  const idsConferencia = new Set<number>(grupos.map(g => g.id))
  for (const id of Object.keys(livrosMes)) if (!person || id === person) idsConferencia.add(Number(id))
  const linhasConferencia = Array.from(idsConferencia)
      .map(id => {
        const g = grupos.find(x => x.id === id)
        const livro = livrosMes[String(id)]
        const book = livro
          ? livro.days.filter(d => naSemana(d.date)).reduce((n, d) => n + d.minutes, 0)
          : legado[String(id)] !== undefined ? legado[String(id)] : null
        return { id, name: g?.name ?? livro?.employeeName ?? String(id), clock: g?.minutes ?? 0, missing: g?.missing ?? 0, book, livro }
      })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'))

  const temConferencia = linhasConferencia.some(l => l.book != null)

  /** Dia a dia de um funcionário: o que o relógio registou vs. o que escreveu no livro. */
  const diaADia = (id: number, livro?: LivroFuncionario) => {
    const doRelogio = selecionadas.filter(r => r.id === id)
    const diasLivro = (livro?.days ?? []).filter(d => naSemana(d.date))
    const datas = Array.from(new Set([...doRelogio.map(r => r.date), ...diasLivro.map(d => d.date)])).sort()
    return datas.map(date => {
      const marcacoes = doRelogio.filter(r => r.date === date)
      const dia = diasLivro.find(d => d.date === date)
      const relogio = marcacoes.reduce((n, r) => n + (r.minutes ?? 0), 0)
      const escrito = dia?.minutes ?? 0
      return {
        date,
        marcacoes,
        porConfirmar: marcacoes.some(r => r.minutes == null),
        relogio,
        dia,
        diff: relogio - escrito,
      }
    })
  }

  const apagarLivro = async (id: number, nome: string) => {
    if (!confirm(t.hm_book_delete_confirm.replace('{name}', nome).replace('{month}', nomeMes(month)))) return
    const res = await fetch(`/api/horas/livro?month=${month}&employeeId=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError((await res.json()).error)
      return
    }
    setAberto(null)
    await carregar()
  }

  // Diferença = relógio − livro. Com "+" (relógio tem mais horas) fica a vermelho, com "−" fica a verde.
  const corDiferenca = (diff: number) =>
    diff > 0 ? 'text-red-600 font-semibold' : diff < 0 ? 'text-emerald-600 font-semibold' : 'text-gray-700'
  const fundoDiferenca = (diff: number) =>
    diff >= 15 ? 'bg-red-50/60' : diff <= -15 ? 'bg-emerald-50/60' : ''

  const datasMes = mensais.map(r => r.date).sort()
  const intervalo = datasMes.length ? `${dataPT(datasMes[0])} – ${dataPT(datasMes[datasMes.length - 1])}` : ''

  // --- Exportar Excel (folhas Resumo e Marcações, como no site antigo) ---
  const exportarExcel = async () => {
    const XLSX = await import('xlsx')
    const resumo = [
      ['Funcionário', 'ID', 'Mês', 'Semana (início)', 'Horas', 'Horas decimais', 'Minutos', 'Turnos por confirmar', 'Valor (€)'],
      ...grupos.map(g => [g.name, g.id, month, week, formatarHoras(g.minutes), g.minutes / 60, g.minutes, g.missing, g.cents / 100]),
    ]
    const marcacoes = [
      ['Funcionário', 'ID', 'Data', 'Entrada', 'Saída', 'Dia seguinte', 'Minutos', 'Estado'],
      ...selecionadas.map(r => [r.name, r.id, r.date, r.start, r.end, r.nextDay ? 'Sim' : 'Não', r.minutes, r.state]),
    ]
    const livro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(resumo), 'Resumo')
    XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(marcacoes), 'Marcações')
    XLSX.writeFile(livro, `horas-funcionarios-${month}${week ? '-semana-' + week : ''}.xlsx`)
  }

  // --- Correção de marcações ---
  const abrirCorrecao = (r: Marcacao) => {
    setEditing(r)
    setForm({ start: r.start, end: r.end, nextDay: r.nextDay })
    setEditError('')
  }

  const guardarCorrecao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setEditError('')
    try {
      const res = await fetch('/api/horas/correcao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editing.key, revision: editing.revision, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecords(rs => rs.map(r => (r.key === data.row.key ? { ...r, ...data.row } : r)))
      setEditing(null)
    } catch (err: any) {
      setEditError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const corEstado = (estado: string) =>
    estado === 'Por confirmar'
      ? 'bg-amber-100 text-amber-800'
      : estado === 'Corrigido manualmente'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-emerald-100 text-emerald-800'

  const selectClass =
    'mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const th = 'text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap'
  const td = 'px-4 py-3 whitespace-nowrap'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-lg">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">{t.hm_title}</h1>
            <p className="text-gray-600 mt-1">{t.hm_subtitle}</p>
          </div>
          <Link
            href="/portal"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            {t.hm_back}
          </Link>
        </header>

        {/* Separadores dos meses: cada mês importado tem a sua própria parte */}
        {meses.length > 0 && (
          <nav className="bg-white p-2 rounded-xl shadow-lg flex gap-2 overflow-x-auto" aria-label={t.hm_month}>
            {[...meses].reverse().map(m => {
              const ativo = m === month
              const temRelogio = records.some(r => r.date.startsWith(m))
              const nLivros = Object.keys(livros[m] ?? {}).length
              return (
                <button
                  key={m}
                  onClick={() => { setMonth(m); setWeek(''); setAberto(null) }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-left transition ${
                    ativo ? 'bg-emerald-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="block font-semibold capitalize">{nomeMes(m)}</span>
                  <span className={`block text-xs ${ativo ? 'text-emerald-100' : 'text-gray-500'}`}>
                    {[temRelogio && t.hm_tab_clock, nLivros > 0 && t.hm_tab_books.replace('{n}', String(nLivros))]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              )
            })}
          </nav>
        )}

        {/* Filtros e ações */}
        <section className="bg-white p-6 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold text-gray-700">
              {t.hm_week}
              <select className={selectClass} value={week} onChange={e => setWeek(e.target.value)}>
                <option value="">{t.hm_all_weeks}</option>
                {semanas.map(s => (
                  <option key={s} value={s}>{t.hm_week_of.replace('{date}', dataPT(s))}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              {t.hm_employee}
              <select className={selectClass} value={person} onChange={e => setPerson(e.target.value)}>
                <option value="">{t.hm_all_team}</option>
                {pessoas.map(([id, name]) => (
                  <option key={id} value={String(id)}>{name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={carregar}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-60 transition"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              {t.hm_refresh}
            </button>
            <label
              className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition cursor-pointer ${importing ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              {importing ? t.hm_importing : t.hm_import}
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importar} disabled={importing} />
            </label>
            <label
              className={`flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition cursor-pointer ${livroLendo ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <TableCellsIcon className="h-5 w-5" />
              {livroLendo ? t.hm_book_reading : t.hm_import_book}
              {/* multiple: o chefe pode escolher os livros de todos os funcionários de uma vez */}
              <input type="file" accept=".xlsx,.xls,.xlsm" multiple className="hidden" onChange={abrirLivros} disabled={livroLendo} />
            </label>
            <button
              onClick={exportarExcel}
              disabled={!selecionadas.length}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {t.hm_export}
            </button>
            {intervalo && <span className="text-sm text-gray-500 ml-auto">{intervalo}</span>}
          </div>
          {message && <p className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
        </section>

        {loading && records.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : records.length === 0 && Object.keys(livros).length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow-lg text-center text-gray-600">{t.hm_empty}</div>
        ) : (
          <>
            {/* KPIs */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                [t.hm_kpi_hours, horas(totalMinutos)],
                [t.hm_kpi_pay, euro(totalCentimos / 100)],
                [t.hm_kpi_pending, String(totalPendentes)],
              ].map(([label, valor]) => (
                <div key={label} className="bg-white p-5 rounded-xl shadow-lg">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{valor}</p>
                </div>
              ))}
            </section>

            {/* Resumo por funcionário */}
            <section className="bg-white rounded-xl shadow-lg overflow-hidden">
              <h2 className="text-xl font-bold text-gray-800 px-6 pt-6 pb-4">{t.hm_summary}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={th}>{t.hm_employee}</th>
                      <th className={th}>{t.hm_col_clock}</th>
                      <th className={th}>{t.hm_col_pay}</th>
                      <th className={th}>{t.hm_col_pending}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {grupos.map(g => (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className={`${td} font-medium text-gray-900`}>{g.name}</td>
                        <td className={td}>{horas(g.minutes)}</td>
                        <td className={td}>{euro(g.cents / 100)}</td>
                        <td className={td}>{g.missing || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Conferência com o livro de ponto */}
            <section className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {t.hm_comparison} · <span className="capitalize">{month && nomeMes(month)}</span>
                  {week && <span className="text-gray-500 font-normal text-base"> · {t.hm_week_of.replace('{date}', dataPT(week))}</span>}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{temConferencia ? t.hm_comparison_desc : t.hm_comparison_empty}</p>
              </div>
              {temConferencia && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={th}>{t.hm_employee}</th>
                        <th className={th}>{t.hm_col_clock}</th>
                        <th className={th}>{t.hm_col_book}</th>
                        <th className={th}>{t.hm_col_diff}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {linhasConferencia.map(l => {
                        const parcial = l.missing ? ` · ${t.hm_partial}` : ''
                        const diff = l.book == null ? null : l.clock - l.book
                        const estaAberto = aberto === l.id && !!l.livro
                        return (
                          <Fragment key={l.id}>
                            <tr
                              className={`${l.livro ? 'cursor-pointer' : ''} ${estaAberto ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                              onClick={() => l.livro && setAberto(estaAberto ? null : l.id)}
                            >
                              <td className={`${td} font-medium text-gray-900`}>
                                {l.livro && <span className="inline-block w-4 text-gray-400">{estaAberto ? '▾' : '▸'}</span>}
                                {l.name}
                              </td>
                              <td className={td}>{horas(l.clock) + parcial}</td>
                              <td className={td}>{l.book == null ? t.hm_not_filled : horas(l.book)}</td>
                              <td className={`${td} ${diff == null ? '' : corDiferenca(diff)}`}>
                                {diff == null ? '—' : (diff > 0 ? '+' : '') + horas(diff) + parcial}
                              </td>
                            </tr>
                            {estaAberto && (
                              <tr>
                                <td colSpan={4} className="bg-violet-50/50 px-4 pb-4">
                                  <div className="flex justify-between items-center py-2">
                                    <p className="text-sm font-semibold text-gray-700">
                                      {t.hm_day_detail}
                                      {l.livro!.livroName && <span className="font-normal text-gray-500"> · {t.hm_book_name}: {l.livro!.livroName}</span>}
                                    </p>
                                    <button
                                      onClick={() => apagarLivro(l.id, l.name)}
                                      className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                                    >
                                      {t.hm_book_delete}
                                    </button>
                                  </div>
                                  <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className={th}>{t.hm_col_date}</th>
                                        <th className={th}>{t.hm_col_clock_short}</th>
                                        <th className={th}>{t.hm_col_book}</th>
                                        <th className={th}>{t.hm_col_diff}</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {diaADia(l.id, l.livro).map(d => (
                                        <tr key={d.date} className={fundoDiferenca(d.diff)}>
                                          <td className={td}>{dataPT(d.date)}</td>
                                          <td className={td}>
                                            {d.marcacoes.length === 0 ? (
                                              <span className="text-gray-400">—</span>
                                            ) : (
                                              <>
                                                <span className="text-gray-500">
                                                  {d.marcacoes.map(r => `${r.start || '?'}–${r.end || '?'}`).join(', ')}
                                                </span>{' '}
                                                <b>{horas(d.relogio)}</b>
                                                {d.porConfirmar && <span className="text-amber-600"> · {t.hm_partial}</span>}
                                              </>
                                            )}
                                          </td>
                                          <td className={td}>
                                            {d.dia ? (
                                              <>
                                                <span className="text-gray-500">{d.dia.periods.map(p => p.join('–')).join(', ')}</span>{' '}
                                                <b>{horas(d.dia.minutes)}</b>
                                              </>
                                            ) : (
                                              <span className="text-gray-400">—</span>
                                            )}
                                          </td>
                                          <td className={`${td} ${corDiferenca(d.diff)}`}>
                                            {d.diff === 0 ? '✓' : (d.diff > 0 ? '+' : '') + horas(d.diff)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Entradas e saídas */}
            <section className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{t.hm_entries}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {t.hm_count.replace('{shown}', String(visiveis.length)).replace('{total}', String(selecionadas.length))}
                  </p>
                </div>
                <label className="text-sm font-semibold text-gray-700 sm:w-64">
                  {t.hm_show}
                  <select className={selectClass} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">{t.hm_all_entries}</option>
                    {ESTADOS.map(s => (
                      <option key={s} value={s}>{estadoTexto(s)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={th}>{t.hm_employee}</th>
                      <th className={th}>{t.hm_col_date}</th>
                      <th className={th}>{t.hm_col_in}</th>
                      <th className={th}>{t.hm_col_out}</th>
                      <th className={th}>{t.hm_col_duration}</th>
                      <th className={th}>{t.hm_col_state}</th>
                      <th className={th}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visiveis.map(r => (
                      <tr key={r.key} className="hover:bg-gray-50">
                        <td className={`${td} font-medium text-gray-900`}>{r.name}</td>
                        <td className={td}>{dataPT(r.date)}</td>
                        <td className={td}>{r.start || <span className="text-red-600">{t.hm_missing}</span>}</td>
                        <td className={td}>
                          {r.end || <span className="text-red-600">{t.hm_missing}</span>}
                          {r.nextDay && <span className="text-gray-500"> {t.hm_next_day}</span>}
                        </td>
                        <td className={td}>{horas(r.minutes)}</td>
                        <td className={td}>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${corEstado(r.state)}`}>
                            {estadoTexto(r.state)}
                          </span>
                        </td>
                        <td className={td}>
                          <button
                            onClick={() => abrirCorrecao(r)}
                            className="flex items-center gap-1 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            {t.hm_fix}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Janela de importação dos livros de ponto */}
      {livroFicheiros && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setLivroFicheiros(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.hm_book_title}</h2>
                <p className="text-sm text-gray-500 mt-1">{t.hm_book_hint}</p>
              </div>
              <button type="button" onClick={() => setLivroFicheiros(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <label className="block text-sm font-semibold text-gray-700 sm:w-72">
              {t.hm_book_month}
              <select className={selectClass} value={livroMes} onChange={e => setLivroMes(e.target.value)}>
                {mesesNosLivros.map(m => (
                  <option key={m} value={m}>{nomeMes(m)}</option>
                ))}
              </select>
            </label>

            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={th}>{t.hm_book_file}</th>
                    <th className={th}>{t.hm_book_name}</th>
                    <th className={th}>{t.hm_book_hours}</th>
                    <th className={th}>{t.hm_book_employee}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {livroFicheiros.map((f, i) => {
                    const mes = f.meses.find(m => m.month === livroMes)
                    return (
                      <tr key={i}>
                        <td className={`${td} max-w-[14rem] truncate`} title={f.fileName}>{f.fileName}</td>
                        <td className={td}>{mes?.name || '—'}</td>
                        <td className={td}>
                          {f.erro ? (
                            <span className="text-red-600">{t.hm_book_unreadable}</span>
                          ) : mes ? (
                            `${horas(mes.total)} · ${mes.days.length} d`
                          ) : (
                            <span className="text-gray-400">{t.hm_book_no_month}</span>
                          )}
                        </td>
                        <td className={td}>
                          <select
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                            value={f.employeeId}
                            disabled={!mes}
                            onChange={e =>
                              setLivroFicheiros(fs => fs!.map((x, j) => (j === i ? { ...x, employeeId: e.target.value } : x)))
                            }
                          >
                            <option value="">{t.hm_book_choose}</option>
                            {pessoas.map(([id, name]) => (
                              <option key={id} value={String(id)}>{name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {livroErro && <p className="text-sm text-red-700" role="alert">{livroErro}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setLivroFicheiros(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                {t.hm_cancel}
              </button>
              <button
                type="button"
                onClick={importarLivros}
                disabled={livroGuardando || livrosParaImportar.length === 0}
                className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-60 transition"
              >
                {t.hm_book_import_btn.replace('{n}', String(livrosParaImportar.length))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Janela de correção */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <form
            onSubmit={guardarCorrecao}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.hm_fix_title}</h2>
                <p className="text-sm text-gray-500">{editing.name} · {dataPT(editing.date)}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <label className="block text-sm font-semibold text-gray-700">
              {t.hm_col_in}
              <input type="time" required className={selectClass} value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              {t.hm_col_out}
              <input type="time" required className={selectClass} value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.nextDay} onChange={e => setForm({ ...form, nextDay: e.target.checked })} />
              {t.hm_fix_next_day}
            </label>
            {editError && <p className="text-sm text-red-700" role="alert">{editError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {t.hm_save}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                {t.hm_cancel}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
