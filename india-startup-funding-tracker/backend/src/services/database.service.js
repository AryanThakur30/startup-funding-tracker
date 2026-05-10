/**
 * Supabase Database Service
 * Production database operations with connection pooling
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');
const logger = require('../utils/logger');

class DatabaseService {
    constructor() {
        this.supabaseUrl = config.supabase.url;
        this.serviceKey = config.supabase.serviceKey;
        this.client = null;
        this.isConnected = false;
    }

    /**
     * Initialize database connection
     */
    async connect() {
        try {
            if (!this.supabaseUrl || !this.serviceKey) {
                throw new Error('Supabase credentials not configured');
            }

            this.client = createClient(this.supabaseUrl, this.serviceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                },
                db: {
                    schema: 'public'
                }
            });

            // Test connection
            const { data, error } = await this.client
                .from('users')
                .select('id')
                .limit(1);

            if (error) {
                throw error;
            }

            this.isConnected = true;
            logger.dbLog('CONNECT', 'database', { status: 'success', message: 'Connected to Supabase' });
            return true;
        } catch (error) {
            this.isConnected = false;
            logger.dbLog('CONNECT', 'database', { status: 'failed', error: error.message });
            throw error;
        }
    }

    /**
     * Insert funding record with conflict handling
     * Uses UPSERT to handle duplicates idempotently
     */
    async insertFundingRecord(record) {
        try {
            const { data, error } = await this.client
                .from('startup_funding')
                .upsert({
                    company_name: record.company_name,
                    sector: record.sector,
                    funding_amount: record.funding_amount,
                    funding_currency: record.funding_currency || 'INR',
                    headline: record.headline,
                    published_date: record.published_date,
                    source: record.source,
                    source_url: record.source_url,
                    raw_data: record.raw_data || {}
                }, {
                    onConflict: 'headline,published_date',
                    returning: 'representation'
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    // Duplicate key violation - expected for idempotent inserts
                    logger.dbLog('INSERT', 'startup_funding', {
                        status: 'duplicate',
                        company: record.company_name
                    });
                    return { success: true, duplicate: true };
                }
                throw error;
            }

            logger.dbLog('INSERT', 'startup_funding', {
                status: 'success',
                id: data.id,
                company: record.company_name
            });

            return { success: true, data, duplicate: false };
        } catch (error) {
            logger.dbLog('INSERT', 'startup_funding', {
                status: 'error',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Batch insert funding records
     */
    async insertFundingBatch(records) {
        const results = {
            inserted: 0,
            duplicates: 0,
            errors: []
        };

        for (const record of records) {
            try {
                const result = await this.insertFundingRecord(record);
                if (result.duplicate) {
                    results.duplicates++;
                } else {
                    results.inserted++;
                }
            } catch (error) {
                results.errors.push({
                    company: record.company_name,
                    error: error.message
                });
            }
        }

        logger.dbLog('BATCH_INSERT', 'startup_funding', results);
        return results;
    }

    /**
     * Get historical funding data (Jan-Feb 2026)
     */
    async getHistoricalFundings(filters = {}) {
        try {
            let query = this.client
                .from('startup_funding')
                .select('*')
                .gte('published_date', config.pipeline.historicalDateRange.start)
                .lte('published_date', config.pipeline.historicalDateRange.end)
                .order('published_date', { ascending: false });

            if (filters.sector) {
                query = query.eq('sector', filters.sector);
            }

            if (filters.company) {
                query = query.ilike('company_name', `%${filters.company}%`);
            }

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            logger.dbLog('SELECT', 'startup_funding', {
                status: 'success',
                count: data.length,
                type: 'historical'
            });

            return { data, count, error: null };
        } catch (error) {
            logger.dbLog('SELECT', 'startup_funding', {
                status: 'error',
                error: error.message
            });
            return { data: [], count: 0, error: error.message };
        }
    }

    /**
     * Get live funding data (March 1-24, 2026)
     */
    async getLiveFundings(filters = {}) {
        try {
            let query = this.client
                .from('startup_funding')
                .select('*')
                .gte('published_date', config.pipeline.liveDateRange.start)
                .lte('published_date', config.pipeline.liveDateRange.end)
                .order('published_date', { ascending: false });

            if (filters.sector) {
                query = query.eq('sector', filters.sector);
            }

            if (filters.company) {
                query = query.ilike('company_name', `%${filters.company}%`);
            }

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            logger.dbLog('SELECT', 'startup_funding', {
                status: 'success',
                count: data.length,
                type: 'live'
            });

            return { data, count, error: null };
        } catch (error) {
            logger.dbLog('SELECT', 'startup_funding', {
                status: 'error',
                error: error.message
            });
            return { data: [], count: 0, error: error.message };
        }
    }

    /**
     * Get funding statistics for dashboard
     */
    async getFundingStats() {
        try {
            // Get historical stats
            const historical = await this.client
                .from('startup_funding')
                .select('funding_amount, sector, published_date')
                .gte('published_date', config.pipeline.historicalDateRange.start)
                .lte('published_date', config.pipeline.historicalDateRange.end);

            // Get live stats
            const live = await this.client
                .from('startup_funding')
                .select('funding_amount, sector, published_date')
                .gte('published_date', config.pipeline.liveDateRange.start)
                .lte('published_date', config.pipeline.liveDateRange.end);

            // Calculate totals
            const historicalTotal = historical.data
                .filter(r => r.funding_amount)
                .reduce((sum, r) => sum + parseFloat(r.funding_amount), 0);

            const liveTotal = live.data
                .filter(r => r.funding_amount)
                .reduce((sum, r) => sum + parseFloat(r.funding_amount), 0);

            // Sector distribution
            const sectorStats = await this.client
                .from('startup_funding')
                .select('sector, funding_amount')
                .gte('published_date', config.pipeline.liveDateRange.start)
                .lte('published_date', config.pipeline.liveDateRange.end);

            const sectorDistribution = {};
            sectorStats.data.forEach(record => {
                if (record.sector && record.funding_amount) {
                    if (!sectorDistribution[record.sector]) {
                        sectorDistribution[record.sector] = {
                            count: 0,
                            total: 0
                        };
                    }
                    sectorDistribution[record.sector].count++;
                    sectorDistribution[record.sector].total += parseFloat(record.funding_amount);
                }
            });

            return {
                historical: {
                    totalFunding: historicalTotal,
                    dealCount: historical.data.length
                },
                live: {
                    totalFunding: liveTotal,
                    dealCount: live.data.length
                },
                sectorDistribution,
                error: null
            };
        } catch (error) {
            logger.dbLog('SELECT', 'dashboard_stats', {
                status: 'error',
                error: error.message
            });
            return {
                historical: { totalFunding: 0, dealCount: 0 },
                live: { totalFunding: 0, dealCount: 0 },
                sectorDistribution: {},
                error: error.message
            };
        }
    }

    /**
     * Log pipeline execution
     */
    async logPipelineExecution(logData) {
        try {
            const { data, error } = await this.client
                .from('data_pipeline_logs')
                .insert({
                    pipeline_name: logData.pipelineName,
                    records_fetched: logData.recordsFetched,
                    records_cleaned: logData.recordsCleaned,
                    records_inserted: logData.recordsInserted,
                    records_discarded: logData.recordsDiscarded,
                    records_duplicates: logData.recordsDuplicates,
                    status: logData.status,
                    error_message: logData.errorMessage,
                    metadata: logData.metadata || {}
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            logger.dbLog('INSERT', 'data_pipeline_logs', {
                status: 'error',
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get pipeline execution history
     */
    async getPipelineHistory(limit = 50) {
        try {
            const { data, error } = await this.client
                .from('data_pipeline_logs')
                .select('*')
                .order('execution_date', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: [], error: error.message };
        }
    }

    /**
     * User authentication - Get user by email
     */
    async getUserByEmail(email) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('is_active', true)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    }

    /**
     * Update user last login
     */
    async updateLastLogin(userId) {
        try {
            const { data, error } = await this.client
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
module.exports = new DatabaseService();
