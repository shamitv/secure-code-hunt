# Phase 02 TODO — Redis + Schedule Validation (A04)

## Pre-requisites
- [ ] Phase 1 complete and verified
- [ ] Read vuln-inventory.md — confirm no-touch files

## Redis Configuration
- [ ] Create `src/config/redis.ts` with ioredis client:
  - Connect to REDIS_URL from appConfig
  - Export `getRedis()` singleton
  - Graceful error handling (log, don't crash — cache is best-effort)
- [ ] Confirm `REDIS_URL` in `.env.example` (already added in Phase 1)

## Appointment Cache Migration
- [ ] Rewrite `src/cache/AppointmentCache.ts`:
  - `get(id)` → `redis.get("appointment:${id}")` with JSON parse
  - `put(appointment)` → `redis.set("appointment:${id}", JSON, "EX", 3600)`
  - `clear(id)` → `redis.del("appointment:${id}")`
  - Fallback to repository if Redis unavailable (catch errors gracefully)
- [ ] Update `src/app.ts` to inject Redis client into AppointmentCache

## Session Token Blacklisting
- [ ] Update `src/controllers/AuthController.ts` → `logout()`:
  - Add: `await redis.set("session:blacklist:${token}", "1", "EX", 7200)`
  - Preserve existing `res.clearCookie("token")`
  - Preserve VULNERABILITY A07 cookie-flag comment
- [ ] Update `src/services/AuthService.ts` → `requireUser()`:
  - Check if token is blacklisted via Redis before calling `tokens.verify()`
  - If blacklisted, return undefined
  - Use `isTokenBlacklisted(token)` helper

## Schedule Validator (A04 + Chain-02 Step 1)
- [ ] Create `src/services/ScheduleValidator.ts`:
  ```typescript
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
        "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND date = $2 AND time_slot = $3 AND status != 'CANCELLED'",
        [doctorId, date, timeSlot]
      );
      return parseInt(result.rows[0].count) === 0;
    }

    // DECOY: Always validates, never skips.
    async validateStrict(
      doctorId: number, date: string, timeSlot: string
    ): Promise<boolean> {
      const result = await this.pool.query(
        "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND date = $2 AND time_slot = $3 AND status != 'CANCELLED'",
        [doctorId, date, timeSlot]
      );
      return parseInt(result.rows[0].count) === 0;
    }
  }
  ```

## New Endpoint: POST /api/appointments
- [ ] Add `book()` method to `AppointmentController.ts`:
  - Extract user from token via `authService.requireUser`
  - Call `scheduleValidator.validateSlot(doctorId, date, timeSlot, allowOverride)`
  - If valid, call `appointmentRepository.create(...)` (new method)
  - Return created appointment
- [ ] Add `create()` method to `AppointmentRepository.ts`:
  ```sql
  INSERT INTO appointments (patient_id, doctor_id, date, time_slot, status)
  VALUES ($1, $2, $3, $4, 'SCHEDULED') RETURNING *
  ```
- [ ] Add `router.post("/", controller.book)` to `appointmentRoutes.ts`
- [ ] Wire `ScheduleValidator` into `AppointmentController` via `app.ts`

## Commit Cadence
- [ ] Commit after Redis config + cache migration:
  `git add -A && git commit -m "app-14 phase-02: Redis client, cache migration, session blacklisting"`
- [ ] Commit after schedule validator + POST endpoint:
  `git add -A && git commit -m "app-14 phase-02: ScheduleValidator with A04 vuln, POST /api/appointments"`

## Verification
- [ ] `npm run build` passes
- [ ] Redis cache: book appointment, get detail → served from cache
- [ ] Session blacklist: login → get token → logout → try /api/me with old token → 401
- [ ] `POST /api/appointments` with `allowOverride: true` → succeeds with overlap
- [ ] `POST /api/appointments` with `allowOverride: false` → blocks overlap
- [ ] VULNERABILITY A04 annotation present at `ScheduleValidator.ts:validateSlot()`
- [ ] CHAIN LINK 1 (chain-02) annotation present at same location
- [ ] Decoy `validateStrict()` present and functional
- [ ] Existing vulnerabilities (chain-01, etc.) still exploitable
- [ ] No changes to no-touch files (TokenService.ts, AppointmentService.ts vuln code)

## Phase Status Report
- [ ] Create `phase-02/status-report.md`
