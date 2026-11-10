import express from "express";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { countriesRouter } from "./routes/countries.js";
import { vendorsRouter } from "./routes/vendors.js";
import { displayPackagesRouter } from "./routes/displayPackages.js";
import { clientsRouter } from "./routes/clients.js";
import { purchasesRouter } from "./routes/purchases.js";
import { whmcsRouter } from "./routes/whmcs.js";
import { refundsRouter } from "./routes/refunds.js";
import { expensesRouter } from "./routes/expenses.js";
import { financialsRouter } from "./routes/financials.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { globalRateLimiter } from "./middleware/rateLimiter.js";
import { cookieParserMiddleware } from "./utils/cookies.js";

export const app = express();

// Capture raw body buffer for HMAC webhook signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody?: string }).rawBody = buf.toString();
    },
  })
);

app.use(cookieParserMiddleware);
app.use(requestLogger);

// Global Rate Limiter: 100 requests per 15 minutes per IP
app.use("/api", globalRateLimiter);

// Routes
app.use("/api", healthRouter);
app.use("/api", authRouter);
app.use("/api", countriesRouter);
app.use("/api", vendorsRouter);
app.use("/api", displayPackagesRouter);
app.use("/api", clientsRouter);
app.use("/api", purchasesRouter);
app.use("/api", whmcsRouter);
app.use("/api", refundsRouter);
app.use("/api", expensesRouter);
app.use("/api", financialsRouter);

app.use(errorHandler);
