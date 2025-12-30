# CleanFlow POS Sync Server

Express.js server for synchronizing data between multiple PCs running CleanFlow POS.

## Features

- **Multi-PC Sync**: Upload and download records between devices
- **Conflict Resolution**: Last update wins (timestamp-based)
- **Dependency Handling**: Ensures foreign key dependencies are met
- **Queue System**: Handles records with missing dependencies
- **Clock Skew Detection**: Warns about client/server time differences
- **Comprehensive Logging**: Winston-based logging
- **Pagination**: Handles large datasets efficiently

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Set Up PostgreSQL

Create a database:

```bash
createdb cleanflow_pos
```

Or using psql:

```sql
CREATE DATABASE cleanflow_pos;
```

### 3. Configure Environment

Create a `.env` file:

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=cleanflow_pos
DB_USER=postgres
DB_PASSWORD=your_password

SYNC_BATCH_SIZE=500
SYNC_MAX_RETRIES=5
```

### 4. Run Migrations

```bash
npm run db:migrate
```

This runs `schema.sql` to create all tables and functions.

### 5. Start Server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## API Endpoints

### Health

- `GET /api/health` - Basic health check
- `GET /api/health/db` - Database connection check
- `GET /api/health/stats` - Server statistics

### Sync

All sync endpoints require `X-Device-ID` header with a valid UUID.

- `POST /api/sync/upload` - Upload records from device
- `GET /api/sync/download` - Download records from other devices
- `POST /api/sync/batch-upload` - Upload multiple tables at once
- `GET /api/sync/batch-download` - Download multiple tables at once
- `GET /api/sync/status` - Get device sync status
- `GET /api/sync/queue` - Get pending queue items
- `POST /api/sync/queue/process` - Process queued items
- `GET /api/sync/conflicts` - Get recent conflicts

### Dependencies

- `POST /api/dependencies/fetch` - Fetch dependencies for records
- `GET /api/dependencies/check` - Check if dependencies exist
- `GET /api/dependencies/info/:tableName` - Get dependency info for table

## Sync Order

Tables must be synced in this order to satisfy foreign key dependencies:

1. **Tier 1** (no dependencies): `users`, `customers`, `service_types`, `expenses`
2. **Tier 2** (needs Tier 1): `jobs` (requires customers, service_types)
3. **Tier 3** (needs Tier 2): `payments` (requires customers, jobs)
4. **Tier 4** (needs Tier 1-3): `ledger_entries`
5. **Tier 5** (no dependencies): `audit_logs`

## Example Requests

### Upload Records

```bash
curl -X POST http://localhost:3001/api/sync/upload \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "tableName": "customers",
    "records": [
      {
        "id": "customer-uuid",
        "device_id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "phone": "1234567890",
        "address": "123 Main St",
        "outstanding_balance": 0,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "sync_status": "PENDING"
      }
    ]
  }'
```

### Download Records

```bash
curl -X GET "http://localhost:3001/api/sync/download?tableName=customers&limit=100" \
  -H "X-Device-ID: 550e8400-e29b-41d4-a716-446655440000"
```

### Check Dependencies

```bash
curl -X GET "http://localhost:3001/api/dependencies/check?tableName=jobs&ids=job-1,job-2" \
  -H "X-Device-ID: 550e8400-e29b-41d4-a716-446655440000"
```

## Error Handling

All errors return JSON with this format:

```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Error description",
  "errors": [] // For validation errors
}
```

## Development

### Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js    # PostgreSQL connection
│   │   ├── logger.js      # Winston logger
│   │   └── syncOrder.js   # Sync tier configuration
│   ├── middleware/
│   │   ├── clockSkew.js   # Clock skew detection
│   │   ├── errorHandler.js # Error handling
│   │   └── validator.js   # Request validation
│   ├── routes/
│   │   ├── dependencies.js # Dependency endpoints
│   │   ├── health.js      # Health check endpoints
│   │   └── sync.js        # Sync endpoints
│   ├── services/
│   │   ├── dependencyService.js # Dependency logic
│   │   └── syncService.js # Sync business logic
│   ├── db/
│   │   └── migrate.js     # Migration script
│   └── index.js           # App entry point
├── schema.sql             # PostgreSQL schema
├── package.json
└── README.md
```

### Logging

Logs are written to console in development. In production, they're also written to:

- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs

## License

MIT
