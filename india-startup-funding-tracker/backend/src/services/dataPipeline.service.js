/**
 * Data Pipeline Service
 * Production-grade data ingestion and cleaning pipeline
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const logger = require('../utils/logger');
const databaseService = require('./database.service');

class DataPipelineService {
    constructor() {
        this.gdeltBaseUrl = config.apis.gdelt.baseUrl;
        this.mediastackBaseUrl = config.apis.mediastack.baseUrl;

        // Keywords for filtering Indian startup funding news
        this.fundingKeywords = [
            'funding', 'raised', 'investment', 'series a', 'series b', 'series c',
            'series d', 'seed round', 'pre-series', 'angel round', 'venture capital',
            'venture debt', 'equity', 'investment', 'financing', 'secured', 'closes'
        ];

        // Sector keyword mappings
        this.sectorMapping = {
            'fintech': ['fintech', 'financial', 'payments', 'banking', 'insurance', 'lending', 'wealthtech', 'insurtech'],
            'edtech': ['edtech', 'education', 'learning', 'online learning', 'eduation'],
            'healthtech': ['healthtech', 'healthcare', 'health', 'medical', 'telemedicine', 'pharma', 'biotech'],
            'ecommerce': ['ecommerce', 'e-commerce', 'retail', 'd2c', 'direct to consumer', 'marketplace'],
            'saas': ['saas', 'software', 'b2b', 'enterprise', 'cloud'],
            'ai_ml': ['ai', 'artificial intelligence', 'ml', 'machine learning', 'data science'],
            'logistics': ['logistics', 'supply chain', 'delivery', 'shipping'],
            'foodtech': ['foodtech', 'food', 'restaurant', 'delivery', 'qsr'],
            'proptech': ['proptech', 'real estate', 'property', 'housing'],
            'cleantech': ['cleantech', 'clean energy', 'sustainability', 'solar', 'renewable'],
            'automotive': ['automotive', 'electric vehicle', 'ev', 'mobility', 'transport'],
            'social_commerce': ['social commerce', 'social media', 'influencer', 'creator']
        };
    }

    /**
     * Clean and validate raw funding record
     */
    cleanFundingRecord(rawRecord, source) {
        const cleaned = {
            source: source,
            raw_data: rawRecord
        };

        try {
            // Extract company name from headline
            cleaned.company_name = this.extractCompanyName(rawRecord.headline || rawRecord.title);

            if (!cleaned.company_name) {
                logger.pipelineLog('CLEAN', { reason: 'no_company_name', record: rawRecord });
                return null;
            }

            // Extract funding amount
            cleaned.funding_amount = this.extractFundingAmount(rawRecord.headline || rawRecord.title);

            // Determine sector
            const text = `${rawRecord.headline || ''} ${rawRecord.description || ''} ${rawRecord.title || ''}`;
            cleaned.sector = this.determineSector(text);

            // Parse and validate date
            cleaned.published_date = this.parseDate(rawRecord.published_at || rawRecord.date || rawRecord.pubDate);

            if (!cleaned.published_date) {
                logger.pipelineLog('CLEAN', { reason: 'invalid_date', company: cleaned.company_name });
                return null;
            }

            // Validate date range
            if (!this.isValidDateRange(cleaned.published_date)) {
                logger.pipelineLog('CLEAN', {
                    reason: 'date_out_of_range',
                    date: cleaned.published_date,
                    company: cleaned.company_name
                });
                return null;
            }

            // Set headline/description
            cleaned.headline = (rawRecord.headline || rawRecord.title || '').trim();
            cleaned.source_url = rawRecord.url || rawRecord.link || null;
            cleaned.funding_currency = 'INR';

            // Filter out irrelevant records
            if (!this.isRelevantFunding(text)) {
                logger.pipelineLog('CLEAN', {
                    reason: 'not_funding_related',
                    company: cleaned.company_name
                });
                return null;
            }

            logger.pipelineLog('CLEAN', {
                status: 'success',
                company: cleaned.company_name,
                sector: cleaned.sector
            });

            return cleaned;
        } catch (error) {
            logger.pipelineLog('CLEAN', {
                status: 'error',
                error: error.message,
                record: rawRecord
            });
            return null;
        }
    }

    /**
     * Extract company name from headline using NLP patterns
     */
    extractCompanyName(headline) {
        if (!headline) return null;

        const patterns = [
            // "Company Name raises/funding/closes..."
            /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:raises|secures|closes|raises|makes|gets|announces|launches|receives|gets|says)/i,

            // "Funding round for Company Name"
            /(?:funding|round|investment)\s+(?:for|to|by)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,

            // "Company Name in funding news"
            /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:in|gets|raises)/i,

            // "[Company Name] raises..."
            /^\[([^\]]+)\]\s+raises/i,

            // "Startup: Company Name"
            /startup:\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i
        ];

        for (const pattern of patterns) {
            const match = headline.match(pattern);
            if (match && match[1]) {
                const company = match[1].trim();
                // Validate company name length
                if (company.length >= 2 && company.length <= 50) {
                    return this.normalizeCompanyName(company);
                }
            }
        }

        // Fallback: Extract first capitalized words
        const words = headline.split(/\s+/);
        const firstCapWords = words.filter(w => /^[A-Z][a-zA-Z]+$/.test(w));
        if (firstCapWords.length >= 1) {
            return firstCapWords.slice(0, 3).join(' ');
        }

        return null;
    }

    /**
     * Normalize company name
     */
    normalizeCompanyName(name) {
        return name
            .replace(/^(The|Inc|LLC|Ltd|Pvt|Private)\s+/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extract funding amount using regex patterns
     */
    extractFundingAmount(text) {
        if (!text) return null;

        const patterns = [
            // "raises $X million" or "raises INR X crore"
            /(?:raises|secures|closes|raises)\s+(?: INR |₹|Rs\.?)\s*(\d+(?:\.\d+)?)\s*(?:crore|crores|mn|million|billion|bn)?/gi,

            // "INR X crore" or "₹X crore"
            /(?: INR |₹|Rs\.?)\s*(\d+(?:\.\d+)?)\s*(?:crore|crores|mn|million|billion|bn)/gi,

            // "$X million" standalone
            /\$\s*(\d+(?:\.\d+)?)\s*(?:million|billion|mn|bn)/gi,

            // "X-times" or "X x" multipliers
            /(\d+(?:\.\d+)?)\s*(?:times|x)\s+(?:valuation|growth)/gi
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const amountStr = match[1] || match[0];
                const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''));

                // Convert to INR (assume USD if dollar sign, INR if explicit)
                let finalAmount = amount;
                if (text.includes('$') || text.includes('million')) {
                    finalAmount = amount * 83; // Approximate USD to INR conversion
                } else if (text.includes('billion') || text.includes('bn')) {
                    finalAmount = amount * 100; // Convert to crores (assuming million base)
                } else if (text.includes('crore') || text.includes('crores')) {
                    finalAmount = amount * 10000000; // Convert crores to actual rupees
                }

                return finalAmount;
            }
        }

        return null;
    }

    /**
     * Determine sector based on keyword matching
     */
    determineSector(text) {
        if (!text) return 'other';

        const lowerText = text.toLowerCase();

        for (const [sector, keywords] of Object.entries(this.sectorMapping)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    return sector;
                }
            }
        }

        return 'other';
    }

    /**
     * Parse various date formats to ISO
     */
    parseDate(dateStr) {
        if (!dateStr) return null;

        try {
            // Handle ISO format
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            logger.pipelineLog('PARSE_DATE', { error: e.message, input: dateStr });
        }

        return null;
    }

    /**
     * Validate if date falls within allowed ranges
     */
    isValidDateRange(dateStr) {
        const date = new Date(dateStr);
        const histStart = new Date(config.pipeline.historicalDateRange.start);
        const histEnd = new Date(config.pipeline.historicalDateRange.end);
        const liveStart = new Date(config.pipeline.liveDateRange.start);
        const liveEnd = new Date(config.pipeline.liveDateRange.end);

        return (date >= histStart && date <= histEnd) ||
               (date >= liveStart && date <= liveEnd);
    }

    /**
     * Check if text is relevant to startup funding
     */
    isRelevantFunding(text) {
        if (!text) return false;

        const lowerText = text.toLowerCase();

        for (const keyword of this.fundingKeywords) {
            if (lowerText.includes(keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Fetch data from GDELT API
     */
    async fetchFromGDELT(keywords = 'India startup funding', maxRecords = 250) {
        const stats = {
            fetched: 0,
            success: false,
            error: null
        };

        try {
            // GDELT GKG API for news
            const url = `${this.gdeltBaseUrl}/gkg/gkg`;

            const params = {
                format: 'json',
                query: keywords,
                mode: 'artlist',
                maxrecords: maxRecords,
                sort: 'DateDesc'
            };

            logger.apiLog('GDELT', 'fetching', { url, params });

            const response = await axios.get(url, {
                params,
                timeout: 30000,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.data && response.data.articles) {
                stats.fetched = response.data.articles.length;
                stats.success = true;

                logger.apiLog('GDELT', 'success', {
                    recordsFetched: stats.fetched
                });

                return {
                    success: true,
                    data: response.data.articles,
                    stats
                };
            }

            return { success: false, data: [], stats };
        } catch (error) {
            stats.error = error.message;
            logger.apiLog('GDELT', 'error', {
                error: error.message,
                status: error.response?.status
            });

            return { success: false, data: [], stats };
        }
    }

    /**
     * Fetch data from MediaStack API
     */
    async fetchFromMediaStack(dateFrom, dateTo) {
        const stats = {
            fetched: 0,
            success: false,
            error: null
        };

        try {
            const params = {
                access_key: config.apis.mediastack.apiKey,
                countries: config.apis.mediastack.countries,
                categories: config.apis.mediastack.categories,
                languages: 'en',
                date: `${dateFrom},${dateTo}`,
                sort: 'published_desc',
                limit: 100
            };

            logger.apiLog('MEDIASTACK', 'fetching', { params: { ...params, access_key: '***' } });

            const response = await axios.get(this.mediastackBaseUrl + '/news', {
                params,
                timeout: 30000
            });

            if (response.data && response.data.data) {
                stats.fetched = response.data.data.length;
                stats.success = true;

                logger.apiLog('MEDIASTACK', 'success', {
                    recordsFetched: stats.fetched
                });

                return {
                    success: true,
                    data: response.data.data,
                    stats
                };
            }

            return { success: false, data: [], stats };
        } catch (error) {
            stats.error = error.message;
            logger.apiLog('MEDIASTACK', 'error', { error: error.message });

            return { success: false, data: [], stats };
        }
    }

    /**
     * Full pipeline execution
     */
    async executePipeline(pipelineType = 'historical') {
        const pipelineName = `data_pipeline_${pipelineType}`;
        const pipelineStats = {
            pipelineName,
            recordsFetched: 0,
            recordsCleaned: 0,
            recordsInserted: 0,
            recordsDiscarded: 0,
            recordsDuplicates: 0,
            status: 'running',
            errorMessage: null,
            metadata: {}
        };

        const startTime = Date.now();
        logger.pipelineLog('START', { pipelineType, startTime: new Date().toISOString() });

        try {
            // Connect to database
            if (!databaseService.isConnected) {
                await databaseService.connect();
            }

            let allRecords = [];

            // Fetch from multiple sources
            const dateRange = pipelineType === 'historical'
                ? { start: '20260101', end: '20260228' }
                : { start: '20260301', end: '20260324' };

            // Fetch from GDELT
            const gdeltResult = await this.fetchFromGDELT(
                'India startup funding investment',
                config.apis.gdelt.maxRecords
            );

            if (gdeltResult.success) {
                allRecords = allRecords.concat(
                    gdeltResult.data.map(r => ({ ...r, source: 'GDELT' }))
                );
            }

            // Fetch from MediaStack
            const mediastackResult = await this.fetchFromMediaStack(
                dateRange.start,
                dateRange.end
            );

            if (mediastackResult.success) {
                allRecords = allRecords.concat(
                    mediastackResult.data.map(r => ({ ...r, source: 'MediaStack' }))
                );
            }

            pipelineStats.recordsFetched = allRecords.length;
            pipelineStats.metadata.sources = {
                GDELT: gdeltResult.stats.fetched,
                MediaStack: mediastackResult.stats.fetched
            };

            logger.pipelineLog('FETCHED', {
                totalRecords: allRecords.length,
                sources: pipelineStats.metadata.sources
            });

            // Clean records
            const cleanedRecords = [];
            for (const record of allRecords) {
                const cleaned = this.cleanFundingRecord(record, record.source);
                if (cleaned) {
                    cleanedRecords.push(cleaned);
                } else {
                    pipelineStats.recordsDiscarded++;
                }
            }

            pipelineStats.recordsCleaned = cleanedRecords.length;

            logger.pipelineLog('CLEANED', {
                cleanedCount: cleanedRecords.length,
                discardedCount: pipelineStats.recordsDiscarded
            });

            // Insert into database
            const insertResults = await databaseService.insertFundingBatch(cleanedRecords);

            pipelineStats.recordsInserted = insertResults.inserted;
            pipelineStats.recordsDuplicates = insertResults.duplicates;

            if (insertResults.errors.length > 0) {
                pipelineStats.metadata.insertErrors = insertResults.errors;
            }

            // Calculate duration
            const duration = Date.now() - startTime;
            pipelineStats.metadata.durationMs = duration;

            // Log pipeline execution
            pipelineStats.status = 'completed';
            await databaseService.logPipelineExecution(pipelineStats);

            logger.pipelineLog('COMPLETED', pipelineStats);

            return {
                success: true,
                stats: pipelineStats
            };
        } catch (error) {
            pipelineStats.status = 'failed';
            pipelineStats.errorMessage = error.message;
            pipelineStats.metadata.errorStack = error.stack;

            await databaseService.logPipelineExecution(pipelineStats);

            logger.pipelineLog('FAILED', {
                ...pipelineStats,
                error: error.message
            });

            return {
                success: false,
                stats: pipelineStats
            };
        }
    }
}

module.exports = new DataPipelineService();
