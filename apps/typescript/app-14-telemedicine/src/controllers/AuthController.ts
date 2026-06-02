import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required." });
    }
    const user = await this.authService.register(String(username), String(password));
    return res.json({ success: true, userId: user.id });
  };

  login = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const session = await this.authService.login(String(username ?? ""), String(password ?? ""));
    if (!session) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // VULNERABILITY A07: Session token cookie is readable by browser JavaScript and not marked secure.
    res.cookie("token", session.token, {
      httpOnly: false,
      secure: false,
      maxAge: 7200000
    });
    return res.json({ success: true, user: session.user });
  };

  logout = async (req: Request, res: Response) => {
    await this.authService.logout(req.cookies?.token);
    res.clearCookie("token");
    return res.json({ success: true });
  };

  me = async (req: Request, res: Response) => {
    const user = await this.authService.requireUser(req.cookies?.token);
    if (!user) {
      return res.status(401).json({ message: "Access denied." });
    }
    return res.json({ user });
  };
}
