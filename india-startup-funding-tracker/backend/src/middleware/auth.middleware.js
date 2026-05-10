/**
 * Authentication Middleware
 * JWT token validation for protected routes
 */

const authService = require('../services/auth.service');
const logger = require('../utils/logger');

/**
 * Middleware to verify JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access token required',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.substring(7);
        const tokenResult = authService.verifyToken(token);

        if (!tokenResult.success) {
            return res.status(401).json({
                success: false,
                error: tokenResult.error,
                code: 'INVALID_TOKEN'
            });
        }

        // Attach user info to request
        req.user = tokenResult.decoded;
        next();
    } catch (error) {
        logger.error('Authentication error', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Middleware to check user role
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NOT_AUTHENTICATED'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const tokenResult = authService.verifyToken(token);

            if (tokenResult.success) {
                req.user = tokenResult.decoded;
            }
        }

        next();
    } catch (error) {
        // Silently continue without authentication
        next();
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth
};
