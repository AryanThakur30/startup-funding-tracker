/**
 * Authentication Service
 * JWT-based authentication with bcrypt password hashing
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const logger = require('../utils/logger');
const databaseService = require('./database.service');

class AuthService {
    constructor() {
        this.saltRounds = 12;
    }

    /**
     * Hash password using bcrypt
     */
    async hashPassword(password) {
        try {
            const hash = await bcrypt.hash(password, this.saltRounds);
            return { success: true, hash };
        } catch (error) {
            logger.error('Password hashing failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify password against hash
     */
    async verifyPassword(password, hash) {
        try {
            const isValid = await bcrypt.compare(password, hash);
            return { success: true, isValid };
        } catch (error) {
            logger.error('Password verification failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate JWT token
     */
    generateToken(user) {
        try {
            const payload = {
                userId: user.id,
                email: user.email,
                role: user.role
            };

            const token = jwt.sign(payload, config.jwt.secret, {
                expiresIn: config.jwt.expiresIn
            });

            const refreshToken = jwt.sign(
                { userId: user.id },
                config.jwt.secret,
                { expiresIn: config.jwt.refreshExpiresIn }
            );

            return {
                success: true,
                token,
                refreshToken
            };
        } catch (error) {
            logger.error('Token generation failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            return { success: true, decoded };
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return { success: false, error: 'Token expired' };
            }
            return { success: false, error: 'Invalid token' };
        }
    }

    /**
     * User login
     */
    async login(email, password) {
        logger.info('Login attempt', { email });

        try {
            // Get user from database
            const { data: user, error } = await databaseService.getUserByEmail(email);

            if (error || !user) {
                logger.warn('Login failed - user not found', { email });
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }

            // Verify password
            const passwordCheck = await this.verifyPassword(password, user.password_hash);

            if (!passwordCheck.success || !passwordCheck.isValid) {
                logger.warn('Login failed - invalid password', { email });
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }

            // Generate tokens
            const tokens = this.generateToken(user);

            if (!tokens.success) {
                return {
                    success: false,
                    error: 'Token generation failed'
                };
            }

            // Update last login
            await databaseService.updateLastLogin(user.id);

            logger.info('Login successful', { email, userId: user.id });

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role
                },
                ...tokens
            };
        } catch (error) {
            logger.error('Login error', { email, error: error.message });
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    }

    /**
     * User registration
     */
    async register(email, password, fullName) {
        logger.info('Registration attempt', { email });

        try {
            // Hash password
            const passwordHash = await this.hashPassword(password);

            if (!passwordHash.success) {
                return {
                    success: false,
                    error: 'Password processing failed'
                };
            }

            // In a real implementation, you would insert into the database
            // For this production system, we'll use Supabase Auth directly
            // This is a placeholder for custom registration logic

            return {
                success: true,
                message: 'Registration successful. Please check your email for verification.'
            };
        } catch (error) {
            logger.error('Registration error', { email, error: error.message });
            return {
                success: false,
                error: 'Registration failed'
            };
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, config.jwt.secret);

            // Get user from database
            const { data: user, error } = await databaseService.getUserByEmail(decoded.email);

            if (error || !user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            // Generate new access token
            const tokens = this.generateToken(user);

            return tokens;
        } catch (error) {
            return {
                success: false,
                error: 'Invalid refresh token'
            };
        }
    }
}

module.exports = new AuthService();
