import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

/**
 * Validates request body using a Zod schema.
 */
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validates request query parameters using a Zod schema.
 */
export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      Object.defineProperty(req, "query", {
        value: parsed,
        writable: true,
        configurable: true,
      });
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validates request route parameters using a Zod schema.
 */
export function validateParams(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.params);
      Object.defineProperty(req, "params", {
        value: parsed,
        writable: true,
        configurable: true,
      });
      next();
    } catch (err) {
      next(err);
    }
  };
}
