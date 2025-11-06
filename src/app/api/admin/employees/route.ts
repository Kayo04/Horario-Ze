import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb' // ⬅️ ALTERAÇÃO 1: Importar o clientPromise

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // ⬅️ ALTERAÇÃO 2: Usar a mesma lógica de conexão do teu outro ficheiro
    const client = await clientPromise
    const db = client.db('horaios')
    // ----------------------------------------------------

    const employeesCursor = db.collection('employees').find(
      {
        role: 'employee',
      },
      {
        projection: {
          name: 1,
          email: 1,
        },
      }
    )

    const employeesArray = await employeesCursor.toArray()

    const employees = employeesArray.map((emp) => ({
      id: emp._id.toString(), // Frontend precisa disto como string
      name: emp.name,
      email: emp.email,
    }))

    return NextResponse.json({ employees })
  } catch (error: any) {
    console.error('Erro ao listar funcionários (API Admin):', error)
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}