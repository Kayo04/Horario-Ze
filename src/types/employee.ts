// types/employee.ts

export interface UnavailableWeekday {
  day: number // 0 = Domingo
  start: string
  end: string
}

export interface Employee {
  id: string
  name: string
  email: string 
  telefone?: string // <-- ADICIONADO
  role: 'admin' | 'employee'
  unavailable: {
    weekdays: UnavailableWeekday[]
    dates: string[] // YYYY-MM-DD
  }
  createdAt?: Date
  updatedAt?: Date
}

// Tipo interno para o backend que inclui a password
export interface EmployeeWithPassword extends Employee {
  password?: string;
}