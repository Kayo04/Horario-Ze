export type EventType = 'walkin' | 'teambuilding' | 'birthday'

export interface Reservation {
  id: string // Mudado de _id para id
  eventType: EventType
  datetime: string // formato: YYYY-MM-DDTHH:MM
  adults: number
  children: number
  createdAt?: Date
  updatedAt?: Date
}