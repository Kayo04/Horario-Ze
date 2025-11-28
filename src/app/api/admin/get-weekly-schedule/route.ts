import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Shift from '@/models/Shifts';

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGODB_URI) throw new Error('Define MONGODB_URI no .env');
  return mongoose.connect(MONGODB_URI);
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
        return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
    }

    await connectDB();
    
    // Busca turnos apenas dentro da semana pedida
    const shifts = await Shift.find({
        date: { $gte: start, $lte: end }
    });

    return NextResponse.json({ shifts });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}