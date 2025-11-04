// app/portal/disponibilidade/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface TimeSlot {
  date: string // YYYY-MM-DD
  startTime: string
  endTime: string
  type: 'unavailable' | 'available'
  allDay?: boolean
}

// Gerar opções de tempo de 15 em 15 minutos (10:00 - 20:00)
const generateTimeOptions = () => {
  const options = []
  for (let hour = 10; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour < 20 || (hour === 20 && minute === 0)) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
  }
  return options
}

const timeOptions = generateTimeOptions()

export default function DisponibilidadePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('17:00')
  const [allDay, setAllDay] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Debug da sessão
  useEffect(() => {
    console.log('🔍 SESSÃO NO COMPONENTE:', {
      temSessao: !!session,
      user: session?.user,
      email: session?.user?.email,
      id: session?.user?.id,
      role: session?.user?.role
    })
  }, [session])

  // Redirecionar se não for funcionário
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      router.push('/portal')
    }
  }, [session, router])

  // Carregar indisponibilidades
  useEffect(() => {
    if (session) {
      loadUnavailableSlots()
    }
  }, [session])

  // Carregar slots da base de dados
  const loadUnavailableSlots = async () => {
    try {
      console.log('🔄 Iniciando carregamento de indisponibilidades...')
      const response = await fetch('/api/employees/unavailable')
      
      console.log('📥 Resposta do GET:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Dados carregados:', data)
        
        // Verificar se temos dados válidos
        if (data.unavailable && Array.isArray(data.unavailable)) {
          const slots: TimeSlot[] = data.unavailable.map((slot: any) => ({
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: 'unavailable',
            allDay: slot.allDay || false
          }))
          
          console.log(`📊 ${slots.length} slots convertidos`)
          setTimeSlots(slots)
        } else {
          console.log('📭 Nenhuma indisponibilidade encontrada')
          setTimeSlots([])
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Erro na resposta GET:', errorText)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar indisponibilidades:', error)
    }
  }

  // Guardar indisponibilidades na base de dados - CORRIGIDO
  const saveUnavailableSlots = async (slots: TimeSlot[]): Promise<boolean> => {
  if (!session) {
    console.log('❌ Sem sessão para guardar')
    return false
  }
  
  setIsSaving(true)
  try {
    console.log('💾 INICIANDO GUARDAR NA BD...')
    console.log('📧 Email da sessão:', session.user?.email)
    
    const specificDates = slots.map(slot => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      allDay: slot.allDay || false,
      type: 'unavailable' as const
    }))

    console.log('📤 Enviando para API:', JSON.stringify({ specificDates }, null, 2))

    const response = await fetch('/api/employees/unavailable', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        specificDates: specificDates
      })
    })

    console.log('📥 Resposta da API - Status:', response.status)
    console.log('📥 Resposta da API - OK:', response.ok)

    const responseText = await response.text()
    console.log('📥 Resposta da API - Text:', responseText)

    if (!response.ok) {
      console.error('❌ Erro na resposta PUT:', responseText)
      throw new Error(`API error: ${response.status} - ${responseText}`)
    }

    const result = JSON.parse(responseText)
    console.log('✅ RESPOSTA DA API (JSON):', result)
    
    if (result.success) {
      console.log('🎉 Dados guardados com sucesso!')
      return true
    } else {
      console.error('❌ API retornou success: false', result)
      return false
    }
      
  } catch (error) {
    console.error('❌ Erro ao guardar:', error)
    return false
  } finally {
    setIsSaving(false)
  }
}

  // Gerar dias do mês
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day)
      days.push(currentDate)
    }
    
    return days
  }

  const daysInMonth = getDaysInMonth(currentMonth)

  // Navegação entre meses
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Formatar data para exibição
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-PT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
  }

  // Verificar se um dia tem indisponibilidade
  const getUnavailableSlotsForDate = (date: string) => {
    return timeSlots.filter(slot => 
      slot.date === date && slot.type === 'unavailable'
    )
  }

  // Verificar se um dia está marcado como dia todo
  const hasAllDayUnavailability = (date: string) => {
    return timeSlots.some(slot => 
      slot.date === date && slot.type === 'unavailable' && slot.allDay
    )
  }

  // Adicionar indisponibilidade
  const addUnavailability = async () => {
    if (!selectedDate) {
      console.log('❌ Nenhuma data selecionada')
      return
    }

    console.log('🟡 INICIANDO ADD...', {
      selectedDate,
      startTime,
      endTime,
      allDay,
      email: session?.user?.email
    })

    setIsLoading(true)
    
    const newSlot: TimeSlot = {
      date: selectedDate,
      startTime: allDay ? '10:00' : startTime,
      endTime: allDay ? '20:00' : endTime,
      type: 'unavailable',
      allDay: allDay
    }

    try {
      let updatedSlots: TimeSlot[]
      
      // Remover slots existentes para o mesmo dia se for dia todo
      if (allDay) {
        updatedSlots = timeSlots.filter(slot => slot.date !== selectedDate)
      } else {
        updatedSlots = [...timeSlots]
      }
      
      updatedSlots.push(newSlot)
      console.log('📊 Slots atualizados (antes de guardar):', updatedSlots)
      
      setTimeSlots(updatedSlots)
      
      // Guardar na base de dados
      const success = await saveUnavailableSlots(updatedSlots)
      if (!success) {
        throw new Error('Erro ao guardar na base de dados')
      }
      
      console.log('✅ Sucesso - resetando formulário')
      // Reset form
      setStartTime('10:00')
      setEndTime('17:00')
      setAllDay(false)
      setSelectedDate('')
      
      alert('Indisponibilidade adicionada com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao adicionar indisponibilidade:', error)
      alert('Erro ao adicionar indisponibilidade: ' + (error as Error).message)
      // Reverter se houve erro
      loadUnavailableSlots()
    } finally {
      setIsLoading(false)
    }
  }

  // Remover indisponibilidade
  const removeUnavailability = async (slotToRemove: TimeSlot) => {
    const updatedSlots = timeSlots.filter(slot => 
      !(slot.date === slotToRemove.date && 
        slot.startTime === slotToRemove.startTime && 
        slot.endTime === slotToRemove.endTime)
    )
    
    setTimeSlots(updatedSlots)
    
    // Guardar na base de dados
    const success = await saveUnavailableSlots(updatedSlots)
    if (!success) {
      alert('Erro ao remover indisponibilidade')
      // Reverter se houve erro
      loadUnavailableSlots()
    }
  }

  // Dias da semana em português
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  if (session?.user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600">Esta página é apenas para funcionários.</p>
          <button
            onClick={() => router.push('/portal')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Voltar ao Portal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Gerir Minha Disponibilidade
            </h1>
            <p className="text-gray-600 mt-2">
              Marque os horários em que não está disponível para trabalhar
            </p>
            {isSaving && (
              <p className="text-sm text-blue-600 mt-1">💾 A guardar na base de dados...</p>
            )}
          </div>
          <button
            onClick={() => router.push('/portal')}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Voltar
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Calendário */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                ←
              </button>
              <h2 className="text-xl font-semibold">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                →
              </button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekdays.map(day => (
                <div key={day} className="text-center font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map(day => {
                const dateString = day.toISOString().split('T')[0]
                const unavailableSlots = getUnavailableSlotsForDate(dateString)
                const isSelected = selectedDate === dateString
                const isAllDay = hasAllDayUnavailability(dateString)
                
                return (
                  <button
                    key={dateString}
                    onClick={() => setSelectedDate(dateString)}
                    className={`
                      p-3 rounded-lg border text-left min-h-20 transition-colors
                      ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                      ${isAllDay ? 'bg-red-100 border-red-300' : ''}
                      ${unavailableSlots.length > 0 && !isAllDay ? 'bg-red-50 border-red-200' : ''}
                      hover:bg-gray-50
                    `}
                  >
                    <div className="font-medium">{day.getDate()}</div>
                    {isAllDay && (
                      <div className="text-xs text-red-700 mt-1 font-medium">
                        Dia Todo
                      </div>
                    )}
                    {unavailableSlots.length > 0 && !isAllDay && (
                      <div className="text-xs text-red-600 mt-1">
                        {unavailableSlots.length} horário(s)
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Painel de gestão */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">
              {selectedDate ? `Gestão para ${formatDate(new Date(selectedDate))}` : 'Selecione um dia'}
            </h3>

            {selectedDate && (
              <div className="space-y-4">
                {/* Opção Dia Todo */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
                    Não posso trabalhar o dia todo
                  </label>
                </div>

                {!allDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horário Indisponível
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Início</label>
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          {timeOptions.map(time => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fim</label>
                        <select
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          {timeOptions.map(time => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Horário de trabalho: 10:00 - 20:00
                    </p>
                  </div>
                )}

                <button
                  onClick={addUnavailability}
                  disabled={isLoading || (!allDay && startTime >= endTime)}
                  className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'A adicionar...' : allDay ? 'Marcar Dia Todo como Indisponível' : 'Marcar como Indisponível'}
                </button>

                {/* Lista de indisponibilidades do dia selecionado */}
                {getUnavailableSlotsForDate(selectedDate).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 text-gray-800">Horários Indisponíveis:</h4>
                    <div className="space-y-2">
                      {getUnavailableSlotsForDate(selectedDate).map((slot, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200"
                        >
                          <div>
                            <span className="font-medium">
                              {slot.allDay ? 'Dia Todo' : `${slot.startTime} - ${slot.endTime}`}
                            </span>
                            {slot.allDay && (
                              <span className="text-xs text-red-600 ml-2">(10:00 - 20:00)</span>
                            )}
                          </div>
                          <button
                            onClick={() => removeUnavailability(slot)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!selectedDate && (
              <p className="text-gray-500 text-center py-8">
                Selecione um dia no calendário para gerir a disponibilidade
              </p>
            )}
          </div>
        </div>

        {/* Resumo do mês */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Resumo do Mês</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {daysInMonth.length - new Set(timeSlots.map(s => s.date)).size}
              </div>
              <div className="text-sm text-green-600">Dias Disponíveis</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {new Set(timeSlots.map(s => s.date)).size}
              </div>
              <div className="text-sm text-red-600">Dias com Indisponibilidade</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {timeSlots.filter(slot => !slot.allDay).length}
              </div>
              <div className="text-sm text-blue-600">Horários Indisponíveis</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {timeSlots.filter(slot => slot.allDay).length}
              </div>
              <div className="text-sm text-orange-600">Dias Completos</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}