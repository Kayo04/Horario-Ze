'use client'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation' 

/* ---------- Tipos ---------- */
type EventType = 'teambuilding' | 'birthday' | 'vrlocal'

type Reservation = {
  id: string
  eventType: EventType
  date: string
  startTime: string
  endTime: string
  people: number
}

type UnavailableWeekday = { day: number; start: string; end: string }

type UnavailableSlot = {
  date: string
  type: 'unavailable'
} & (
  | { allDay: true }
  | { allDay: false; startTime: string; endTime: string }
)

type Employee = {
  id: string
  name: string
  code?: string
  email: string
  telefone?: string
  role: 'admin' | 'employee'
  unavailable: {
    weekdays: UnavailableWeekday[]
    specificDates: UnavailableSlot[]
  }
  createdAt?: Date
  updatedAt?: Date
}

type Assigned = { id: string; name: string; code?: string }

type Slot = {
  reservation: Reservation
  required: number
  available: Assigned[]
  assignedCount: number
  note: string
}

/* ---------- Component ---------- */
export default function SchedulerPrototype(): JSX.Element {
  const { data: session, status } = useSession()
  const router = useRouter()

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

  /* ---------- Controlo de Acesso e Carregamento de Dados ---------- */
  useEffect(() => {
    if (status === 'loading') {
      return
    }
    if (status === 'unauthenticated') {
      router.replace('/')
      return
    }
    if (status === 'authenticated' && session.user.role !== 'admin') {
      toast.error('Acesso negado. Apenas admins.')
      router.replace('/portal')
    } else if (status === 'authenticated' && session.user.role === 'admin') {
      loadData()
    }
  }, [status, session, router])

  /* ---------- Carregar dados ---------- */
  const loadData = async () => {
    try {
      // Carregar funcionários
      const employeesResponse = await fetch('/api/employees')
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json()
        setEmployees(employeesData)
      } else {
        console.error('Erro ao carregar funcionários')
      }

      // Carregar reservas
      const reservationsResponse = await fetch('/api/reservations')
      if (reservationsResponse.ok) {
        const reservationsData = await reservationsResponse.json()
        setReservations(reservationsData)
      } else {
        console.error('Erro ao carregar reservas')
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  /* ---------- Funções do formulário ---------- */
  const addReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (startTime >= endTime) {
      toast.error('A hora de fim deve ser depois da hora de início')
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
        await loadData()
        setPeople(10)
        setStartTime('18:00')
        setEndTime('20:00')
        toast.success('✅ Evento agendado com sucesso!')
      } else {
        const errorData = await response.json()
        toast.error('❌ Erro ao agendar evento: ' + (errorData.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao criar reserva:', error)
      toast.error('❌ Erro de conexão ao agendar evento')
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
        await loadData()
        setSchedule({})
        toast.success('✅ Evento cancelado com sucesso!')
      } else {
        toast.error('❌ Erro ao cancelar evento')
      }
    } catch (error) {
      console.error('Erro ao apagar reserva:', error)
      toast.error('❌ Erro de conexão ao cancelar evento')
    }
  }

  const clearAll = async () => {
    if (!confirm('Tem a certeza que quer apagar TODOS os eventos agendados?')) return
    
    try {
      const deletePromises = reservations.map(reservation => 
        fetch(`/api/reservations/${reservation.id}`, { method: 'DELETE' })
      )
      
      await Promise.all(deletePromises)
      await loadData()
      setSchedule({})
      toast.success('✅ Todos os eventos foram apagados!')
    } catch (error) {
      console.error('Erro ao apagar todas as reservas:', error)
      toast.error('❌ Erro ao apagar eventos')
    }
  }

  const generateSchedule = () => {
    const bySlot: Record<string, Slot> = {}

    for (const r of reservations) {
      const slotKey = `${r.date}T${r.startTime}`
      
      let required: number;
      if (r.people <= 10) {
          required = 2;
      } else if (r.people <= 20) {
          required = 3;
      } else if (r.people <= 30) {
          required = 5;
      } else {
          required = 7;
      }

      // Encontrar funcionários disponíveis
      const available = employees.filter(emp => {
        try {
          if (emp.role === 'admin') {
            return false
          }
          
          if (!emp.unavailable || typeof emp.unavailable !== 'object') return true
          
          const slotDate = new Date(r.date)
          const slotDay = slotDate.getDay()
          
          // 1. Verificar indisponibilidade por datas específicas (specificDates)
          const specificDates = (emp.unavailable.specificDates || []) as UnavailableSlot[]
          const isUnavailableOnDate = specificDates.some((slot: UnavailableSlot) => {
            if (slot.allDay && slot.date === r.date) return true
            
            if (slot.date === r.date && !slot.allDay) {
              const slotStart = convertTimeToMinutes(slot.startTime)
              const slotEnd = convertTimeToMinutes(slot.endTime)
              const eventStart = convertTimeToMinutes(r.startTime)
              const eventEnd = convertTimeToMinutes(r.endTime)
              return (eventStart < slotEnd && eventEnd > slotStart)
            }
            return false
          })
          
          if (isUnavailableOnDate) return false

          // 2. Verificar indisponibilidade por dias da semana (weekdays)
          const unavailableWeekdays = (emp.unavailable.weekdays || []) as UnavailableWeekday[]
          const isUnavailableOnWeekday = unavailableWeekdays.some((weekday: UnavailableWeekday) => {
            if (weekday.day !== slotDay) return false
            
            const weekdayStart = convertTimeToMinutes(weekday.start)
            const weekdayEnd = convertTimeToMinutes(weekday.end)
            const eventStart = convertTimeToMinutes(r.startTime)
            const eventEnd = convertTimeToMinutes(r.endTime)
            
            return (eventStart < weekdayEnd && eventEnd > weekdayStart)
          })

          return !isUnavailableOnWeekday
        } catch (error) {
          console.error('Erro ao verificar disponibilidade do funcionário:', emp.name, error)
          return true
        }
      })

      console.log(`📊 Evento ${r.eventType} - ${r.date} ${r.startTime}: ${available.length} funcionários disponíveis de ${employees.length} total`)

      const allAvailableStaff = available.map(e => ({ id: e.id, name: e.name, code: e.code }))
      const assignedCount = Math.min(available.length, required)

      bySlot[slotKey] = {
        reservation: r,
        required,
        available: allAvailableStaff,
        assignedCount: assignedCount,
        note: available.length < required ? 'Staff insuficiente' : 'OK',
      }
    }

    setSchedule(bySlot)
    toast.success('Horário gerado com sucesso!')
  }

  // Função auxiliar para converter tempo em minutos
  const convertTimeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  /* ---------- Utilitários ---------- */
  function formatDateInput(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const formatEventType = (type: EventType) => {
    switch (type) {
      case 'teambuilding':
        return 'Team Building'
      case 'birthday':
        return 'Aniversário'
      case 'vrlocal':
        return 'VR Local'
      default:
        return type
    }
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

  const generateBirthdayTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      if (hour > 20) break;
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 20 && minute > 0) break;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  const allTimeOptions = generateTimeOptions()
  const birthdayTimeOptions = generateBirthdayTimeOptions()

  // Calcular duração em horas
  const calculateDuration = (start: string, end: string) => {
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    
    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute
    
    return (endTotalMinutes - startTotalMinutes) / 60
  }

  /* ---------- Render (Loading de Sessão) ---------- */
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">A verificar sessão...</div>
        </div>
      </div>
    )
  }

  /* ---------- Render (Loading de Dados) ---------- */
  if (loading && status === 'authenticated' && session.user.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">A carregar eventos e funcionários...</div>
        </div>
      </div>
    )
  }

  /* ---------- Render (Conteúdo da Página - SÓ ADMIN) ---------- */
  if (status === 'authenticated' && session.user.role === 'admin' && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">

          <div className="mb-6">
            <Link href="/portal" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Voltar ao Portal
            </Link>
          </div>

          {/* Cabeçalho */}
          <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Agendamento de Eventos</h1>
              <p className="mt-2 text-gray-600">
                Sistema de agendamento para eventos corporativos e aniversários
              </p>
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
                <div className="grid grid-cols-3 gap-4">
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

                  <button
                    type="button"
                    onClick={() => setEventType('vrlocal')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      eventType === 'vrlocal'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">VR Local</div>
                    <div className="text-sm text-gray-500 mt-1">Realidade Virtual</div>
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
                    { (eventType === 'birthday' ? birthdayTimeOptions : allTimeOptions).map(time => (
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
                    { (eventType === 'birthday' ? birthdayTimeOptions : allTimeOptions).map(time => (
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
                              : reservation.eventType === 'birthday'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-purple-100 text-purple-800'
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
              
              <div className="flex gap-2"> 
                <button
                  onClick={generateSchedule}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  disabled={reservations.length === 0}
                >
                  Gerar Horário
                </button>
              </div>
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
                        <span className="font-medium">Staff disponível ({data.available.length}):</span>{' '}
                        {data.available.length > 0 
                          ? data.available.map(a => a.name).join(', ')
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

  /* ---------- Render (Fallback/Redirecionamento) ---------- */
  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg text-red-600">Acesso Negado</div>
        <p className="text-gray-600">A ser redirecionado...</p>
      </div>
    </div>
  )
}