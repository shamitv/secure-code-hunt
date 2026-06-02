import Redis from "ioredis";
import { Appointment } from "../models/Appointment";

export class AppointmentCache {
  constructor(private readonly redis: Redis) {}

  async get(id: number): Promise<Appointment | undefined> {
    try {
      const data = await this.redis.get(`appointment:${id}`);
      if (!data) return undefined;
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  async put(appointment: Appointment): Promise<void> {
    try {
      await this.redis.set(
        `appointment:${appointment.id}`,
        JSON.stringify(appointment),
        "EX",
        3600
      );
    } catch {
      // cache failure is non-critical
    }
  }

  async clear(id: number): Promise<void> {
    try {
      await this.redis.del(`appointment:${id}`);
    } catch {
      // cache failure is non-critical
    }
  }
}
