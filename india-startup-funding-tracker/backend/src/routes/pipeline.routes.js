/**
 * Pipeline Routes
 * Data pipeline execution and monitoring
 */

const express = require('express');
const router = express.Router();
const dataPipelineService = require('../services/dataPipeline.service');
const databaseService = require('../services/database.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

/**
 * POST /pipeline/run
 * Execute data pipeline manually
 */
router.post('/run', authenticate, authorize('admin', 'operator'), async (req, res) => {
    try {
        const { type = 'live' } = req.body;

        if (!['historical', 'live'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid pipeline type. Use "historical" or "live"',
                code: 'INVALID_TYPE'
            });
        }

        logger.info('Manual pipeline execution requested', {
            type,
            userId: req.user.userId
        });

        const result = await dataPipelineService.executePipeline(type);

        res.json({
            success: result.success,
            data: {
                pipelineName: result.stats.pipelineName,
                executionDate: new Date().toISOString(),
                recordsFetched: result.stats.recordsFetched,
                recordsCleaned: result.stats.recordsCleaned,
                recordsInserted: result.stats.recordsInserted,
                recordsDuplicates: result.stats.recordsDuplicates,
                recordsDiscarded: result.stats.recordsDiscarded,
                status: result.stats.status,
                duration: result.stats.metadata?.durationMs
            }
        });
    } catch (error) {
        logger.error('Pipeline execution error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Pipeline execution failed',
            message: error.message
        });
    }
});

/**
 * GET /pipeline/status
 * Get current pipeline status and history
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const history = await databaseService.getPipelineHistory(parseInt(limit));

        // Calculate summary stats
        const totalExecutions = history.data?.length || 0;
        const successfulExecutions = history.data?.filter(h => h.status === 'completed').length || 0;
        const failedExecutions = history.data?.filter(h => h.status === 'failed').length || 0;

        const totalRecordsFetched = history.data?.reduce((sum, h) => sum + (h.records_fetched || 0), 0) || 0;
        const totalRecordsInserted = history.data?.reduce((sum, h) => sum + (h.records_inserted || 0), 0) || 0;

        res.json({
            success: true,
            data: {
                recentExecutions: history.data,
                summary: {
                    totalExecutions,
                    successfulExecutions,
                    failedExecutions,
                    successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(2) : 0,
                    totalRecordsFetched,
                    totalRecordsInserted
                }
            }
        });
    } catch (error) {
        logger.error('Pipeline status error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get pipeline status'
        });
    }
});

/**
 * GET /pipeline/logs
 * Get detailed pipeline logs
 */
router.get('/logs', authenticate, async (req, res) => {
    try {
        const { date, pipelineName, status } = req.query;

        let query = databaseService.client
            .from('data_pipeline_logs')
            .select('*')
            .order('execution_date', { ascending: false });

        if (date) {
            const startOfDay = new Date(date);
            const endOfDay = new Date(date);
            endOfDay.setDate(endOfDay.getDate() + 1);

            query = query
                .gte('execution_date', startOfDay.toISOString())
                .lt('execution_date', endOfDay.toISOString());
        }

        if (pipelineName) {
            query = query.eq('pipeline_name', pipelineName);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query.limit(100);

        if (error) throw error;

        res.json({
            success: true,
            data: data,
            meta: {
                count: data.length
            }
        });
    } catch (error) {
        logger.error('Pipeline logs error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get pipeline logs'
        });
    }
});

/**
 * GET /pipeline/health
 * Get pipeline health metrics
 */
router.get('/health', async (req, res) => {
    try {
        // Check database connection
        let dbStatus = 'disconnected';
        if (databaseService.isConnected) {
            dbStatus = 'connected';
        }

        // Get recent execution stats
        const recentExecutions = await databaseService.getPipelineHistory(5);
        const lastExecution = recentExecutions.data?.[0];

        const health = {
            status: dbStatus === 'connected' ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            components: {
                database: {
                    status: dbStatus,
                    type: 'Supabase PostgreSQL'
                },
                api: {
                    status: 'operational'
                }
            },
            metrics: {
                lastExecutionDate: lastExecution?.execution_date || null,
                lastExecutionStatus: lastExecution?.status || null,
                last24hExecutions: recentExecutions.data?.filter(h => {
                    const executionDate = new Date(h.execution_date);
                    const now = new Date();
                    const diff = (now - executionDate) / (1000 * 60 * 60);
                    return diff <= 24;
                }).length || 0
            }
        };

        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            status: 'unhealthy'
        });
    }
});

module.exports = router;
