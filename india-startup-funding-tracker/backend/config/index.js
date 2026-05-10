/**
 * Configuration Management
 * Environment-based configuration for production deployment
 */

require('dotenv').config();

module.exports = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3001,
        nodeEnv: process.env.NODE_ENV || 'development',
        apiPrefix: '/api/v1'
    },

    // Supabase Configuration
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
        connectionString: process.env.DATABASE_URL || ''
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },

    // External API Configuration
    apis: {
        gdelt: {
            baseUrl: 'https://api.gdeltproject.org/api/v2',
            apiKey: process.env.GDELT_API_KEY || '',
            maxRecords: 250
        },
        mediastack: {
            baseUrl: 'http://api.mediastack.com/v1',
            apiKey: process.env.MEDIASTACK_API_KEY || '',
            countries: 'in',
            categories: 'business'
        }
    },

    // Data Pipeline Configuration
    pipeline: {
        historicalDateRange: {
            start: '2026-01-01',
            end: '2026-02-28'
        },
        liveDateRange: {
            start: '2026-03-01',
            end: '2026-03-24'
        },
        batchSize: 100,
        retryAttempts: 3,
        retryDelay: 5000
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        logDir: './logs',
        maxFiles: 7,
        maxSize: '10m'
    },

    // Rate Limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    },

    // CORS Configuration
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    }
};
