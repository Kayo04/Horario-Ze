import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Shifts from '@/models/Shifts';

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGODB_URI) throw new Error('Define MONGODB_URI no .env');
  return mongoose.connect(MONGODB_URI);
};

// ATUALIZAR (EDITAR) UM TURNO
export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, startTime, endTime } = await req.json();

    if (!id || !startTime || !endTime) {
        return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 });
    }

    // Recalcular horas totais
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const totalHours = (endMin - startMin) / 60;

    await Shifts.findByIdAndUpdate(id, {
        startTime,
        endTime,
        totalHours
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

// APAGAR UM TURNO
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 });

    await Shifts.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao apagar' }, { status: 500 });
  }
}