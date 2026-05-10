# Indian Startup Funding Tracker

## Production Data Engineering System

A comprehensive, real-time data engineering system for tracking Indian startup funding trends. This system implements a complete data pipeline from API ingestion to visualization.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA SOURCES                         │
│                    GDELT API  •  MediaStack API                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       INGESTION LAYER                               │
│                   Real-time API Fetching                            │
│              Rate Limiting • Error Handling • Retry                  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLEANING & TRANSFORMATION                        │
│  • Date Filtering (Jan-Feb 2026 / March 1-24, 2026)                │
│  • Keyword-based Relevance Filtering                               │
│  • Entity Extraction (Company Name, Amount, Sector)                │
│  • Data Validation & Normalization                                  │
│  • Deduplication (Hash-based)                                       │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPABASE POSTGRESQL                              │
│  • Historical Data Table (Jan-Feb 2026)                            │
│  • Live Data Table (March 1-24, 2026)                             │
│  • Pipeline Logs Table                                             │
│  • User Authentication                                             │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       API LAYER (Express.js)                        │
│  GET /fundings/historical  •  GET /fundings/live                   │
│  GET /fundings/filter      •  POST /pipeline/run                   │
│  JWT Authentication         •  Rate Limiting                        │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Tailwind)                       │
│  Login Page • Dashboard • Charts • Pipeline Controls               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Data Pipeline
- **Multi-source API Integration**: GDELT and MediaStack APIs
- **Automated Data Cleaning**: Keyword filtering, date validation, entity extraction
- **Sector Classification**: Automatic sector tagging using keyword mapping
- **Deduplication**: Unique constraint on headline + date prevents duplicates

### Data Layers
- **Historical Layer**: January 1 - February 28, 2026
- **Live Layer**: March 1 - March 24, 2026

### Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Token refresh mechanism

### Dashboard
- Real-time funding statistics
- Sector-wise distribution charts
- Funding event timeline
- Pipeline execution monitoring

---

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (PostgreSQL)
- GDELT API access (free)
- MediaStack API key (free tier available)

---

## Installation

### 1. Clone and Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Configure Environment

Create `.env` file in backend directory:

```bash
cp .env.example backend/.env
```

Update with your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-secure-jwt-secret
```

### 4. Set Up Supabase Database

Run the schema SQL in Supabase SQL Editor:

```bash
# Copy schema to clipboard
cat database/schema.sql | pbcopy

# Or read and execute in Supabase dashboard
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |

### Funding Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/fundings/historical` | Get Jan-Feb 2026 data |
| GET | `/api/v1/fundings/live` | Get March 2026 data |
| GET | `/api/v1/fundings/filter` | Advanced filtering |
| GET | `/api/v1/fundings/stats` | Dashboard statistics |
| GET | `/api/v1/fundings/sectors` | Sector distribution |

### Pipeline Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/pipeline/run` | Execute data pipeline |
| GET | `/api/v1/pipeline/status` | Get pipeline status |
| GET | `/api/v1/pipeline/logs` | Get pipeline logs |
| GET | `/api/v1/pipeline/health` | System health check |

---

## Data Schema

### startup_funding Table

```sql
CREATE TABLE startup_funding (
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
    CONSTRAINT unique_funding_record UNIQUE (headline, published_date)
);
```

### data_pipeline_logs Table

```sql
CREATE TABLE data_pipeline_logs (
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
    metadata JSONB
);
```

---

## Usage Examples

### Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@startuptracker.com", "password": "Test@123456"}'
```

### Get Historical Fundings

```bash
curl http://localhost:3001/api/v1/fundings/historical \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Run Live Pipeline

```bash
curl -X POST http://localhost:3001/api/v1/pipeline/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"type": "live"}'
```

---

## Sample API Response

### GET /fundings/live

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "companyName": "Cred",
      "sector": "fintech",
      "fundingAmount": 1200000000,
      "currency": "INR",
      "headline": "Cred raises $150M in Series F funding",
      "publishedDate": "2026-03-15",
      "source": "GDELT",
      "createdAt": "2026-03-15T10:30:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "dateRange": {
      "start": "2026-03-01",
      "end": "2026-03-24"
    },
    "isLive": true
  }
}
```

---

## Data Cleaning Logic

### Date Filtering

```javascript
// Historical: Jan 1 - Feb 28, 2026
// Live: March 1 - March 24, 2026

const isValidDateRange = (dateStr) => {
  const date = new Date(dateStr);
  const histStart = new Date('2026-01-01');
  const histEnd = new Date('2026-02-28');
  const liveStart = new Date('2026-03-01');
  const liveEnd = new Date('2026-03-24');

  return (date >= histStart && date <= histEnd) ||
         (date >= liveStart && date <= liveEnd);
};
```

### Funding Keywords

```javascript
const fundingKeywords = [
  'funding', 'raised', 'investment', 'series a', 'series b',
  'series c', 'series d', 'seed round', 'pre-series',
  'angel round', 'venture capital', 'financing'
];
```

### Sector Mapping

```javascript
const sectorMapping = {
  'fintech': ['fintech', 'financial', 'payments', 'banking'],
  'edtech': ['edtech', 'education', 'learning'],
  'healthtech': ['healthtech', 'healthcare', 'medical'],
  'ecommerce': ['ecommerce', 'retail', 'd2c', 'marketplace'],
  'saas': ['saas', 'software', 'b2b', 'enterprise'],
  'ai_ml': ['ai', 'artificial intelligence', 'ml']
};
```

---

## Logging System

The system logs all major events:

- API fetch success/failure with record counts
- Records processed through each pipeline stage
- Database operations (insert, select, errors)
- Authentication attempts
- Pipeline execution metrics

Log files are stored in `/logs` directory:
- `error.log` - Error-level messages
- `combined.log` - All messages
- `pipeline.log` - Pipeline-specific logs

---

## Security

- JWT token authentication for all protected routes
- Password hashing with bcrypt (12 salt rounds)
- Rate limiting (100 requests per 15 minutes)
- CORS configuration
- Helmet.js security headers
- SQL injection prevention via parameterized queries

---

## Production Deployment

### Build Frontend

```bash
cd frontend
npm run build
```

### Deploy Backend

```bash
cd backend
# Set NODE_ENV=production
npm start
```

---

## Demo Credentials

```
Email: admin@startuptracker.com
Password: Test@123456
```

---

## System Requirements for Production

- **Database**: Supabase PostgreSQL 15+
- **Backend**: Node.js 18+, 512MB RAM minimum
- **Frontend**: Any modern browser (Chrome, Firefox, Safari, Edge)
- **API Quotas**: GDELT (unlimited), MediaStack (500 requests/month free tier)

---

## License

MIT License - See LICENSE file for details

---

## Author

Built as a production-level academic project demonstrating real-world data engineering practices.
