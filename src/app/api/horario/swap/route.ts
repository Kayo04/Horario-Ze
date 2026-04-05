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

// Helper: convert "HH:MM" to minutes
const timeToMin = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Helper: convert minutes to "HH:MM"
const minToTime = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Consolidate adjacent 30-min slots into blocks
// Input: sorted array of slot start times in minutes, e.g. [540, 570, 600]
// Output: array of { startTime, endTime, totalHours }
const consolidateSlots = (slotMins: number[]) => {
  if (slotMins.length === 0) return [];
  
  const sorted = [...slotMins].sort((a, b) => a - b);
  const blocks: { startTime: string; endTime: string; totalHours: number }[] = [];
  
  let blockStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    // Each slot is 30 min, so consecutive slots differ by 30
    if (current !== prev + 30 || i === sorted.length) {
      const endMin = prev + 30;
      blocks.push({
        startTime: minToTime(blockStart),
        endTime: minToTime(endMin),
        totalHours: (endMin - blockStart) / 60,
      });
      if (i < sorted.length) {
        blockStart = current;
      }
    }
    prev = current;
  }

  return blocks;
};

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    // Support both single timeSlot (legacy) and multiple selectedSlots
    const { date, timeSlot, selectedSlots, originalEmployee, newEmployee } = body;

    // Determine the slots to swap
    const slotsToSwap: string[] = selectedSlots || (timeSlot ? [timeSlot] : []);

    if (!date || slotsToSwap.length === 0 || !originalEmployee || !newEmployee) {
      return NextResponse.json({ 
        error: 'Dados incompletos.' 
      }, { status: 400 });
    }

    if (originalEmployee === newEmployee) {
      return NextResponse.json({ 
        error: 'O funcionário original e o novo são iguais.' 
      }, { status: 400 });
    }

    await connectDB();

    // Authorization check
    const user = session.user as any;
    const isAdmin = user.role === 'admin';

    if (!isAdmin) {
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

    // Parse selected slots into minute values
    // Slots are like "09:30 - 10:00" — we use the start time as the slot identifier
    const swapSlotMins = new Set(
      slotsToSwap.map(s => {
        const [start] = s.split(' - ').map(t => t.trim());
        return timeToMin(start);
      })
    );

    // Find ALL shift blocks for this employee on this date
    const existingShifts = await Shift.find({
      date: date,
      employeeCode: originalEmployee,
    });

    if (existingShifts.length === 0) {
      return NextResponse.json({ 
        error: 'Turno não encontrado.' 
      }, { status: 404 });
    }

    // Expand all existing shifts into individual 30-min slot minutes
    const allSlotMins: number[] = [];
    existingShifts.forEach(shift => {
      const startMin = timeToMin(shift.startTime);
      const endMin = timeToMin(shift.endTime);
      for (let m = startMin; m < endMin; m += 30) {
        allSlotMins.push(m);
      }
    });

    // Split: which slots stay with original, which go to new employee
    const keepSlots = allSlotMins.filter(m => !swapSlotMins.has(m));
    const swappedSlots = allSlotMins.filter(m => swapSlotMins.has(m));

    if (swappedSlots.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum turno selecionado encontrado.' 
      }, { status: 404 });
    }

    // Delete all original shifts for this employee on this date
    await Shift.deleteMany({
      date: date,
      employeeCode: originalEmployee,
    });

    // Create consolidated blocks for the slots that STAY with the original employee
    const keepBlocks = consolidateSlots(keepSlots);
    if (keepBlocks.length > 0) {
      await Shift.insertMany(
        keepBlocks.map(block => ({
          employeeCode: originalEmployee,
          date: date,
          startTime: block.startTime,
          endTime: block.endTime,
          totalHours: block.totalHours,
        }))
      );
    }

    // Create consolidated blocks for the SWAPPED slots (assigned to new employee)
    const swapBlocks = consolidateSlots(swappedSlots);
    if (swapBlocks.length > 0) {
      await Shift.insertMany(
        swapBlocks.map(block => ({
          employeeCode: newEmployee,
          date: date,
          startTime: block.startTime,
          endTime: block.endTime,
          totalHours: block.totalHours,
        }))
      );
    }

    // Create swap log entry (summarize all swapped slots)
    const summarySlot = slotsToSwap.length === 1 
      ? slotsToSwap[0] 
      : `${slotsToSwap[0].split(' - ')[0]} - ${slotsToSwap[slotsToSwap.length - 1].split(' - ')[1]} (${slotsToSwap.length} slots)`;

    await SwapLog.create({
      date,
      timeSlot: summarySlot,
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
