'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'

type UnavailableWeekday = { day: number; start: string; end: string }

type Employee = {
  id: string
  name: string
  unavailable: {
    weekdays: UnavailableWeekday[]
    dates: string[]
  }
}

export default function FuncionariosPage(): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [name, setName] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  const [weekdaySelections, setWeekdaySelections] = useState<UnavailableWeekday[]>([])
  const [currentWeekday, setCurrentWeekday] = useState<number>(1)
  const [startTime, setStartTime] = useState<string>('13:00')
  const [endTime, setEndTime] = useState<string>('14:00')

  const [dates, setDates] = useState<string[]>([])
  const [currentDate, setCurrentDate] = useState<string>('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  // Estado para a confirmação de delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)

  // Carregar funcionários
  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    } finally {
      setLoading(false)
    }
  }

  // Funções para dias da semana
  const addWeekday = () => {
    if (startTime >= endTime) {
      alert('Hora de início deve ser antes da hora de fim')
      return
    }

    const newWeekday: UnavailableWeekday = {
      day: currentWeekday,
      start: startTime,
      end: endTime
    }

    setWeekdaySelections(prev => [...prev, newWeekday])
  }

  const removeWeekday = (index: number) => {
    setWeekdaySelections(prev => prev.filter((_, i) => i !== index))
  }

  // Funções para datas específicas
  const addDate = () => {
    if (!currentDate) {
      alert('Selecione uma data')
      return
    }

    setDates(prev => [...prev, currentDate])
    setCurrentDate('')
  }

  const removeDate = (index: number) => {
    setDates(prev => prev.filter((_, i) => i !== index))
  }

  // Função para guardar funcionário
  const saveEmployee = async () => {
    if (!name.trim()) {
      alert('Nome obrigatório')
      return
    }

    setSaving(true)
    try {
      const employeeData = {
        name: name.trim(),
        unavailable: {
          weekdays: weekdaySelections,
          dates: dates,
        },
      }

      const url = editingId ? `/api/employees/${editingId}` : '/api/employees'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      })

      if (response.ok) {
        await loadEmployees()
        resetForm()
        alert(editingId ? 'Funcionário atualizado!' : 'Funcionário criado!')
      } else {
        alert('Erro ao salvar funcionário')
      }
    } catch (error) {
      alert('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setName('')
    setWeekdaySelections([])
    setDates([])
    setStartTime('13:00')
    setEndTime('14:00')
    setCurrentDate('')
    setEditingId(null)
  }

  const editEmployee = (emp: Employee) => {
    setEditingId(emp.id)
    setName(emp.name)
    setWeekdaySelections([...emp.unavailable.weekdays])
    setDates([...emp.unavailable.dates])
  }

  // FUNÇÃO PARA MOSTRAR CONFIRMAÇÃO DE DELETE
  const confirmDelete = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setShowDeleteConfirm(true)
  }

  // FUNÇÃO PARA EXECUTAR O DELETE
  const executeDelete = async () => {
    if (!employeeToDelete) return

    try {
      const response = await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove da lista localmente
        setEmployees(employees.filter(emp => emp.id !== employeeToDelete.id))
        alert('Funcionário apagado com sucesso!')
      } else {
        alert('Erro ao apagar funcionário')
      }
    } catch (error) {
      alert('Erro de conexão')
    } finally {
      // Fecha o modal de confirmação
      setShowDeleteConfirm(false)
      setEmployeeToDelete(null)
    }
  }

  // FUNÇÃO PARA CANCELAR O DELETE
  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setEmployeeToDelete(null)
  }

  const cancelEdit = () => {
    resetForm()
  }

  // Utilitários
  const formatTimeDisplay = (time: string) => {
    return time
  }

  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()
  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-lg">A carregar funcionários...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Gestão de Funcionários</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Voltar para Principal
          </Link>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editingId ? 'Editar Funcionário' : 'Criar Funcionário'}
            </h2>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                disabled={saving}
              >
                Cancelar Edição
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do funcionário"
                disabled={saving}
              />
            </div>

            {/* Bloqueio por dia da semana */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">Bloqueio por dia da semana</h3>
              
              <div className="flex flex-wrap gap-3 items-center mb-3">
                <select
                  value={currentWeekday}
                  onChange={(e) => setCurrentWeekday(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                >
                  {weekdayNames.map((name, index) => (
                    <option key={index} value={index}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>

                <span className="text-gray-600">até</span>

                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addWeekday}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={saving}
                >
                  Adicionar
                </button>
              </div>

              {/* Lista de dias bloqueados */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Dias bloqueados:</h4>
                {weekdaySelections.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum dia bloqueado</p>
                ) : (
                  <ul className="space-y-2">
                    {weekdaySelections.map((weekday, index) => (
                      <li key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                        <span className="text-sm">
                          {weekdayNames[weekday.day]} {formatTimeDisplay(weekday.start)} - {formatTimeDisplay(weekday.end)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeWeekday(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          disabled={saving}
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Bloqueio por data específica */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">Bloqueio por data específica</h3>
              
              <div className="flex gap-3 items-center mb-3">
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={addDate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={saving}
                >
                  Adicionar
                </button>
              </div>

              {/* Lista de datas bloqueadas */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Datas bloqueadas:</h4>
                {dates.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhuma data bloqueada</p>
                ) : (
                  <ul className="space-y-2">
                    {dates.map((date, index) => (
                      <li key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                        <span className="text-sm">{date}</span>
                        <button
                          type="button"
                          onClick={() => removeDate(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          disabled={saving}
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Botão de submeter */}
            <div className="flex justify-end pt-4">
              <button
                onClick={saveEmployee}
                disabled={saving || !name.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {editingId ? 'A guardar...' : 'A criar...'}
                  </>
                ) : (
                  editingId ? 'Atualizar Funcionário' : 'Criar Funcionário'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lista de funcionários */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Funcionários Existentes ({employees.length})
          </h2>
          
          {employees.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum funcionário criado.</p>
          ) : (
            <div className="space-y-3">
              {employees.map((employee) => (
                <div key={employee.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg text-gray-800">{employee.name}</h3>
                      
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Dias bloqueados:</span>{' '}
                          {employee.unavailable.weekdays.length > 0
                            ? employee.unavailable.weekdays
                                .map(w => `${weekdayNames[w.day]} ${w.start}-${w.end}`)
                                .join(', ')
                            : 'Nenhum'}
                        </div>
                        <div>
                          <span className="font-medium">Datas bloqueadas:</span>{' '}
                          {employee.unavailable.dates.length > 0
                            ? employee.unavailable.dates.join(', ')
                            : 'Nenhuma'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => editEmployee(employee)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        disabled={saving}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => confirmDelete(employee)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        disabled={saving}
                      >
                        Apagar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Confirmação de Delete */}
        {showDeleteConfirm && employeeToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Confirmar Eliminação
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Tem a certeza que quer apagar o funcionário <strong>"{employeeToDelete.name}"</strong>? Esta ação não pode ser revertida.
                </p>
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Sim, Apagar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}