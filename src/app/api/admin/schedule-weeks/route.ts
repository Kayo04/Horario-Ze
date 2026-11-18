import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import Shift from '@/models/Shifts'
import { exigirQuadrado } from '@/lib/permissoesServidor'

export const dynamic = 'force-dynamic'

const ligarBD = async () => {
  if (mongoose.connection.readyState >= 1) return
  if (!process.env.MONGODB_URI) throw new Error('Define MONGODB_URI no .env')
  await mongoose.connect(process.env.MONGODB_URI)
}

/** Segunda-feira da semana de uma data "AAAA-MM-DD". */
function segundaFeira(data: string): string {
  const d = new Date(data + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

// GET /api/admin/schedule-weeks -> semanas que têm horário guardado (mais recentes primeiro)
// [{ weekStart: "2026-10-26", shifts: 42, employees: 9 }]
export async function GET() {
  const { erro } = await exigirQuadrado('criarHorarios')
  if (erro) return erro
  try {
    await ligarBD()
    const porDia = await Shift.aggregate<{ _id: string; shifts: number; employees: string[] }>([
      { $group: { _id: '$date', shifts: { $sum: 1 }, employees: { $addToSet: '$employeeCode' } } },
    ])
    const semanas = new Map<string, { weekStart: string; shifts: number; employees: Set<string> }>()
    for (const d of porDia) {
      const inicio = segundaFeira(d._id)
      const s = semanas.get(inicio) ?? { weekStart: inicio, shifts: 0, employees: new Set<string>() }
      s.shifts += d.shifts
      d.employees.forEach(e => s.employees.add(e))
      semanas.set(inicio, s)
    }
    const lista = Array.from(semanas.values())
      .map(s => ({ weekStart: s.weekStart, shifts: s.shifts, employees: s.employees.size }))
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    return NextResponse.json({ weeks: lista }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    console.error('Erro ao listar semanas com horário:', e)
    return NextResponse.json({ error: 'Erro ao listar horários guardados' }, { status: 500 })
  }
}
