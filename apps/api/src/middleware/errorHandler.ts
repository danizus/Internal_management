import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export class HttpError extends Error implements ApiError {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        message: "Validation failed",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({
    ok: false,
    error: { message, ...(err.details ? { details: err.details } : {}) },
  });
}
