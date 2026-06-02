import bcrypt from "bcryptjs";
import Redis from "ioredis";
import { AuthenticatedUser } from "../models/User";
import { AuditEventProducer } from "../mq/AuditEventProducer";
import { UserRepository } from "../repositories/UserRepository";
import { TokenService } from "./TokenService";

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly auditEvents: AuditEventProducer,
    private readonly redis: Redis
  ) {}

  async register(username: string, password: string) {
    return this.users.savePatient(username, password);
  }

  async login(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return undefined;
    }

    const payload: AuthenticatedUser = { userId: user.id, username: user.username, role: user.role };
    const token = this.tokens.sign(payload);
    this.auditEvents.publish("auth.login", { userId: user.id });
    return {
      token,
      user: payload
    };
  }

  async logout(token: string | undefined) {
    if (token) {
      try {
        await this.redis.set(`session:blacklist:${token}`, "1", "EX", 7200);
      } catch {
        // non-critical
      }
    }
  }

  async requireUser(token: string | undefined) {
    if (!token) return undefined;
    try {
      const blacklisted = await this.redis.get(`session:blacklist:${token}`);
      if (blacklisted) return undefined;
    } catch {
      // if redis is down, proceed; non-critical
    }
    return this.tokens.verify(token);
  }
}
