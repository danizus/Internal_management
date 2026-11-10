import express from "express";
import { healthRouter } from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

export const app = express();

app.use(express.json());
app.use(requestLogger);

app.use("/api", healthRouter);

app.use(errorHandler);
