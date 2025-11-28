import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Shift from '@/models/Shifts'; // Certifica-te que o nome do ficheiro do modelo é Shifts.ts ou Shift.ts

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGODB_URI) throw new Error('Define MONGODB_URI no .env');
  return mongoose.connect(MONGODB_URI);
};

export async function GET(
  req: Request,
  { params }: { params: { employeeCode: string } } // ✅ AQUI: Tem de coincidir com o nome da pasta
) {
  // O Next.js injeta o valor da URL aqui
  const code = params.employeeCode;

  try {
    await connectDB();
    
    // Buscar turnos e ordenar por data (mais recente primeiro)
    const shifts = await Shift.find({ employeeCode: code }).sort({ date: -1 });
    
    return NextResponse.json({ shifts });
  } catch (error) {
    console.error("Erro MongoDB:", error);
    return NextResponse.json({ shifts: [] }, { status: 500 });
  }
}