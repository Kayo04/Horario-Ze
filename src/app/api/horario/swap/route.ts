import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Shift from '@/models/Shifts';
import SwapLog from '@/models/SwapLog';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGODB_URI) throw new Error('Define MONGODB_URI no .env');
  return mongoose.connect(MONGODB_URI);
};

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { date, timeSlot, originalEmployee, newEmployee } = body;

    if (!date || !timeSlot || !originalEmployee || !newEmployee) {
      return NextResponse.json({ 
        error: 'Dados incompletos. date, timeSlot, originalEmployee, newEmployee são obrigatórios.' 
      }, { status: 400 });
    }

    if (originalEmployee === newEmployee) {
      return NextResponse.json({ 
        error: 'O funcionário original e o novo são iguais.' 
      }, { status: 400 });
    }

    await connectDB();

    // Parse the time slot to get startTime and endTime
    // Time slots are like "10:00 - 10:30"
    const [slotStart, slotEnd] = timeSlot.split(' - ').map((t: string) => t.trim());

    // Find the shift that COVERS this time slot
    // DB stores consolidated blocks (e.g., startTime: "09:00", endTime: "14:00")
    // We need to find the shift where slotStart falls within [shift.startTime, shift.endTime)
    const allShiftsForSlot = await Shift.find({
      date: date,
      employeeCode: originalEmployee,
      startTime: { $lte: slotStart },
      endTime: { $gt: slotStart },
    });

    const shift = allShiftsForSlot[0];

    if (!shift) {
      return NextResponse.json({ 
        error: 'Turno não encontrado.' 
      }, { status: 404 });
    }

    // Authorization check: only the shift owner or admins can swap
    const user = session.user as any;
    const isAdmin = user.role === 'admin';

    if (!isAdmin) {
      // Get the employee's code from the database
      const client = await clientPromise;
      const db = client.db('horaios');
      const employee = await db.collection('employees').findOne({ 
        email: user.email 
      });

      if (!employee || employee.code !== originalEmployee) {
        return NextResponse.json({ 
          error: 'Só pode trocar os seus próprios turnos.' 
        }, { status: 403 });
      }
    }

    // Perform the swap: update the shift's employeeCode
    shift.employeeCode = newEmployee;
    await shift.save();

    // Create a swap log entry
    await SwapLog.create({
      date,
      timeSlot,
      originalEmployee,
      newEmployee,
      swappedBy: user.id || user.email,
      swappedByName: user.name || 'Desconhecido',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Troca realizada com sucesso!' 
    });
  } catch (error) {
    console.error('Erro ao trocar turno:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
