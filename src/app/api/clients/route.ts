import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Reservation from '@/models/Reservation';

export async function GET() {
  try {
    console.log("🔍 [API CLIENTS] A iniciar busca de clientes...");

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI not defined');

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log("🔌 [API CLIENTS] Conexão MongoDB estabelecida.");
    }

    // 1. Buscar TODAS as reservas, sem filtros, para ver o que existe
    const allReservations = await Reservation.find({}).select('customerName clients');
    console.log(`📊 [API CLIENTS] Total de reservas no sistema: ${allReservations.length}`);

    // 2. Filtrar apenas as que têm clientes
    const reservationsWithClients = allReservations.filter((r: any) => r.clients && r.clients.length > 0);
    console.log(`✅ [API CLIENTS] Reservas com clientes preenchidos: ${reservationsWithClients.length}`);

    // 3. Processar a lista
    const allClients: any[] = [];

    reservationsWithClients.forEach((res: any) => {
      console.log(`📝 Processando reserva de: ${res.customerName} (ID: ${res._id}) - Clientes: ${res.clients.length}`);
      
      res.clients.forEach((client: any) => {
        allClients.push({
          _id: client._id || Math.random().toString(),
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          dob: client.dob,
          checkInTime: client.checkInTime,
          visitDate: res.date || "Data N/A",
          eventType: res.eventType || "Geral"
        });
      });
    });

    console.log(`🚀 [API CLIENTS] A enviar ${allClients.length} clientes para o Frontend.`);

    return NextResponse.json(allClients);

  } catch (error: any) {
    console.error("❌ [API CLIENTS] ERRO FATAL:", error);
    return NextResponse.json({ error: 'Erro ao buscar clientes: ' + error.message }, { status: 500 });
  }
}