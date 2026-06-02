import { Pool } from "pg";
import { Appointment } from "../models/Appointment";

export class AppointmentRepository {
  constructor(private readonly pool: Pool) {}

  async findForPatient(patientId: number): Promise<Appointment[]> {
    const result = await this.pool.query("SELECT * FROM appointments WHERE patient_id = $1", [patientId]);
    return result.rows.map(this.rowToAppointment);
  }

  async findForDoctor(doctorId: number): Promise<Appointment[]> {
    const result = await this.pool.query("SELECT * FROM appointments WHERE doctor_id = $1", [doctorId]);
    return result.rows.map(this.rowToAppointment);
  }

  async findAll(): Promise<Appointment[]> {
    const result = await this.pool.query("SELECT * FROM appointments");
    return result.rows.map(this.rowToAppointment);
  }

  async findById(id: number): Promise<Appointment | undefined> {
    const result = await this.pool.query("SELECT * FROM appointments WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    return this.rowToAppointment(result.rows[0]);
  }

  async create(data: {
    patientId: number;
    doctorId: number;
    date: string;
    timeSlot: string;
  }): Promise<Appointment> {
    const result = await this.pool.query(
      "INSERT INTO appointments (patient_id, doctor_id, date, time_slot, status) VALUES ($1, $2, $3, $4, 'SCHEDULED') RETURNING *",
      [data.patientId, data.doctorId, data.date, data.timeSlot]
    );
    return this.rowToAppointment(result.rows[0]);
  }

  private rowToAppointment(row: Record<string, unknown>): Appointment {
    return {
      id: Number(row.id),
      patientId: Number(row.patient_id),
      doctorId: Number(row.doctor_id),
      date: String(row.date),
      timeSlot: String(row.time_slot),
      status: String(row.status),
      doctorNotes: row.doctor_notes ? String(row.doctor_notes) : ""
    };
  }
}
