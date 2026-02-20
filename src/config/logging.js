const winston = require("winston");
const fs = require("fs");
const path = require("path");
const { combine, timestamp, printf, colorize, align, errors, splat } =
  winston.format;

const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const buildLogFormat = ({ enableColors = false } = {}) =>
  combine(
    errors({ stack: true }),
    splat(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    align(),
    ...(enableColors ? [colorize()] : []),
    printf(({ level, message, timestamp, stack, ...meta }) => {
      const baseMessage = stack || message;
      const metaKeys = Object.keys(meta).filter((key) => key !== "level");
      const metaString =
        metaKeys.length > 0 ? ` ${JSON.stringify(meta, null, 0)}` : "";
      return `${timestamp} [${level}]: ${baseMessage}${metaString}`;
    }),
  );

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: buildLogFormat({ enableColors: false }),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: buildLogFormat({ enableColors: true }),
    }),

    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: buildLogFormat({ enableColors: false }),
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: buildLogFormat({ enableColors: false }),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      format: buildLogFormat({ enableColors: false }),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
      format: buildLogFormat({ enableColors: false }),
    }),
  ],
});

module.exports = logger;
