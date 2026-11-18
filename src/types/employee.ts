// types/employee.ts
import type { Role, Quadrado } from '@/lib/permissoes'
export interface UnavailableSlot {
  date: string // YYYY-MM-DD
  startTime: string
  endTime: string
  allDay?: boolean
  type: 'unavailable'
}

export interface UnavailableWeekday {
  day: number // 0 = Domingo
  start: string
  end: string
}

export interface Employee {
  id: string
  name: string
  email: string
  code?: string
  telefone?: string
  role: Role
  permissions?: Quadrado[] // quadrados extra que um Host/Manager pode ver (admin vê tudo)
  unavailable: {
    weekdays: UnavailableWeekday[]
    specificDates: UnavailableSlot[] // <-- MUDADO para incluir horários específicos
  }
  createdAt?: Date
  updatedAt?: Date
}

export interface EmployeeWithPassword extends Employee {
  password?: string
}