import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ClientInfo from '@/models/ClientInfo';

export async function POST(req: Request) {
  try {
    // FIX: Removed () because connectDB is a Promise, not a function
    await connectDB; 
    
    const data = await req.json();

    await ClientInfo.create(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao guardar cliente' }, { status: 500 });
  }
}