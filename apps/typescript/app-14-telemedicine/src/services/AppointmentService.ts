import { AppointmentCache } from "../cache/AppointmentCache";
import { AuthenticatedUser } from "../models/User";
import { AuditEventProducer } from "../mq/AuditEventProducer";
import { AppointmentRepository } from "../repositories/AppointmentRepository";
import { PatientSearchClient } from "../search/PatientSearchClient";

export class AppointmentService {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly cache: AppointmentCache,
    private readonly search: PatientSearchClient,
    private readonly auditEvents: AuditEventProducer
  ) {}

  async listForUser(user: AuthenticatedUser) {
    if (user.role === "PATIENT") {
      const appts = await this.appointments.findForPatient(user.userId);
      return appts.map(({ doctorNotes, ...summary }) => summary);
    }
    if (user.role === "DOCTOR") {
      const appts = await this.appointments.findForDoctor(user.userId);
      return appts.map(({ doctorNotes, ...summary }) => summary);
    }
    return this.appointments.findAll();
  }

  async getAppointmentDetail(appointmentId: number) {
    const cached = await this.cache.get(appointmentId);
    if (cached) {
      return cached;
    }

    // CHAIN LINK 2 (chain-01): Appointment notes are loaded by ID without owner or doctor checks.
    // VULNERABILITY A01: Patient notes endpoint exposes records through an IDOR.
    const appointment = await this.appointments.findById(appointmentId);
    if (appointment) {
      await this.cache.put(appointment);
      this.search.indexAppointment(appointment);
      this.auditEvents.publish("appointment.detail.read", { appointmentId });
    }
    return appointment;
  }

  async bookAppointment(data: {
    patientId: number;
    doctorId: number;
    date: string;
    timeSlot: string;
  }) {
    const appointment = await this.appointments.create(data);
    this.auditEvents.publish("appointment.created", {
      appointmentId: appointment.id,
      patientId: data.patientId,
      doctorId: data.doctorId
    });
    return appointment;
  }
}
