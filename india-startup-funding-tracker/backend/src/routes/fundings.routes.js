/**
 * Funding Routes
 * API endpoints for funding data access
 */

const express = require('express');
const router = express.Router();
const databaseService = require('../services/database.service');
const { authenticate } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

/**
 * GET /fundings/historical
 * Get historical funding data (January - February 2026)
 */
router.get('/historical', authenticate, async (req, res) => {
    try {
        const { sector, company, limit = 100 } = req.query;

        const filters = {
            sector: sector || null,
            company: company || null,
            limit: parseInt(limit)
        };

        const result = await databaseService.getHistoricalFundings(filters);

        if (result.error) {
            logger.error('Historical fundings fetch failed', { error: result.error });
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch historical data',
                message: result.error
            });
        }

        // Transform data for response
        const transformedData = result.data.map(record => ({
            id: record.id,
            companyName: record.company_name,
            sector: record.sector,
            fundingAmount: parseFloat(record.funding_amount) || 0,
            currency: record.funding_currency,
            headline: record.headline,
            publishedDate: record.published_date,
            source: record.source,
            createdAt: record.created_at
        }));

        res.json({
            success: true,
            data: transformedData,
            meta: {
                count: result.count,
                dateRange: {
                    start: '2026-01-01',
                    end: '2026-02-28'
                },
                filters: filters
            }
        });
    } catch (error) {
        logger.error('Historical fundings error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /fundings/live
 * Get live funding data (March 1 - 24, 2026)
 */
router.get('/live', authenticate, async (req, res) => {
    try {
        const { sector, company, limit = 100 } = req.query;

        const filters = {
            sector: sector || null,
            company: company || null,
            limit: parseInt(limit)
        };

        const result = await databaseService.getLiveFundings(filters);

        if (result.error) {
            logger.error('Live fundings fetch failed', { error: result.error });
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch live data',
                message: result.error
            });
        }

        // Transform data for response
        const transformedData = result.data.map(record => ({
            id: record.id,
            companyName: record.company_name,
            sector: record.sector,
            fundingAmount: parseFloat(record.funding_amount) || 0,
            currency: record.funding_currency,
            headline: record.headline,
            publishedDate: record.published_date,
            source: record.source,
            sourceUrl: record.source_url,
            createdAt: record.created_at
        }));

        res.json({
            success: true,
            data: transformedData,
            meta: {
                count: result.count,
                dateRange: {
                    start: '2026-03-01',
                    end: '2026-03-24'
                },
                filters: filters,
                isLive: true
            }
        });
    } catch (error) {
        logger.error('Live fundings error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /fundings/filter
 * Advanced filtering with multiple parameters
 */
router.get('/filter', authenticate, async (req, res) => {
    try {
        const {
            sector,
            company,
            minAmount,
            maxAmount,
            dateFrom,
            dateTo,
            source,
            limit = 100,
            page = 1
        } = req.query;

        // Determine if this is historical or live based on date range
        let useHistorical = false;
        let useLive = false;

        if (dateFrom && dateTo) {
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);

            // Historical range: Jan-Feb 2026
            const histStart = new Date('2026-01-01');
            const histEnd = new Date('2026-02-28');

            // Live range: March 1-24, 2026
            const liveStart = new Date('2026-03-01');
            const liveEnd = new Date('2026-03-24');

            useHistorical = (fromDate >= histStart && toDate <= histEnd);
            useLive = (fromDate >= liveStart && toDate <= liveEnd);
        }

        // Fetch from appropriate data source
        let results = { data: [], count: 0, error: null };

        if (useHistorical) {
            results = await databaseService.getHistoricalFundings({ sector, company, limit });
        } else if (useLive) {
            results = await databaseService.getLiveFundings({ sector, company, limit });
        } else {
            // Return empty if date range is invalid
            return res.json({
                success: true,
                data: [],
                meta: {
                    count: 0,
                    message: 'Please specify a valid date range (Jan-Feb 2026 for historical or March 1-24, 2026 for live data)'
                }
            });
        }

        // Apply additional filters in memory
        let filteredData = results.data;

        if (minAmount) {
            filteredData = filteredData.filter(r =>
                parseFloat(r.funding_amount) >= parseFloat(minAmount)
            );
        }

        if (maxAmount) {
            filteredData = filteredData.filter(r =>
                parseFloat(r.funding_amount) <= parseFloat(maxAmount)
            );
        }

        if (source) {
            filteredData = filteredData.filter(r =>
                r.source.toLowerCase().includes(source.toLowerCase())
            );
        }

        res.json({
            success: true,
            data: filteredData,
            meta: {
                count: filteredData.length,
                totalCount: results.count,
                filters: {
                    sector,
                    company,
                    minAmount,
                    maxAmount,
                    dateFrom,
                    dateTo,
                    source
                },
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        logger.error('Filter fundings error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /fundings/stats
 * Get funding statistics for dashboard
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const stats = await databaseService.getFundingStats();

        if (stats.error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch statistics',
                message: stats.error
            });
        }

        res.json({
            success: true,
            data: stats,
            meta: {
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Stats error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /fundings/recent
 * Get most recent funding events
 */
router.get('/recent', authenticate, async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        // Get live data (most recent)
        const result = await databaseService.getLiveFundings({ limit: parseInt(limit) });

        if (result.error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch recent fundings'
            });
        }

        res.json({
            success: true,
            data: result.data,
            meta: {
                count: result.count,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        logger.error('Recent fundings error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /fundings/sectors
 * Get sector-wise distribution
 */
router.get('/sectors', authenticate, async (req, res) => {
    try {
        const result = await databaseService.getFundingStats();

        const sectors = Object.entries(result.sectorDistribution)
            .map(([sector, data]) => ({
                sector,
                dealCount: data.count,
                totalFunding: data.total,
                averageFunding: data.total / data.count
            }))
            .sort((a, b) => b.totalFunding - a.totalFunding);

        res.json({
            success: true,
            data: sectors,
            meta: {
                totalSectors: sectors.length
            }
        });
    } catch (error) {
        logger.error('Sectors error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
