export type EventType = 'walkin' | 'teambuilding' | 'birthday' | 'vrlocal' | 'experiencia'; // Adicionei os que vi no teu código

export interface Reservation {
  id: string
  eventType: EventType
  datetime: string // formato: YYYY-MM-DDTHH:MM
  adults: number
  children: number
  
  customerName?: string; // NOVO CAMPO: Opcional pq pode não vir sempre
  marketingSource?: string; // NOVO CAMPO: Para o check-in futuro

  createdAt?: Date
  updatedAt?: Date
}