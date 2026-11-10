import { Request, Response, NextFunction } from "express";

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({
    ok: false,
    error: { message, ...(err.details ? { details: err.details } : {}) },
  });
}
