'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PencilSquareIcon,
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
} from '@/lib/horas/regras'

type Comparacao = Record<string, Record<string, number | null>>

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
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Filtros
  const [month, setMonth] = useState('')
  const [week, setWeek] = useState('')
  const [person, setPerson] = useState('')
  const [status, setStatus] = useState('')

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
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // --- Opções dos filtros ---
  const meses = useMemo(
    () => Array.from(new Set(records.map(r => r.date.slice(0, 7)))).sort().reverse(),
    [records],
  )

  // Escolher automaticamente o mês mais recente
  useEffect(() => {
    if (meses.length && !meses.includes(month)) {
      setMonth(meses[0])
      setWeek('')
    }
  }, [meses, month])

  const semanas = useMemo(
    () => Array.from(new Set(records.filter(r => r.date.startsWith(month)).map(r => segundaFeira(r.date)))).sort(),
    [records, month],
  )

  const pessoas = useMemo(
    () =>
      Array.from(new Map(records.map(r => [r.id, r.name])).entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt')),
    [records],
  )

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
  const conferencia = !week ? comparison[month] : undefined

  const datasMes = mensais.map(r => r.date).sort()
  const intervalo = datasMes.length ? `${dataPT(datasMes[0])} – ${dataPT(datasMes[datasMes.length - 1])}` : ''

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

        {/* Filtros e ações */}
        <section className="bg-white p-6 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-sm font-semibold text-gray-700">
              {t.hm_month}
              <select className={selectClass} value={month} onChange={e => { setMonth(e.target.value); setWeek('') }}>
                {meses.map(m => (
                  <option key={m} value={m}>{nomeMes(m)}</option>
                ))}
              </select>
            </label>
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
            {intervalo && <span className="text-sm text-gray-500 ml-auto">{intervalo}</span>}
          </div>
          {message && <p className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
        </section>

        {loading && records.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
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
            {conferencia && (
              <section className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <h2 className="text-xl font-bold text-gray-800">{t.hm_comparison}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t.hm_comparison_desc}</p>
                </div>
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
                      {grupos.map(g => {
                        const livro = conferencia[String(g.id)]
                        const parcial = g.missing ? ` · ${t.hm_partial}` : ''
                        const diff = livro == null ? null : g.minutes - livro
                        return (
                          <tr key={g.id} className="hover:bg-gray-50">
                            <td className={`${td} font-medium text-gray-900`}>{g.name}</td>
                            <td className={td}>{horas(g.minutes) + parcial}</td>
                            <td className={td}>{livro == null ? t.hm_not_filled : horas(livro)}</td>
                            <td className={`${td} ${diff == null ? '' : diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-700' : ''}`}>
                              {diff == null ? '—' : horas(diff) + parcial}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

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
