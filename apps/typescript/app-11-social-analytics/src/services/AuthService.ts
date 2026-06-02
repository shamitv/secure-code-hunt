import crypto from "crypto";
import { SessionCache } from "../cache/SessionCache";
import { AnalyticsEventProducer } from "../mq/AnalyticsEventProducer";
import { UserRepository } from "../repositories/UserRepository";

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionCache,
    private readonly events: AnalyticsEventProducer
  ) {}

  async login(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user || user.password !== password) {
      return undefined;
    }

    const sessionId = crypto.randomBytes(16).toString("hex");
    this.sessions.save(sessionId, user.id);
    this.events.publish("auth.login", { userId: user.id });
    return { sessionId, user: { id: user.id, username: user.username, displayName: user.display_name } };
  }

  logout(sessionId: string | undefined) {
    this.sessions.delete(sessionId);
  }

  async currentUser(sessionId: string | undefined) {
    const userId = this.sessions.get(sessionId);
    if (!userId) {
      return undefined;
    }
    const user = await this.users.findById(userId);
    return user ? { id: user.id, username: user.username, displayName: user.display_name } : undefined;
  }
}
