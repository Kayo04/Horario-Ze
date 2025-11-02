'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type UnavailableWeekday = { day: number; start: string; end: string }

export type Employee = {
  id: number
  name: string
  unavailable: {
    weekdays: UnavailableWeekday[]
    dates: string[]
  }
}

type FuncionariosContextType = {
  employees: Employee[]
  setEmployees: (funcs: Employee[]) => void
}

const FuncionariosContext = createContext<FuncionariosContextType>({
  employees: [],
  setEmployees: () => {},
})

const STORAGE_KEY = 'sched_employees_data'

export const FuncionariosProvider = ({ children }: { children: ReactNode }) => {
  const [employees, setEmployeesState] = useState<Employee[]>([])

  // Carregar os funcionários do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          setEmployeesState(JSON.parse(stored))
        } catch {
          console.warn('Erro ao ler funcionários do localStorage.')
        }
      }
    }
  }, [])

  // Atualiza o localStorage sempre que há mudanças
  const setEmployees = (funcs: Employee[]) => {
    setEmployeesState(funcs)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(funcs))
    }
  }

  return (
    <FuncionariosContext.Provider value={{ employees, setEmployees }}>
      {children}
    </FuncionariosContext.Provider>
  )
}

export const useFuncionarios = () => useContext(FuncionariosContext)
