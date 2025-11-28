import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Shift from '@/models/Shifts';

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGODB_URI) throw new Error('Define MONGODB_URI no .env');
  return mongoose.connect(MONGODB_URI);
};

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { shifts } = body;

    if (!shifts || shifts.length === 0) {
      return NextResponse.json({ success: false, message: 'Sem turnos para guardar.' }, { status: 400 });
    }

    // 1. Descobrir intervalo de datas (para saber qual semana estamos a atualizar)
    const sortedShifts = [...shifts].sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const startDate = sortedShifts[0].date;
    const endDate = sortedShifts[sortedShifts.length - 1].date;

    // 2. LIMPEZA: Apagar tudo nesse intervalo de datas para reescrever a limpo
    // Isto garante que se apagaste alguém da escala no frontend, essa pessoa sai da BD.
    await Shift.deleteMany({
      date: { $gte: startDate, $lte: endDate }
    });

    // 3. Inserir os novos dados
    await Shift.insertMany(shifts);

    return NextResponse.json({ 
      success: true, 
      message: 'Horário oficial guardado com sucesso!' 
    });

  } catch (error) {
    console.error("Erro MongoDB:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}