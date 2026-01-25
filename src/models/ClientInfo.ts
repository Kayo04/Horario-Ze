import mongoose, { Schema, Document } from 'mongoose';

export interface IClientInfo extends Document {
  reservationId: string;
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone: string;
  createdAt: Date;
}

const ClientInfoSchema: Schema = new Schema({
  reservationId: { type: String, required: true }, // Liga à reserva pelo ID
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dob: { type: String, required: true }, 
  email: { type: String, required: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ClientInfo || mongoose.model<IClientInfo>('ClientInfo', ClientInfoSchema);