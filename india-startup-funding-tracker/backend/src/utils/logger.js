/**
 * Production-Grade Logger
 * Structured logging with file rotation support
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure log directory exists
const logDir = path.resolve(config.logging.logDir);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for structured logging
const structuredFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

// Create transports
const transports = [
    // Console transport
    new winston.transports.Console({
        format: config.server.nodeEnv === 'production' ? structuredFormat : consoleFormat,
        level: config.logging.level
    }),

    // Error log file
    new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }),

    // Combined log file
    new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 7
    }),

    // Pipeline-specific log
    new winston.transports.File({
        filename: path.join(logDir, 'pipeline.log'),
        level: 'info',
        maxsize: 10485760,
        maxFiles: 14
    })
];

// Create logger instance
const logger = winston.createLogger({
    level: config.logging.level,
    format: structuredFormat,
    defaultMeta: { service: 'startup-funding-tracker' },
    transports
});

// Specialized logging methods for data pipeline
logger.pipelineLog = (stage, data) => {
    logger.info(`[PIPELINE] ${stage}`, {
        stage,
        timestamp: new Date().toISOString(),
        ...data
    });
};

logger.apiLog = (api, status, data) => {
    const level = status === 'success' ? 'info' : 'error';
    logger[level](`[API] ${api}`, { api, status, timestamp: new Date().toISOString(), ...data });
};

logger.dbLog = (operation, table, data) => {
    logger.info(`[DB] ${operation} on ${table}`, {
        operation,
        table,
        timestamp: new Date().toISOString(),
        ...data
    });
};

module.exports = logger;
