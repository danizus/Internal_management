import { Request, Response } from "express";
import {
  registerService,
  loginService,
  getCurrentUserService,
} from "../services/auth.service.js";
import { setAuthCookie, clearAuthCookie } from "../utils/cookies.js";

export const authController = {
  async register(req: Request, res: Response) {
    const result = await registerService(req.body);
    setAuthCookie(res, result.token);
    res.status(201).json({ ok: true, data: result });
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await loginService(email, password);
    setAuthCookie(res, result.token);
    res.json({ ok: true, data: result });
  },

  async logout(_req: Request, res: Response) {
    clearAuthCookie(res);
    res.json({ ok: true, data: { message: "Logged out successfully" } });
  },

  async me(req: Request, res: Response) {
    const user = await getCurrentUserService(req.user!.user_id);
    res.json({ ok: true, data: user });
  },
};
