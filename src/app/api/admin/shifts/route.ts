import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Shifts from '@/models/Shifts';

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGODB_URI) throw new Error('Define MONGODB_URI no .env');
  return mongoose.connect(MONGODB_URI);
};

// --- EDITAR TURNO (PUT) ---
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    console.log("Recebido pedido de EDIÇÃO:", body);

    const { id, startTime, endTime } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'ID inválido ou não fornecido.' }, { status: 400 });
    }

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    
    let totalMinutes = endMin - startMin;
    if (totalMinutes < 0) totalMinutes += 24 * 60; 

    const totalHours = Number((totalMinutes / 60).toFixed(2));

    const updatedShift = await Shifts.findByIdAndUpdate(
      id, 
      { startTime, endTime, totalHours }, 
      { new: true }
    );

    if (!updatedShift) {
        return NextResponse.json({ error: 'Turno não encontrado na base de dados.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, shift: updatedShift });

  } catch (error: any) {
    console.error('ERRO CRÍTICO API PUT:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}

// --- APAGAR TURNO OU TURNOS (DELETE) ---
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    
    // Verifica se é apagar UM ou VÁRIOS
    const id = searchParams.get('id');
    const ids = searchParams.get('ids'); // Ex: "id1,id2,id3"

    console.log("Recebido pedido de APAGAR. Single:", id, "Multi:", ids);

    // CASO 1: Apagar em massa
    if (ids) {
        const idList = ids.split(',').filter(i => mongoose.Types.ObjectId.isValid(i));
        
        if (idList.length === 0) {
            return NextResponse.json({ error: 'Nenhum ID válido fornecido.' }, { status: 400 });
        }

        const result = await Shifts.deleteMany({ _id: { $in: idList } });
        return NextResponse.json({ success: true, count: result.deletedCount });
    }

    // CASO 2: Apagar um só (comportamento antigo)
    if (id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
        }
        const result = await Shifts.findByIdAndDelete(id);
        if (!result) return NextResponse.json({ error: 'Turno não encontrado.' }, { status: 404 });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Nenhum ID fornecido.' }, { status: 400 });
    
  } catch (error: any) {
    console.error('ERRO CRÍTICO API DELETE:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}