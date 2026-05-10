-- =====================================================
-- SUPABASE POSTGRESQL SCHEMA
-- Indian Startup Funding Tracker - Production Database
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: startup_funding
-- Stores processed startup funding records
-- =====================================================
CREATE TABLE IF NOT EXISTS startup_funding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(500) NOT NULL,
    sector VARCHAR(200),
    funding_amount DECIMAL(15, 2),
    funding_currency VARCHAR(10) DEFAULT 'INR',
    headline TEXT NOT NULL,
    published_date DATE NOT NULL,
    source VARCHAR(200),
    source_url TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint to prevent duplicate records
    CONSTRAINT unique_funding_record UNIQUE (headline, published_date)
);

-- =====================================================
-- INDEXES FOR OPTIMIZED QUERIES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_funding_published_date ON startup_funding(published_date);
CREATE INDEX IF NOT EXISTS idx_funding_sector ON startup_funding(sector);
CREATE INDEX IF NOT EXISTS idx_funding_company ON startup_funding(company_name);
CREATE INDEX IF NOT EXISTS idx_funding_amount ON startup_funding(funding_amount);
CREATE INDEX IF NOT EXISTS idx_funding_source ON startup_funding(source);

-- Composite index for date range queries
CREATE INDEX IF NOT EXISTS idx_funding_date_range ON startup_funding(published_date, sector);

-- =====================================================
-- TABLE: data_pipeline_logs
-- Tracks pipeline execution and data quality
-- =====================================================
CREATE TABLE IF NOT EXISTS data_pipeline_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_name VARCHAR(100) NOT NULL,
    execution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    records_fetched INTEGER DEFAULT 0,
    records_cleaned INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_discarded INTEGER DEFAULT 0,
    records_duplicates INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_date ON data_pipeline_logs(execution_date);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_status ON data_pipeline_logs(status);

-- =====================================================
-- TABLE: users
-- Authentication and user management
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- TABLE: api_keys
-- External API key management
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    rate_limit INTEGER,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for startup_funding
DROP TRIGGER IF EXISTS update_startup_funding_updated_at ON startup_funding;
CREATE TRIGGER update_startup_funding_updated_at
    BEFORE UPDATE ON startup_funding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for api_keys
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE startup_funding ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_pipeline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read funding data
CREATE POLICY "Allow authenticated read" ON startup_funding
    FOR SELECT TO authenticated USING (true);

-- Policy: Service role can insert/update funding data
CREATE POLICY "Service role all access" ON startup_funding
    FOR ALL TO service_role USING (true);

-- Policy: Service role can manage pipeline logs
CREATE POLICY "Service role pipeline logs" ON data_pipeline_logs
    FOR ALL TO service_role USING (true);

-- Policy: Users can read their own profile
CREATE POLICY "Users read own profile" ON users
    FOR SELECT TO authenticated USING (auth.uid() = id);

-- =====================================================
-- VIEWS FOR DASHBOARD QUERIES
-- =====================================================

-- View: Monthly funding summary
CREATE OR REPLACE VIEW monthly_funding_summary AS
SELECT
    DATE_TRUNC('month', published_date) as month,
    sector,
    COUNT(*) as total_deals,
    SUM(funding_amount) as total_amount,
    AVG(funding_amount) as avg_deal_size,
    MAX(funding_amount) as largest_deal
FROM startup_funding
WHERE funding_amount IS NOT NULL
GROUP BY DATE_TRUNC('month', published_date), sector
ORDER BY month DESC;

-- View: Sector-wise funding distribution
CREATE OR REPLACE VIEW sector_distribution AS
SELECT
    sector,
    COUNT(*) as deal_count,
    SUM(funding_amount) as total_funding,
    AVG(funding_amount) as avg_funding,
    COUNT(DISTINCT company_name) as unique_companies
FROM startup_funding
WHERE sector IS NOT NULL AND funding_amount IS NOT NULL
GROUP BY sector
ORDER BY total_funding DESC;

-- View: Recent funding events (last 30 days)
CREATE OR REPLACE VIEW recent_funding AS
SELECT
    id,
    company_name,
    sector,
    funding_amount,
    funding_currency,
    headline,
    published_date,
    source,
    created_at
FROM startup_funding
WHERE published_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY published_date DESC;

-- =====================================================
-- INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert a test user (password: 'Test@123456')
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@startuptracker.com', '$2b$10$rICkQKJqHNKvLGf7hCZPQ.Y7WnX9dCqN5YV3p8gHJkLmN2oP4Q6Rs', 'System Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON startup_funding TO authenticated;
GRANT SELECT ON startup_funding TO anon;
GRANT ALL ON startup_funding TO service_role;
GRANT ALL ON data_pipeline_logs TO service_role;
GRANT SELECT ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
