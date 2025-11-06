'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Interface que já tinhas no outro ficheiro
interface TimeSlot {
  date: string // YYYY-MM-DD
  startTime: string
  endTime: string
  type: 'unavailable' | 'available'
  allDay?: boolean
}

// Interface para os funcionários do dropdown
interface Employee {
  id: string
  name: string
  email: string
}

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// Função que já tinhas no outro ficheiro
const getCalendarGrid = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const startDayOfWeek = firstDayOfMonth.getDay() // 0=Dom, 1=Seg, ..., 6=Sáb
  const gridStartIndex = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const gridDays: (Date | null)[] = []
  for (let i = 0; i < gridStartIndex; i++) {
    gridDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    gridDays.push(new Date(year, month, day))
  }
  return gridDays
}

export default function AdminPanelPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // States
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('')
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  
  // ⬇️ ALTERAÇÃO: Novo state para guardar o dia clicado
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  // States de loading
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  // 1. Verificar se é Admin
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated' || (status === 'authenticated' && session.user.role !== 'admin')) {
      router.replace('/portal')
    }
  }, [session, status, router])

  // 2. Carregar a lista de funcionários (da Rota A)
  useEffect(() => {
    if (status === 'authenticated' && session.user.role === 'admin') {
      const fetchEmployees = async () => {
        setIsLoadingEmployees(true)
        try {
          const response = await fetch('/api/admin/employees')
          if (response.ok) {
            const data = await response.json()
            setEmployees(data.employees)
          } else {
            console.error('Erro ao carregar funcionários:', await response.text())
          }
        } catch (error) {
          console.error('Falha ao carregar funcionários:', error)
        }
        setIsLoadingEmployees(false)
      }
      fetchEmployees()
    }
  }, [session, status])

  // 3. Carregar os slots QUANDO o admin seleciona um funcionário (da Rota B)
  useEffect(() => {
    if (!selectedEmployeeId) {
      setTimeSlots([])
      setSelectedDate(null) // Limpa o dia selecionado
      return
    }

    const fetchEmployeeSlots = async () => {
      setIsLoadingSlots(true)
      setSelectedDate(null) // Limpa o dia selecionado ao trocar de funcionário
      try {
        const response = await fetch(`/api/admin/unavailable/${selectedEmployeeId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.unavailable && Array.isArray(data.unavailable)) {
            const slots: TimeSlot[] = data.unavailable.map((slot: any) => ({
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              type: 'unavailable',
              allDay: slot.allDay || false,
            }))
            setTimeSlots(slots)
          } else {
            setTimeSlots([])
          }
        } else {
          console.error('Erro ao carregar slots:', await response.text())
          setTimeSlots([])
        }
      } catch (error) {
        console.error('Falha ao carregar slots:', error)
      }
      setIsLoadingSlots(false)
    }

    fetchEmployeeSlots()
  }, [selectedEmployeeId])


  // --- Funções de ajuda ---

  const calendarGridDays = getCalendarGrid(currentMonth)

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    setSelectedDate(null) // Limpa seleção ao mudar de mês
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    setSelectedDate(null) // Limpa seleção ao mudar de mês
  }

  const getUnavailableSlotsForDate = (date: string) => {
    return timeSlots.filter(slot => 
      slot.date === date && slot.type === 'unavailable'
    )
  }

  const hasAllDayUnavailability = (date: string) => {
    return timeSlots.some(slot => 
      slot.date === date && slot.type === 'unavailable' && slot.allDay
    )
  }
  
  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value
    const selectedEmp = employees.find(emp => emp.id === newId)
    setSelectedEmployeeId(newId)
    setSelectedEmployeeName(selectedEmp?.name || '')
  }
  
  // ⬇️ ALTERAÇÃO: Função para formatar a data no painel de detalhes
  const formatDetailDate = (dateString: string) => {
    // Adiciona T12:00:00 para evitar problemas de fuso horário (UTC)
    const date = new Date(dateString + 'T12:00:00')
    return date.toLocaleDateString('pt-PT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
  }

  // --- Renderização ---

  if (status === 'loading' || !session || session.user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        {/* ... (ecrã de loading, sem alterações) ... */}
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">A verificar permissões de admin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex justify-between items-center mb-8">
            {/* ... (header, sem alterações) ... */}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Painel de Admin
              </h1>
              <p className="text-gray-600 mt-2">
                Ver disponibilidade dos funcionários
              </p>
            </div>
            <button
              onClick={() => router.push('/portal')}
              className="hidden sm:inline-block px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Voltar ao Portal
            </button>
        </header>

        <div className="mb-8 max-w-lg">
          {/* ... (dropdown de seleção, sem alterações) ... */}
          <label htmlFor="employeeSelect" className="block text-lg font-medium text-gray-700 mb-2">
            Selecionar Funcionário
          </label>
          <select
            id="employeeSelect"
            value={selectedEmployeeId}
            onChange={handleEmployeeChange}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500"
            disabled={isLoadingEmployees}
          >
            <option value="" disabled>
              {isLoadingEmployees ? 'A carregar funcionários...' : 'Selecione um funcionário...'}
            </option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.email})
              </option>
            ))}
          </select>
        </div>
        
        {isLoadingSlots && (
           <div className="text-center p-10">
              {/* ... (loading do calendário, sem alterações) ... */}
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
              <p className="mt-3 text-gray-500">A carregar calendário de {selectedEmployeeName}...</p>
           </div>
        )}

        {/* ⬇️ ALTERAÇÃO: Layout de 2 colunas para Calendário + Detalhes */}
        {selectedEmployeeId && !isLoadingSlots && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Coluna do Calendário */}
            <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                Disponibilidade de: {selectedEmployeeName}
              </h2>
              
              <div className="flex justify-between items-center mb-6">
                {/* ... (navegação do mês, sem alterações) ... */}
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  ←
                </button>
                <h3 className="text-xl font-semibold">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
                {/* ... (dias da semana, sem alterações) ... */}
                {weekdays.map(day => (
                  <div key={day} className="text-center font-semibold text-gray-500 text-sm py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Dias do mês */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarGridDays.map((day, index) => {
                  
                  if (!day) {
                    return <div key={`pad-${index}`} className="min-h-[4.5rem] sm:min-h-20 border border-transparent"></div>
                  }
                  
                  const dateString = day.toISOString().split('T')[0]
                  const unavailableSlots = getUnavailableSlotsForDate(dateString)
                  const isAllDay = hasAllDayUnavailability(dateString)
                  
                  // ⬇️ ALTERAÇÃO: Volta a ser um <button> e tem lógica de 'selected'
                  return (
                    <button
                      key={dateString}
                      onClick={() => setSelectedDate(dateString)}
                      className={`
                        p-1 sm:p-3 rounded-lg border text-left min-h-[4.5rem] sm:min-h-20 flex flex-col justify-start transition-colors
                        ${selectedDate === dateString ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                        ${isAllDay ? 'bg-red-100 border-red-300' : ''}
                        ${unavailableSlots.length > 0 && !isAllDay ? 'bg-red-50 border-red-200' : ''}
                        ${unavailableSlots.length === 0 && selectedDate !== dateString ? 'bg-white' : ''}
                        ${unavailableSlots.length === 0 && selectedDate === dateString ? '' : 'hover:bg-gray-50'}
                      `} 
                    >
                      <div className="font-semibold text-sm">{day.getDate()}</div>
                      {isAllDay && (
                        <div className="hidden sm:block text-[10px] sm:text-xs text-red-700 mt-0.5 sm:mt-1 font-medium">
                          Indisponível (Dia Todo)
                        </div>
                      )}
                      {unavailableSlots.length > 0 && !isAllDay && (
                        <div className="hidden sm:block text-[10px] sm:text-xs text-red-600 mt-0.5 sm:mt-1">
                          {unavailableSlots.length} horário(s) indisponível(is)
                        </div>
                      )}
                      {unavailableSlots.length === 0 && (
                         <div className="hidden sm:block text-[10px] sm:text-xs text-green-600 mt-0.5 sm:mt-1">
                          Disponível
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ⬇️ ALTERAÇÃO: Nova Coluna de Detalhes do Dia */}
            <div className="lg:col-span-1 bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">
                {selectedDate 
                  ? `Detalhes de ${formatDetailDate(selectedDate)}`
                  : "Detalhes do Dia"
                }
              </h3>
              
              {!selectedDate && (
                <p className="text-gray-500 text-center py-8">
                  Clique num dia no calendário para ver os horários em detalhe.
                </p>
              )}

              {selectedDate && (
                <div className="space-y-2">
                  {getUnavailableSlotsForDate(selectedDate).length === 0 ? (
                    <div className="p-3 bg-green-50 rounded border border-green-200 text-green-700 font-medium">
                      Disponível o dia todo.
                    </div>
                  ) : (
                    getUnavailableSlotsForDate(selectedDate).map((slot, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200"
                      >
                        <span className="font-medium text-red-800">
                          {slot.allDay ? 'Indisponível (Dia Todo)' : `${slot.startTime} - ${slot.endTime}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
          </div>
        )}

        {/* Resumo do Mês (movemos para baixo) */}
        {selectedEmployeeId && !isLoadingSlots && (
          <div className="mt-8 bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Resumo do Mês ({selectedEmployeeName})</h3>
            {/* ... (o teu resumo, sem alterações) ... */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {calendarGridDays.filter(d => d).length - new Set(timeSlots.map(s => s.date)).size}
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
        )}

      </div>
    </div>
  )
}