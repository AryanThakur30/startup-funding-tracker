/**
 * Authentication Routes
 * Login, register, and token management
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

/**
 * POST /auth/login
 * User login
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format',
                code: 'INVALID_EMAIL'
            });
        }

        // Attempt login
        const result = await authService.login(email, password);

        if (!result.success) {
            return res.status(401).json({
                success: false,
                error: result.error,
                code: 'AUTH_FAILED'
            });
        }

        res.json({
            success: true,
            data: {
                user: result.user,
                token: result.token,
                refreshToken: result.refreshToken,
                expiresIn: '24h'
            }
        });
    } catch (error) {
        logger.error('Login route error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Login failed',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * POST /auth/register
 * User registration
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
                code: 'MISSING_FIELDS'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format',
                code: 'INVALID_EMAIL'
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters',
                code: 'WEAK_PASSWORD'
            });
        }

        const result = await authService.register(email, password, fullName);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
                code: 'REGISTRATION_FAILED'
            });
        }

        res.status(201).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        logger.error('Registration route error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required',
                code: 'MISSING_TOKEN'
            });
        }

        const result = await authService.refreshAccessToken(refreshToken);

        if (!result.success) {
            return res.status(401).json({
                success: false,
                error: result.error,
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        res.json({
            success: true,
            data: {
                token: result.token,
                refreshToken: result.refreshToken,
                expiresIn: '24h'
            }
        });
    } catch (error) {
        logger.error('Token refresh error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Token refresh failed',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                userId: req.user.userId,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (error) {
        logger.error('Get user error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
});

/**
 * POST /auth/logout
 * User logout (client-side token removal)
 */
router.post('/logout', authenticate, async (req, res) => {
    logger.info('User logout', { userId: req.user.userId });

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
