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

    const operations = shifts.map((shift: any) => ({
      updateOne: {
        filter: { 
          employeeCode: shift.employeeCode, 
          date: shift.date 
        },
        update: {
          $set: {
            startTime: shift.startTime,
            endTime: shift.endTime,
            totalHours: shift.totalHours
          }
        },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await Shift.bulkWrite(operations);
    }

    return NextResponse.json({ success: true, message: 'Guardado com sucesso!' });

  } catch (error) {
    console.error("Erro MongoDB:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}