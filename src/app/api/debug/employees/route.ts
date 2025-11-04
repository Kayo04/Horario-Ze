// app/api/debug/employees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db('horaios')
    
    const employees = await db.collection('employees').find({}).toArray()
    
    const simplifiedEmployees = employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      role: emp.role
    }))
    
    return NextResponse.json(simplifiedEmployees)
  } catch (error) {
    console.error('Erro no debug:', error)
    return NextResponse.json({ error: 'Erro no debug' }, { status: 500 })
  }
}