import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Shifts from '@/models/Shifts'; // Mantido 'Shifts' para consistência com o outro ficheiro

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGODB_URI) throw new Error('Define MONGODB_URI no .env');
  return mongoose.connect(MONGODB_URI);
};

// Next.js 15: params é uma Promise, por isso usamos 'props' e fazemos await
export async function GET(
  req: Request,
  props: { params: Promise<{ employeeCode: string }> }
) {
  try {
    // AWAIT é obrigatório no Next.js 15 para params dinâmicos
    const params = await props.params;
    const code = params.employeeCode;

    await connectDB();
    
    // Buscar turnos e ordenar por data (mais recente primeiro)
    // Nota: Certifica-te que o campo na BD é 'employeeCode' ou apenas 'code'
    // Se o modelo user 'code', muda para: { code: code }
    const shifts = await Shifts.find({ employeeCode: code }).sort({ date: -1 });
    
    return NextResponse.json({ shifts });
  } catch (error) {
    console.error("Erro MongoDB ao buscar turnos:", error);
    return NextResponse.json({ shifts: [], error: 'Erro ao buscar turnos' }, { status: 500 });
  }
}