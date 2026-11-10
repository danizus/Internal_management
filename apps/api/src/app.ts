import express from "express";
import { healthRouter } from "./routes/health.js";
import { countriesRouter } from "./routes/countries.js";
import { vendorsRouter } from "./routes/vendors.js";
import { displayPackagesRouter } from "./routes/displayPackages.js";
import { clientsRouter } from "./routes/clients.js";
import { purchasesRouter } from "./routes/purchases.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

export const app = express();

app.use(express.json());
app.use(requestLogger);

app.use("/api", healthRouter);
app.use("/api", countriesRouter);
app.use("/api", vendorsRouter);
app.use("/api", displayPackagesRouter);
app.use("/api", clientsRouter);
app.use("/api", purchasesRouter);

app.use(errorHandler);
