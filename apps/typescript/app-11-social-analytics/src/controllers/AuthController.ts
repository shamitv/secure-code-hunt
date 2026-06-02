import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const session = await this.authService.login(String(username ?? ""), String(password ?? ""));
    if (!session) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.cookie("sessionId", session.sessionId, {
      sameSite: "lax"
    });
    return res.json({ user: session.user });
  };

  logout = (req: Request, res: Response) => {
    this.authService.logout(req.cookies?.sessionId);
    res.clearCookie("sessionId");
    return res.json({ ok: true });
  };

  me = async (req: Request, res: Response) => {
    const user = await this.authService.currentUser(req.cookies?.sessionId);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json({ user });
  };
}
