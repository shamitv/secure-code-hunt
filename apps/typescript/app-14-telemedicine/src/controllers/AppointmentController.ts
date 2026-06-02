import { Request, Response } from "express";
import { AppointmentService } from "../services/AppointmentService";
import { AuthService } from "../services/AuthService";
import { ScheduleValidator } from "../services/ScheduleValidator";

export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly authService: AuthService,
    private readonly scheduleValidator: ScheduleValidator
  ) {}

  list = async (req: Request, res: Response) => {
    const user = await this.authService.requireUser(req.cookies?.token);
    if (!user) {
      return res.status(401).json({ message: "Access denied." });
    }
    const appointments = await this.appointmentService.listForUser(user);
    return res.json({ appointments });
  };

  detail = async (req: Request, res: Response) => {
    const user = await this.authService.requireUser(req.cookies?.token);
    if (!user) {
      return res.status(401).json({ message: "Access denied." });
    }

    const appointment = await this.appointmentService.getAppointmentDetail(Number(req.params.id));
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }
    return res.json(appointment);
  };

  book = async (req: Request, res: Response) => {
    const user = await this.authService.requireUser(req.cookies?.token);
    if (!user) {
      return res.status(401).json({ message: "Access denied." });
    }

    const { doctorId, date, timeSlot, allowOverride } = req.body;
    if (!doctorId || !date || !timeSlot) {
      return res.status(400).json({ message: "doctorId, date, and timeSlot required." });
    }

    const valid = await this.scheduleValidator.validateSlot(
      Number(doctorId),
      String(date),
      String(timeSlot),
      Boolean(allowOverride)
    );
    if (!valid) {
      return res.status(409).json({ message: "Time slot already booked." });
    }

    const appointment = await this.appointmentService.bookAppointment({
      patientId: user.userId,
      doctorId: Number(doctorId),
      date: String(date),
      timeSlot: String(timeSlot)
    });
    return res.status(201).json(appointment);
  };
}
