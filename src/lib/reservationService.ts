import { ObjectId } from 'mongodb'
import clientPromise from './mongodb'

export type EventType = 'teambuilding' | 'birthday'

export interface Reservation {
  id: string
  eventType: EventType
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  people: number
  createdAt: Date
  updatedAt: Date
}

const DB_NAME = 'horaios'
const COLLECTION = 'reservations'

export async function getReservations(): Promise<Reservation[]> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const reservations = await db
      .collection(COLLECTION)
      .find({})
      .sort({ date: 1, startTime: 1 })
      .toArray()
    
    return reservations.map(res => ({
      id: res._id.toString(),
      eventType: res.eventType,
      date: res.date,
      startTime: res.startTime,
      endTime: res.endTime,
      people: res.people,
      createdAt: res.createdAt,
      updatedAt: res.updatedAt
    })) as Reservation[]
  } catch (error) {
    console.error('Erro ao buscar reservas:', error)
    return []
  }
}

export async function createReservation(reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const result = await db
      .collection(COLLECTION)
      .insertOne({
        ...reservation,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    return result.insertedId.toString()
  } catch (error) {
    console.error('Erro ao criar reserva:', error)
    throw error
  }
}

export async function deleteReservation(id: string): Promise<boolean> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const result = await db
      .collection(COLLECTION)
      .deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  } catch (error) {
    console.error('Erro ao apagar reserva:', error)
    throw error
  }
}

// Função para automaticamente eliminar eventos passados
export async function cleanupPastReservations(): Promise<number> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM
    
    // Eliminar eventos:
    // - Com data anterior à atual
    // - OU com data de hoje mas com hora de fim já passada
    const result = await db
      .collection(COLLECTION)
      .deleteMany({
        $or: [
          { date: { $lt: currentDate } },
          { 
            date: currentDate,
            endTime: { $lt: currentTime }
          }
        ]
      })
    
    console.log(`✅ Limpeza automática: ${result.deletedCount} eventos passados eliminados`)
    return result.deletedCount
  } catch (error) {
    console.error('❌ Erro na limpeza automática:', error)
    return 0
  }
}