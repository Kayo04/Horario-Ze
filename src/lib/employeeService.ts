// lib/employeeService.ts
import { ObjectId } from 'mongodb'
import clientPromise from './mongodb'
import { Employee, EmployeeWithPassword, UnavailableSlot } from '@/types/employee'
import bcrypt from 'bcryptjs'

const DB_NAME = 'horaios'
const COLLECTION = 'employees'

// --- FUNÇÃO DE LOGIN ---
export async function getEmployeeByNameForAuth(name: string): Promise<any | null> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    const employee = await db
      .collection(COLLECTION)
      .findOne({ name: name })

    return employee
  } catch (error) {
    console.error('Erro ao buscar funcionário por nome:', error)
    return null
  }
}

// --- FUNÇÕES CRUD (para o Admin Panel) ---
export async function getEmployees(): Promise<Employee[]> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const employees = await db.collection(COLLECTION).find({}).sort({ name: 1 }).toArray()
    
    return employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      code: emp.code || '',
      telefone: emp.telefone || '',
      role: emp.role,
      unavailable: emp.unavailable || { weekdays: [], specificDates: [] }
    })) as Employee[]
  } catch (error) {
    console.error('Erro ao buscar funcionários:', error)
    return []
  }
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
   try {
    if (!ObjectId.isValid(id)) return null

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const emp = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) })
    
    if (!emp) return null
    
    return {
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      code: emp.code || '',
      telefone: emp.telefone || '',
      role: emp.role,
      unavailable: emp.unavailable || { weekdays: [], specificDates: [] }
    } as Employee
  } catch (error) {
    console.error('Erro ao buscar funcionário por ID:', error)
    return null
  }
}

export async function createEmployee(employee: EmployeeWithPassword): Promise<string> {
  try {
    if (!employee.password) {
      throw new Error('Password é obrigatória ao criar funcionário')
    }

    const hashedPassword = await bcrypt.hash(employee.password, 10)
    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    const result = await db.collection(COLLECTION).insertOne({
      name: employee.name,
      email: employee.email,
      code: employee.code || null,
      telefone: employee.telefone || null,
      role: employee.role,
      unavailable: employee.unavailable || { weekdays: [], specificDates: [] },
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    return result.insertedId.toString()
  } catch (error) {
    console.error('Erro ao criar funcionário:', error)
    throw error
  }
}

export async function updateEmployee(id: string, employee: Partial<EmployeeWithPassword>): Promise<boolean> {
  try {
    if (!ObjectId.isValid(id)) return false

    const dataToUpdate: any = { 
      ...employee,
      updatedAt: new Date()
    }

    // Remover campos que não devem ser atualizados
    delete dataToUpdate.password
    delete dataToUpdate.id

    // Se foi fornecida uma nova password, encriptar
    if (employee.password) {
      dataToUpdate.password = await bcrypt.hash(employee.password, 10)
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    const result = await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { $set: dataToUpdate }
    )
    
    return result.modifiedCount > 0
  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error)
    throw error
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  try {
    if (!id || !ObjectId.isValid(id)) {
      console.error('ID inválido:', id)
      return false
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) })
    
    return result.deletedCount === 1
  } catch (error) {
    console.error('Erro ao eliminar funcionário:', error)
    throw error
  }
}

// --- FUNÇÕES PARA INDISPONIBILIDADE ---
export async function updateEmployeeUnavailableSlots(
  employeeId: string, 
  specificDates: UnavailableSlot[]
): Promise<boolean> {
  try {
    console.log('💾 Atualizando indisponibilidades para funcionário:', employeeId)
    
    if (!employeeId || !ObjectId.isValid(employeeId)) {
      console.error('ID inválido:', employeeId)
      return false
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    const result = await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(employeeId) },
      { 
        $set: {
          'unavailable.specificDates': specificDates,
          updatedAt: new Date()
        }
      }
    )
    
    console.log('✅ Indisponibilidades atualizadas:', result.modifiedCount > 0)
    return result.modifiedCount > 0
  } catch (error) {
    console.error('Erro ao atualizar indisponibilidades:', error)
    throw error
  }
}

export async function getEmployeeUnavailableSlots(employeeId: string): Promise<UnavailableSlot[]> {
  try {
    if (!employeeId || !ObjectId.isValid(employeeId)) {
      return []
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    const employee = await db.collection(COLLECTION).findOne(
      { _id: new ObjectId(employeeId) },
      { projection: { 'unavailable.specificDates': 1 } }
    )
    
    if (!employee?.unavailable?.specificDates) {
      return []
    }
    
    return employee.unavailable.specificDates
  } catch (error) {
    console.error('Erro ao buscar indisponibilidades:', error)
    return []
  }
}

// --- FUNÇÃO AUXILIAR (para compatibilidade) ---
export async function getEmployeeIdByEmail(email: string): Promise<string | null> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    const employee = await db.collection(COLLECTION).findOne({ 
      email: email.toLowerCase().trim() 
    })
    
    return employee?._id?.toString() || null
  } catch (error) {
    console.error('Erro ao buscar ID por email:', error)
    return null
  }
}