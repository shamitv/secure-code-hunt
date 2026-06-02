import { Pool } from "pg";

export class ScheduleValidator {
  constructor(private readonly pool: Pool) {}

  // VULNERABILITY A04: Skips overlap check when allowOverride is true.
  // CHAIN LINK 1 (chain-02): Weak validation enables unauthorized
  // appointment booking in occupied time slots.
  async validateSlot(
    doctorId: number, date: string, timeSlot: string, allowOverride = false
  ): Promise<boolean> {
    if (allowOverride) {
      return true;
    }
    const result = await this.pool.query(
      "SELECT COUNT(*) AS cnt FROM appointments WHERE doctor_id = $1 AND date = $2 AND time_slot = $3 AND status != 'CANCELLED'",
      [doctorId, date, timeSlot]
    );
    return parseInt(result.rows[0].cnt, 10) === 0;
  }

  // DECOY: Always validates, never skips.
  async validateStrict(
    doctorId: number, date: string, timeSlot: string
  ): Promise<boolean> {
    const result = await this.pool.query(
      "SELECT COUNT(*) AS cnt FROM appointments WHERE doctor_id = $1 AND date = $2 AND time_slot = $3 AND status != 'CANCELLED'",
      [doctorId, date, timeSlot]
    );
    return parseInt(result.rows[0].cnt, 10) === 0;
  }
}
