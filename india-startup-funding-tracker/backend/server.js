/**
 * Main Server Entry Point
 * Express.js backend server with all middleware and routes
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const config = require('./config');
const logger = require('./src/utils/logger');
const databaseService = require('./src/services/database.service');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const fundingsRoutes = require('./src/routes/fundings.routes');
const pipelineRoutes = require('./src/routes/pipeline.routes');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip
        });
    });

    next();
});

// Health check endpoint (public)
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use(`${config.server.apiPrefix}/auth`, authRoutes);
app.use(`${config.server.apiPrefix}/fundings`, fundingsRoutes);
app.use(`${config.server.apiPrefix}/pipeline`, pipelineRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    res.status(500).json({
        success: false,
        error: config.server.nodeEnv === 'production'
            ? 'Internal server error'
            : err.message,
        code: 'SERVER_ERROR'
    });
});

// Initialize server
async function startServer() {
    try {
        // Connect to database
        logger.info('Connecting to database...');
        await databaseService.connect();
        logger.info('Database connected successfully');

        // Start server
        const port = config.server.port;
        app.listen(port, () => {
            logger.info(`Server started on port ${port}`, {
                env: config.server.nodeEnv,
                port
            });
            console.log(`🚀 Indian Startup Funding Tracker API`);
            console.log(`   Server: http://localhost:${port}`);
            console.log(`   API: http://localhost:${port}${config.server.apiPrefix}`);
            console.log(`   Health: http://localhost:${port}/health`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
