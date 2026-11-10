import { Request, Response } from "express";
import {
  processWhmcsWebhookService,
  verifyWhmcsWebhookSignature,
  WhmcsWebhookPayload,
} from "../services/whmcsWebhook.service.js";
import { syncFromWhmcsService } from "../services/whmcsApi.service.js";
import { listSyncLogsDb } from "../db/whmcsSync.db.js";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";

export const whmcsController = {
  async webhook(req: Request, res: Response) {
    const signature =
      (req.headers["x-whmcs-signature"] as string | undefined) ||
      (req.headers["x-signature"] as string | undefined);

    const rawBody =
      (req as unknown as { rawBody?: string }).rawBody ||
      JSON.stringify(req.body);

    const isSignatureValid = verifyWhmcsWebhookSignature(signature, rawBody);
    if (!isSignatureValid) {
      throw new HttpError(401, "Invalid webhook HMAC signature");
    }

    const validatedPayload = req.body as WhmcsWebhookPayload;
    const result = await processWhmcsWebhookService(
      validatedPayload,
      rawBody,
      signature
    );

    res.json({ ok: true, data: result });
  },

  async status(_req: Request, res: Response) {
    res.json({
      ok: true,
      data: {
        has_webhook_secret: Boolean(
          env.WHMCS_WEBHOOK_SECRET &&
            env.WHMCS_WEBHOOK_SECRET !== "dev-whmcs-webhook-secret"
        ),
        has_api_url: Boolean(env.WHMCS_API_URL),
        has_api_credentials: Boolean(
          env.WHMCS_API_IDENTIFIER && env.WHMCS_API_SECRET
        ),
        api_url: env.WHMCS_API_URL || null,
      },
    });
  },

  async sync(_req: Request, res: Response) {
    const result = await syncFromWhmcsService();
    res.json({ ok: true, data: result });
  },

  async logs(req: Request, res: Response) {
    const limit = Math.min(
      100,
      req.query.limit ? parseInt(String(req.query.limit), 10) : 50
    );
    const logs = await listSyncLogsDb(limit);
    res.json({ ok: true, data: logs });
  },
};
