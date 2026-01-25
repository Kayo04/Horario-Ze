import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Reservation from '@/models/Reservation';

export async function GET() {
  try {
    // FIX: Removed () because connectDB is a Promise, not a function
    await connectDB;
    
    const todayStr = new Date().toISOString().split('T')[0];

    const reservations = await Reservation.find({
      datetime: { $regex: `^${todayStr}` } 
    }).sort({ datetime: 1 });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar reservas' }, { status: 500 });
  }
}