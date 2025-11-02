export interface UnavailableWeekday {
  day: number // 0 = Domingo
  start: string
  end: string
}

export interface Employee {
  id: string // Mudado de _id para id para manter compatibilidade
  name: string
  email?: string
  telefone?: string
  cargo?: string
  unavailable: {
    weekdays: UnavailableWeekday[]
    dates: string[] // YYYY-MM-DD
  }
  createdAt?: Date
  updatedAt?: Date
}