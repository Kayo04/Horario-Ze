// lib/employeeService.ts
import { ObjectId } from 'mongodb'
import clientPromise from './mongodb'
import { Employee, EmployeeWithPassword } from '@/types/employee'
import bcrypt from 'bcryptjs'

const DB_NAME = 'horaios'
const COLLECTION = 'employees'

// --- FUNÇÃO DE LOGIN ---
// Procura um funcionário pelo NOME e retorna o doc completo (incluindo password)
// USADO APENAS PELO NEXT-AUTH
export async function getEmployeeByNameForAuth(name: string): Promise<any | null> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    // Procura por nome (case-insensitive pode ser útil, mas 
    // vamos manter simples por agora: 'tiago' é diferente de 'Tiago')
    const employee = await db
      .collection(COLLECTION)
      .findOne({ name: name })

    if (!employee) return null

    // Retorna o objeto como está na DB, incluindo _id e password
    return employee
  } catch (error) {
    console.error('Erro ao buscar funcionário por nome:', error)
    return null
  }
}


// --- FUNÇÕES CRUD (para o Admin Panel) ---

// GET (para o frontend - SEMPRE remove a password)
export async function getEmployees(): Promise<Employee[]> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const employees = await db.collection(COLLECTION).find({}).sort({ name: 1 }).toArray()
    
    return employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      telefone: emp.telefone, // <-- ADICIONADO
      role: emp.role,
      unavailable: emp.unavailable || { weekdays: [], dates: [] }
    })) as Employee[]
  } catch (error) {
    console.error('Erro ao buscar funcionários:', error)
    return []
  }
}

// GET por ID (para o frontend - SEMPRE remove a password)
export async function getEmployeeById(id: string): Promise<Employee | null> {
   try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const emp = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) })
    
    if (!emp) return null
    
    return {
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      telefone: emp.telefone, // <-- ADICIONADO
      role: emp.role,
      unavailable: emp.unavailable || { weekdays: [], dates: [] }
    } as Employee
  } catch (error) {
    console.error('Erro ao buscar funcionário por ID:', error)
    return null
  }
}

// CREATE (encripta a password)
export async function createEmployee(employee: EmployeeWithPassword): Promise<string> {
  try {
    if (!employee.password) {
      throw new Error('Password é obrigatória ao criar funcionário');
    }
    const hashedPassword = await bcrypt.hash(employee.password, 10);

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const result = await db
      .collection(COLLECTION)
      .insertOne({
        name: employee.name,
        email: employee.email,
        telefone: employee.telefone, // <-- ADICIONADO
        role: employee.role,
        unavailable: employee.unavailable,
        password: hashedPassword, // <-- Guardar encriptada
        createdAt: new Date(),
        updatedAt: new Date()
      })
    return result.insertedId.toString()
  } catch (error) {
    console.error('Erro ao criar funcionário:', error)
    throw error
  }
}

// UPDATE (lida com a password se for alterada)
export async function updateEmployee(id: string, employee: Partial<EmployeeWithPassword>): Promise<boolean> {
  try {
    const dataToUpdate: any = { ...employee };

    if (employee.password) {
      dataToUpdate.password = await bcrypt.hash(employee.password, 10);
    } else {
      delete dataToUpdate.password; 
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const result = await db
      .collection(COLLECTION)
      .updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: {
            ...dataToUpdate,
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

// DELETE (está ótimo como o tinhas)
export async function deleteEmployee(id: string): Promise<boolean> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    if (!id || !ObjectId.isValid(id)) {
      console.error('❌ ID inválido:', id)
      return false
    }
    
    const objectId = new ObjectId(id);
    const result = await db.collection(COLLECTION).deleteOne({ _id: objectId })
    
    return result.deletedCount === 1
  } catch (error) {
    console.error('💥 Erro no service deleteEmployee:', error)
    throw error
  }
}