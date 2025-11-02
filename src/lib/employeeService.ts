import { ObjectId } from 'mongodb'
import clientPromise from './mongodb'
import { Employee } from '@/types/employee'

const DB_NAME = 'horaios'
const COLLECTION = 'employees'

export async function getEmployees(): Promise<Employee[]> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const employees = await db
      .collection(COLLECTION)
      .find({})
      .sort({ name: 1 })
      .toArray()
    
    return employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      telefone: emp.telefone,
      cargo: emp.cargo,
      unavailable: emp.unavailable || { weekdays: [], dates: [] }
    })) as Employee[]
  } catch (error) {
    console.error('Erro ao buscar funcionários:', error)
    return []
  }
}

export async function createEmployee(employee: Omit<Employee, 'id'>): Promise<string> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const result = await db
      .collection(COLLECTION)
      .insertOne({
        ...employee,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    return result.insertedId.toString()
  } catch (error) {
    console.error('Erro ao criar funcionário:', error)
    throw error
  }
}

export async function updateEmployee(id: string, employee: Partial<Employee>): Promise<boolean> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const result = await db
      .collection(COLLECTION)
      .updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: {
            ...employee,
            updatedAt: new Date()
          }
        }
      )
    return result.modifiedCount > 0
  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error)
    throw error
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    console.log('🔍 Tentando apagar funcionário com ID:', id)
    
    // Verificação mais robusta do ID
    if (!id || id === 'undefined' || id === 'null' || id.length !== 24) {
      console.error('❌ ID inválido:', id)
      return false
    }

    // Verifica se o ObjectId é válido
    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      console.error('❌ ObjectId inválido:', id, error)
      return false
    }

    // Primeiro verifica se o funcionário existe
    const existingEmployee = await db
      .collection(COLLECTION)
      .findOne({ _id: objectId })

    if (!existingEmployee) {
      console.error('❌ Funcionário não encontrado com ID:', id)
      return false
    }

    console.log('✅ Funcionário encontrado, procedendo com delete...')

    const result = await db
      .collection(COLLECTION)
      .deleteOne({ _id: objectId })
    
    console.log('📊 Resultado MongoDB - deletedCount:', result.deletedCount)
    
    if (result.deletedCount === 0) {
      console.error('❌ Nenhum documento foi apagado')
      return false
    }
    
    console.log('✅ Funcionário apagado com sucesso')
    return true
  } catch (error) {
    console.error('💥 Erro no service deleteEmployee:', error)
    throw error
  }
}