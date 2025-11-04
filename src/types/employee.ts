// types/employee.ts
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
  role: 'admin' | 'employee'
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