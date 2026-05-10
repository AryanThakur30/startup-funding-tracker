/**
 * Data Pipeline Execution Script
 * Run manually or via cron job
 *
 * Usage:
 *   node scripts/run-pipeline.js [historical|live]
 *   node scripts/run-pipeline.js all
 */

require('dotenv').config();

const path = require('path');

// Add parent directory to path for imports
process.chdir(path.join(__dirname, '..'));

// Import services
const databaseService = require('../backend/src/services/database.service');
const dataPipelineService = require('../backend/src/services/dataPipeline.service');
const logger = require('../backend/src/utils/logger');

async function main() {
    const args = process.argv.slice(2);
    const pipelineType = args[0] || 'live';

    console.log('='.repeat(60));
    console.log('INDIAN STARTUP FUNDING TRACKER - DATA PIPELINE');
    console.log('='.repeat(60));
    console.log(`Pipeline Type: ${pipelineType.toUpperCase()}`);
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
        // Initialize database connection
        console.log('\n[1/4] Connecting to database...');
        await databaseService.connect();
        console.log('Database connected successfully');

        // Execute pipeline
        console.log('\n[2/4] Executing data pipeline...');
        const result = await dataPipelineService.executePipeline(pipelineType);

        // Display results
        console.log('\n[3/4] Pipeline Execution Results:');
        console.log('-'.repeat(40));
        console.log(`  Status:           ${result.stats.status}`);
        console.log(`  Records Fetched:  ${result.stats.recordsFetched}`);
        console.log(`  Records Cleaned:  ${result.stats.recordsCleaned}`);
        console.log(`  Records Inserted: ${result.stats.recordsInserted}`);
        console.log(`  Records Discarded: ${result.stats.recordsDiscarded}`);
        console.log(`  Duplicates Skipped: ${result.stats.recordsDuplicates}`);

        if (result.stats.metadata?.durationMs) {
            console.log(`  Duration:         ${result.stats.metadata.durationMs}ms`);
        }

        if (result.stats.metadata?.sources) {
            console.log('\n  Data Sources:');
            for (const [source, count] of Object.entries(result.stats.metadata.sources)) {
                console.log(`    - ${source}: ${count} records`);
            }
        }

        // Log to database
        console.log('\n[4/4] Logging execution to database...');
        await databaseService.logPipelineExecution(result.stats);

        console.log('\n' + '='.repeat(60));
        if (result.success) {
            console.log('PIPELINE EXECUTION COMPLETED SUCCESSFULLY');
        } else {
            console.log('PIPELINE EXECUTION COMPLETED WITH ERRORS');
            if (result.stats.errorMessage) {
                console.log(`Error: ${result.stats.errorMessage}`);
            }
        }
        console.log('='.repeat(60));

        process.exit(result.success ? 0 : 1);
    } catch (error) {
        logger.error('Pipeline script error', { error: error.message, stack: error.stack });
        console.error('\nFATAL ERROR:', error.message);
        process.exit(1);
    }
}

// Run main function
main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
