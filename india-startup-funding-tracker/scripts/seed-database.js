/**
 * Database Seeding Script
 * Seeds the database with sample funding records for testing
 *
 * Usage:
 *   node scripts/seed-database.js
 */

require('dotenv').config();

const path = require('path');
const bcrypt = require('bcrypt');

process.chdir(path.join(__dirname, '..'));

const databaseService = require('../backend/src/services/database.service');

const SAMPLE_FUNDING_RECORDS = [
    {
        company_name: 'Cred',
        sector: 'fintech',
        funding_amount: 1200000000,
        funding_currency: 'INR',
        headline: 'Cred raises $150 million in Series F funding round',
        published_date: '2026-01-15',
        source: 'GDELT',
        source_url: 'https://example.com/cred-funding'
    },
    {
        company_name: 'Razorpay',
        sector: 'fintech',
        funding_amount: 750000000,
        funding_currency: 'INR',
        headline: 'Razorpay closes $100M Series E at $3.5B valuation',
        published_date: '2026-01-22',
        source: 'GDELT',
        source_url: 'https://example.com/razorpay-funding'
    },
    {
        company_name: 'Physics Wallah',
        sector: 'edtech',
        funding_amount: 150000000,
        funding_currency: 'INR',
        headline: 'Physics Wallah raises $150M in Series B from GSV Ventures',
        published_date: '2026-01-28',
        source: 'MediaStack',
        source_url: 'https://example.com/physics-wallah'
    },
    {
        company_name: 'Shadowfax',
        sector: 'logistics',
        funding_amount: 360000000,
        funding_currency: 'INR',
        headline: 'Shadowfax secures $45M in Series D funding round',
        published_date: '2026-02-05',
        source: 'GDELT',
        source_url: 'https://example.com/shadowfax'
    },
    {
        company_name: 'Flipkart',
        sector: 'ecommerce',
        funding_amount: 3600000000,
        funding_currency: 'INR',
        headline: 'Flipkart raises $450M from GIC and Walmart',
        published_date: '2026-02-10',
        source: 'GDELT',
        source_url: 'https://example.com/flipkart-funding'
    },
    {
        company_name: 'Zomato',
        sector: 'foodtech',
        funding_amount: 950000000,
        funding_currency: 'INR',
        headline: 'Zomato closes $120M funding from Mirae Asset',
        published_date: '2026-02-15',
        source: 'MediaStack',
        source_url: 'https://example.com/zomato'
    },
    {
        company_name: 'Mamaearth',
        sector: 'ecommerce',
        funding_amount: 450000000,
        funding_currency: 'INR',
        headline: 'Mamaearth raises $55M in Series C from Wityans Venture',
        published_date: '2026-02-20',
        source: 'GDELT',
        source_url: 'https://example.com/mamaearth'
    },
    {
        company_name: 'CRED',
        sector: 'fintech',
        funding_amount: 1850000000,
        funding_currency: 'INR',
        headline: 'CRED raises $230M in funding round led by Tiger Global',
        published_date: '2026-03-02',
        source: 'GDELT',
        source_url: 'https://example.com/cred-march'
    },
    {
        company_name: 'Razorpay',
        sector: 'fintech',
        funding_amount: 680000000,
        funding_currency: 'INR',
        headline: 'Razorpay closes $85M Series E extension round',
        published_date: '2026-03-05',
        source: 'MediaStack',
        source_url: 'https://example.com/razorpay-march'
    },
    {
        company_name: 'Physics Wallah',
        sector: 'edtech',
        funding_amount: 220000000,
        funding_currency: 'INR',
        headline: 'Physics Wallah raises $28M in Series B extension',
        published_date: '2026-03-08',
        source: 'GDELT',
        source_url: 'https://example.com/physics-wallah-march'
    },
    {
        company_name: 'Tata 1mg',
        sector: 'healthtech',
        funding_amount: 850000000,
        funding_currency: 'INR',
        headline: 'Tata 1mg raises $105M in Series F from HealthQuad',
        published_date: '2026-03-10',
        source: 'GDELT',
        source_url: 'https://example.com/tata-1mg'
    },
    {
        company_name: 'Licious',
        sector: 'foodtech',
        funding_amount: 420000000,
        funding_currency: 'INR',
        headline: 'Licious secures $52M in Series G funding',
        published_date: '2026-03-12',
        source: 'MediaStack',
        source_url: 'https://example.com/licious'
    },
    {
        company_name: 'Upstox',
        sector: 'fintech',
        funding_amount: 310000000,
        funding_currency: 'INR',
        headline: 'Upstox raises $40M in Series D from Tiger Global',
        published_date: '2026-03-15',
        source: 'GDELT',
        source_url: 'https://example.com/upstox'
    },
    {
        company_name: 'Spinny',
        sector: 'ecommerce',
        funding_amount: 380000000,
        funding_currency: 'INR',
        headline: 'Spinny closes $48M funding round from Net珠江',
        published_date: '2026-03-18',
        source: 'GDELT',
        source_url: 'https://example.com/spinny'
    },
    {
        company_name: 'MediBuddy',
        sector: 'healthtech',
        funding_amount: 480000000,
        funding_currency: 'INR',
        headline: 'MediBuddy raises $60M in Series C from Inv Asha',
        published_date: '2026-03-20',
        source: 'MediaStack',
        source_url: 'https://example.com/medibuddy'
    },
    {
        company_name: 'Zepto',
        sector: 'ecommerce',
        funding_amount: 1200000000,
        funding_currency: 'INR',
        headline: 'Zepto raises $150M in Series E from Nexus Venture',
        published_date: '2026-03-22',
        source: 'GDELT',
        source_url: 'https://example.com/zepto'
    },
    {
        company_name: 'Fyers',
        sector: 'fintech',
        funding_amount: 180000000,
        funding_currency: 'INR',
        headline: 'Fyers raises $22M in Series B from Lachy Groom',
        published_date: '2026-03-24',
        source: 'GDELT',
        source_url: 'https://example.com/fyers'
    }
];

async function seedDatabase() {
    console.log('='.repeat(60));
    console.log('DATABASE SEEDING SCRIPT');
    console.log('='.repeat(60));

    try {
        // Connect to database
        console.log('\n[1/3] Connecting to database...');
        await databaseService.connect();
        console.log('Database connected successfully');

        // Seed funding records
        console.log('\n[2/3] Inserting sample funding records...');
        const result = await databaseService.insertFundingBatch(SAMPLE_FUNDING_RECORDS);

        console.log('-'.repeat(40));
        console.log(`  Records Inserted:  ${result.inserted}`);
        console.log(`  Records Duplicates: ${result.duplicates}`);
        console.log(`  Errors:            ${result.errors.length}`);

        if (result.errors.length > 0) {
            console.log('\n  Errors:');
            result.errors.forEach((err, i) => {
                console.log(`    ${i + 1}. ${err.company}: ${err.error}`);
            });
        }

        // Create test user
        console.log('\n[3/3] Creating test user...');
        const passwordHash = await bcrypt.hash('Test@123456', 12);

        // Note: In production, use Supabase Auth instead
        console.log('  Test user already exists or will be created via Supabase Auth');

        console.log('\n' + '='.repeat(60));
        console.log('SEEDING COMPLETED');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('\nFATAL ERROR:', error.message);
        process.exit(1);
    }
}

seedDatabase().catch(console.error);
