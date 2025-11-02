'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'

/* ---------- Tipos ---------- */
type EventType = 'teambuilding' | 'birthday'

type Reservation = {
  id: string
  eventType: EventType
  date: string
  startTime: string
  endTime: string
  people: number
}

type UnavailableWeekday = { day: number; start: string; end: string }
type Employee = {
  id: string
  name: string
  unavailable: {
    weekdays: UnavailableWeekday[]
    dates: string[]
  }
}

type Assigned = { id: string; name: string }

type Slot = {
  reservation: Reservation
  required: number
  assigned: Assigned[]
  note: string
}

/* ---------- Component ---------- */
export default function SchedulerPrototype(): JSX.Element {
  // Estados principais
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Estados do formulário
  const [eventType, setEventType] = useState<EventType>('teambuilding')
  const [date, setDate] = useState<string>(formatDateInput(new Date()))
  const [startTime, setStartTime] = useState<string>('18:00')
  const [endTime, setEndTime] = useState<string>('20:00')
  const [people, setPeople] = useState<number>(10)
  const [saving, setSaving] = useState(false)

  // Horário gerado
  const [schedule, setSchedule] = useState<Record<string, Slot>>({})

  /* ---------- Carregar dados ---------- */
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Carregar funcionários
      const employeesResponse = await fetch('/api/employees')
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json()
        setEmployees(employeesData)
      }

      // Carregar reservas (a API faz automaticamente a limpeza de eventos passados)
      const reservationsResponse = await fetch('/api/reservations')
      if (reservationsResponse.ok) {
        const reservationsData = await reservationsResponse.json()
        setReservations(reservationsData)
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  /* ---------- Funções do formulário ---------- */
  const addReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar que a hora de fim é depois da hora de início
    if (startTime >= endTime) {
      alert('A hora de fim deve ser depois da hora de início')
      return
    }

    setSaving(true)

    try {
      const newRes = {
        eventType,
        date,
        startTime,
        endTime,
        people: Number(people),
      }

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRes),
      })

      if (response.ok) {
        // Recarregar os dados para ter a lista atualizada
        await loadData()
        // Limpar formulário
        setPeople(10)
        setStartTime('18:00')
        setEndTime('20:00')
        alert('✅ Evento agendado com sucesso!')
      } else {
        const errorData = await response.json()
        alert('❌ Erro ao agendar evento: ' + (errorData.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao criar reserva:', error)
      alert('❌ Erro de conexão ao agendar evento')
    } finally {
      setSaving(false)
    }
  }

  const deleteReservation = async (id: string) => {
    if (!confirm('Tem a certeza que quer cancelar este evento?')) return

    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Recarregar os dados
        await loadData()
        alert('✅ Evento cancelado com sucesso!')
      } else {
        alert('❌ Erro ao cancelar evento')
      }
    } catch (error) {
      console.error('Erro ao apagar reserva:', error)
      alert('❌ Erro de conexão ao cancelar evento')
    }
  }

  const clearAll = async () => {
    if (!confirm('Tem a certeza que quer apagar TODOS os eventos agendados?')) return
    
    try {
      // Apagar cada reserva individualmente
      const deletePromises = reservations.map(reservation => 
        fetch(`/api/reservations/${reservation.id}`, { method: 'DELETE' })
      )
      
      await Promise.all(deletePromises)
      await loadData()
      setSchedule({})
      alert('✅ Todos os eventos foram apagados!')
    } catch (error) {
      console.error('Erro ao apagar todas as reservas:', error)
      alert('❌ Erro ao apagar eventos')
    }
  }

  const generateSchedule = () => {
    const bySlot: Record<string, Slot> = {}

    for (const r of reservations) {
      const slotKey = `${r.date}T${r.startTime}`
      
      // Calcular staff necessário baseado no número de pessoas
      let required = Math.ceil(r.people / 8) // 1 staff para cada 8 pessoas
      if (required < 1) required = 1
      if (r.eventType === 'teambuilding') required += 1 // Team building precisa de mais staff

      // Encontrar funcionários disponíveis
      const available = employees.filter(emp => {
        // Verificar indisponibilidade por datas específicas
        const isUnavailableDate = emp.unavailable.dates.some(unavailableDate => 
          r.date === unavailableDate
        )
        
        if (isUnavailableDate) return false

        // Verificar indisponibilidade por dias da semana
        const slotDate = new Date(r.date)
        const slotDay = slotDate.getDay()
        
        // Verificar se o funcionário está indisponível durante o horário do evento
        const isUnavailableDuringEvent = emp.unavailable.weekdays.some(weekday => 
          weekday.day === slotDay && 
          ((r.startTime >= weekday.start && r.startTime < weekday.end) ||
           (r.endTime > weekday.start && r.endTime <= weekday.end) ||
           (r.startTime <= weekday.start && r.endTime >= weekday.end))
        )

        return !isUnavailableDuringEvent
      })

      const assigned = available.slice(0, required).map(e => ({ id: e.id, name: e.name }))

      bySlot[slotKey] = {
        reservation: r,
        required,
        assigned,
        note: assigned.length < required ? 'Staff insuficiente' : 'OK',
      }
    }

    setSchedule(bySlot)
  }

  /* ---------- Utilitários ---------- */
  function formatDateInput(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const formatEventType = (type: EventType) => {
    return type === 'teambuilding' ? 'Team Building' : 'Aniversário'
  }

  // Gerar opções de horário em formato 24h de 15 em 15 minutos
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // Calcular duração em horas
  const calculateDuration = (start: string, end: string) => {
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    
    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute
    
    return (endTotalMinutes - startTotalMinutes) / 60
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">A carregar eventos e funcionários...</div>
        </div>
      </div>
    )
  }

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Agendamento de Eventos</h1>
            <p className="mt-2 text-gray-600">
              Sistema de agendamento para eventos corporativos e aniversários
            </p>
          </div>
          <div className="flex gap-3">
  <Link
    href="/funcionarios"
    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
  >
    Gerir Funcionários
  </Link>

  <Link
    href="/gestao-reserva"
    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
  >
    Gestão da Reserva
  </Link>
</div>
        </div>

        {/* Formulário de Agendamento */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Agendar Novo Evento</h2>
          
          <form onSubmit={addReservation} className="space-y-4">
            {/* Tipo de Evento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Evento *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setEventType('teambuilding')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    eventType === 'teambuilding'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Team Building</div>
                  <div className="text-sm text-gray-500 mt-1">Eventos corporativos</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setEventType('birthday')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    eventType === 'birthday'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Aniversário</div>
                  <div className="text-sm text-gray-500 mt-1">Celebrações</div>
                </button>
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data do Evento *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={saving}
              />
            </div>

            {/* Horário - Início e Fim */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Início *
                </label>
                <select
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={saving}
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Fim *
                </label>
                <select
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={saving}
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duração calculada automaticamente */}
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Duração do evento:</span>{' '}
                {calculateDuration(startTime, endTime)} horas
                {startTime >= endTime && (
                  <span className="text-red-600 ml-2">⚠️ A hora de fim deve ser depois do início</span>
                )}
              </div>
            </div>

            {/* Número de Pessoas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Pessoas *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={people}
                onChange={e => setPeople(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={saving}
              />
            </div>

            {/* Botão de Submissão */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving || startTime >= endTime}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    A guardar...
                  </>
                ) : (
                  'Agendar Evento'
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Lista de Reservas */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Eventos Agendados ({reservations.length})
            </h2>
            {reservations.length > 0 && (
              <button
                onClick={clearAll}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                disabled={saving}
              >
                Apagar Todos
              </button>
            )}
          </div>

          {reservations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhum evento agendado. Use o formulário acima para criar o primeiro evento.
            </p>
          ) : (
            <div className="space-y-3">
              {reservations.map(reservation => (
                <div key={reservation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          reservation.eventType === 'teambuilding' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {formatEventType(reservation.eventType)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(reservation.date).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          <span className="font-medium">Horário:</span> {reservation.startTime} - {reservation.endTime} 
                          <span className="text-gray-500 ml-2">
                            ({calculateDuration(reservation.startTime, reservation.endTime)} horas)
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Pessoas:</span> {reservation.people}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteReservation(reservation.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 ml-4"
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Gerar Horário */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Atribuição de Staff</h2>
            <button
              onClick={generateSchedule}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              disabled={reservations.length === 0}
            >
              Gerar Horário
            </button>
          </div>

          <div className="space-y-4">
            {Object.keys(schedule).length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {reservations.length === 0 
                  ? 'Agende eventos primeiro para gerar o horário.'
                  : 'Clique em "Gerar Horário" para ver a atribuição de staff.'
                }
              </p>
            ) : (
              Object.entries(schedule).map(([slot, data]) => (
                <div key={slot} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-lg">
                        {formatEventType(data.reservation.eventType)} - {new Date(data.reservation.date).toLocaleDateString('pt-PT')}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {data.reservation.startTime} - {data.reservation.endTime} • {data.reservation.people} pessoas
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      data.note === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {data.note}
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    <div className="mb-2">
                      <span className="font-medium">Staff necessário:</span> {data.required}
                    </div>
                    <div>
                      <span className="font-medium">Staff atribuído:</span>{' '}
                      {data.assigned.length > 0 
                        ? data.assigned.map(a => a.name).join(', ')
                        : 'Nenhum staff disponível'
                      }
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          Sistema de agendamento - {employees.length} funcionários disponíveis
          <br />
          <span className="text-xs">
            ⚡ Eventos passados são automaticamente eliminados da base de dados
          </span>
        </footer>
      </div>
    </div>
  )
} 