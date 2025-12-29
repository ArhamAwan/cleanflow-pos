# Database Schema Documentation

## Overview

This document describes the complete database schema for the CleanFlow POS system, including both the local SQLite schema (used on each PC) and the server PostgreSQL schema (used for synchronization).

## Schema Design Principles

### 1. Multi-PC Safety

- **UUID Primary Keys**: All records use UUID v4 as primary key
- **Device ID**: Every record includes `device_id` to identify which PC created it
- **Composite Keys**: Server uses `(id, device_id)` composite primary keys to allow same UUID from different devices

### 2. Sync-Ready Design

- **Sync Status**: Every table has `sync_status` field (`PENDING`, `SYNCED`, `FAILED`)
- **Timestamps**: `created_at` and `updated_at` track record lifecycle
- **Idempotent Operations**: Server functions handle duplicate syncs safely

### 3. Data Integrity

- **Foreign Keys**: Referential integrity enforced at database level
- **Transactions**: All financial operations use ACID transactions
- **Immutable Ledgers**: Ledger entries cannot be modified or deleted

## Standard Fields (Every Table)

Every table in the system includes these standard fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT (UUID) | Primary key - UUID v4 |
| `device_id` | TEXT (UUID) | UUID of the PC that created this record |
| `created_at` | TEXT (ISO 8601) | Timestamp when record was created |
| `updated_at` | TEXT (ISO 8601) | Timestamp when record was last updated |
| `sync_status` | TEXT | Sync status: `PENDING`, `SYNCED`, or `FAILED` |

**Important Notes:**
- `id` and `device_id` together uniquely identify a record across all PCs
- `created_at` and `device_id` are immutable (never change)
- `updated_at` changes on every update
- `sync_status` starts as `PENDING` and changes to `SYNCED` after successful sync

## Local SQLite Schema

### Tables

#### 1. `users`
Stores user accounts for authentication and authorization.

**Fields:**
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `email` (TEXT UNIQUE NOT NULL)
- `password_hash` (TEXT)
- `role` (TEXT NOT NULL) - Values: `'admin'`, `'accountant'`, `'data_entry'`
- `is_active` (INTEGER NOT NULL DEFAULT 1)
- Standard fields: `created_at`, `updated_at`, `sync_status`, `device_id`

**Indexes:**
- `idx_users_email` - Fast email lookups
- `idx_users_sync_status` - Sync queries
- `idx_users_device_id` - Device-specific queries
- `idx_users_created_at` - Chronological queries

#### 2. `customers`
Stores customer information and outstanding balances.

**Fields:**
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `phone` (TEXT)
- `address` (TEXT)
- `outstanding_balance` (REAL NOT NULL DEFAULT 0)
- Standard fields: `created_at`, `updated_at`, `sync_status`, `device_id`

**Indexes:**
- `idx_customers_name` - Name searches
- `idx_customers_phone` - Phone lookups
- `idx_customers_sync_status` - Sync queries
- `idx_customers_device_id` - Device-specific queries
- `idx_customers_created_at` - Chronological queries

#### 3. `service_types`
Stores the catalog of services offered.

**Fields:**
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `description` (TEXT)
- `price` (REAL NOT NULL)
- `is_active` (INTEGER NOT NULL DEFAULT 1)
- Standard fields: `created_at`, `updated_at`, `sync_status`, `device_id`

**Indexes:**
- `idx_service_types_name` - Name searches
- `idx_service_types_sync_status` - Sync queries
- `idx_service_types_device_id` - Device-specific queries
- `idx_service_types_created_at` - Chronological queries

#### 4. `jobs`
Stores service jobs created for customers.

**Fields:**
- `id` (TEXT PRIMARY KEY)
- `customer_id` (TEXT NOT NULL) - Foreign key to `customers.id`
- `service_id` (TEXT NOT NULL) - Foreign key to `service_types.id`
- `date` (TEXT NOT NULL) - Date in YYYY-MM-DD format
- `amount` (REAL NOT NULL)
- `payment_status` (TEXT NOT NULL DEFAULT 'unpaid') - Values: `'paid'`, `'partial'`, `'unpaid'`
- `paid_amount` (REAL NOT NULL DEFAULT 0)
- `notes` (TEXT)
- Standard fields: `created_at`, `updated_at`, `sync_status`, `device_id`

**Foreign Keys:**
- `customer_id` → `customers.id`
- `service_id` → `service_types.id`

**Indexes:**
- `idx_jobs_customer_id` - Customer job queries
- `idx_jobs_service_id` - Service queries
- `idx_jobs_date` - Date range queries
- `idx_jobs_payment_status` - Payment status filters
- `idx_jobs_sync_status` - Sync queries
- `idx_jobs_device_id` - Device-specific queries
- `idx_jobs_created_at` - Chronological queries

#### 5. `payments`
Stores payment transactions (cash in/out).

**Fields:**
- `id` (TEXT PRIMARY KEY)
- `type` (TEXT NOT NULL) - Values: `'cash_in'`, `'cash_out'`
- `amount` (REAL NOT NULL)
- `method` (TEXT NOT NULL) - Values: `'cash'`, `'bank'`
- `customer_id` (TEXT) - Foreign key to `customers.id` (nullable)
- `job_id` (TEXT) - Foreign key to `jobs.id` (nullable)
- `description` (TEXT)
- `date` (TEXT NOT NULL) - Date in YYYY-MM-DD format
- Standard fields: `created_at`, `updated_at`, `sync_status`, `device_id`

**Foreign Keys:**
- `customer_id` → `customers.id`
- `job_id` → `jobs.id`

**Indexes:**
- `idx_payments_customer_id` - Customer payment queries
- `idx_payments_job_id` - Job payment queries
- `idx_payments_date` - Date range queries
- `idx_payments_type` - Cash in/out filters
- `idx_payments_sync_status` - Sync queries
- `idx_payments_device_id` - Device-specific queries
- `idx_payments_created_at` - Chronological queries

#### 6. `expenses`
Stores business expenses.

**Fields:**
- `id` (TEXT PRIMARY KEY)
- `category` (TEXT NOT NULL)
- `amount` (REAL NOT NULL)
- `description` (TEXT)
- `method` (TEXT NOT NULL) - Values: `'cash'`, `'bank'`
- `date` (TEXT NOT NULL) - Date in YYYY-MM-DD format
- Standard fields: `created_at`, `updated_at`, `sync_status`, `device_id`

**Indexes:**
- `idx_expenses_category` - Category filters
- `idx_expenses_date` - Date range queries
- `idx_expenses_sync_status` - Sync queries
- `idx_expenses_device_id` - Device-specific queries
- `idx_expenses_created_at` - Chronological queries

#### 7. `ledger_entries` (IMMUTABLE)
Stores all financial transactions for double-entry bookkeeping. **This table is append-only - entries cannot be modified or deleted.**

**Fields:**
- `id` (TEXT PRIMARY KEY)
- `entry_type` (TEXT NOT NULL) - Values: `'JOB_CREATED'`, `'PAYMENT_RECEIVED'`, `'PAYMENT_MADE'`, `'EXPENSE_RECORDED'`, `'ADJUSTMENT'`, `'OPENING_BALANCE'`
- `reference_type` (TEXT NOT NULL) - Values: `'job'`, `'payment'`, `'expense'`, `'customer'`, `'system'`
- `reference_id` (TEXT NOT NULL) - ID of the referenced record
- `customer_id` (TEXT) - Foreign key to `customers.id` (nullable)
- `description` (TEXT NOT NULL)
- `debit` (REAL NOT NULL DEFAULT 0)
- `credit` (REAL NOT NULL DEFAULT 0)
- `balance` (REAL NOT NULL DEFAULT 0)
- `date` (TEXT NOT NULL) - Date in YYYY-MM-DD format
- Standard fields: `created_at`, `updated_at`, `sync_status`, `device_id`

**Foreign Keys:**
- `customer_id` → `customers.id`

**Triggers:**
- `prevent_ledger_update` - Prevents UPDATE operations
- `prevent_ledger_delete` - Prevents DELETE operations

**Indexes:**
- `idx_ledger_entries_entry_type` - Entry type filters
- `idx_ledger_entries_reference` - Reference lookups (composite)
- `idx_ledger_entries_customer_id` - Customer ledger queries
- `idx_ledger_entries_date` - Date range queries
- `idx_ledger_entries_sync_status` - Sync queries
- `idx_ledger_entries_device_id` - Device-specific queries
- `idx_ledger_entries_created_at` - Chronological queries

**Important:** Corrections to ledger entries must be made using new `ADJUSTMENT` entries, never by modifying existing entries.

#### 8. `audit_logs`
Stores audit trail of all data changes.

**Fields:**
- `id` (TEXT PRIMARY KEY)
- `action` (TEXT NOT NULL) - Values: `'CREATE'`, `'UPDATE'`, `'DELETE'`
- `table_name` (TEXT NOT NULL)
- `record_id` (TEXT NOT NULL)
- `old_value` (TEXT) - JSON string of old record (nullable)
- `new_value` (TEXT) - JSON string of new record (nullable)
- `user_id` (TEXT) - ID of user who made the change (nullable)
- `created_at` (TEXT NOT NULL)
- Standard fields: `sync_status`, `device_id` (no `updated_at` - audit logs are immutable)

**Indexes:**
- `idx_audit_logs_table_record` - Record history queries (composite)
- `idx_audit_logs_created_at` - Chronological queries
- `idx_audit_logs_sync_status` - Sync queries
- `idx_audit_logs_device_id` - Device-specific queries

#### 9. `app_settings` (Internal)
Stores application settings (not synced).

**Fields:**
- `key` (TEXT PRIMARY KEY)
- `value` (TEXT NOT NULL)
- `created_at` (TEXT NOT NULL)
- `updated_at` (TEXT NOT NULL)

**Usage:** Stores `device_id` and other local settings.

#### 10. `migrations` (Internal)
Tracks which migrations have been executed (not synced).

**Fields:**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (TEXT NOT NULL UNIQUE)
- `executed_at` (TEXT NOT NULL)

## Server PostgreSQL Schema

The server schema matches the local SQLite schema with these key differences:

### Type Differences

| SQLite Type | PostgreSQL Type |
|-------------|-----------------|
| `TEXT` | `TEXT` |
| `REAL` | `DECIMAL(15, 2)` |
| `INTEGER` | `BOOLEAN` (for flags) or `INTEGER` |
| `TEXT` (ISO timestamp) | `TIMESTAMPTZ` |
| `TEXT` (JSON) | `JSONB` |

### Composite Primary Keys

All server tables use composite primary keys:
```sql
PRIMARY KEY (id, device_id)
```

This allows:
- Same UUID from different devices to coexist
- Safe multi-PC synchronization
- No conflicts when syncing

### Idempotent Sync Functions

The server provides these functions for safe synchronization:

1. **`sync_customer()`** - Idempotent customer sync (last update wins)
2. **`sync_job()`** - Idempotent job sync (last update wins)
3. **`sync_payment()`** - Idempotent payment sync (last update wins)
4. **`sync_expense()`** - Idempotent expense sync (last update wins)
5. **`sync_ledger_entry()`** - Append-only ledger sync (no updates)
6. **`sync_service_type()`** - Idempotent service type sync (last update wins)
7. **`sync_user()`** - Idempotent user sync (last update wins)
8. **`sync_audit_log()`** - Append-only audit log sync (no updates)

### Sync Tracking Table

**`sync_operations`** - Tracks sync operations for monitoring:

**Fields:**
- `id` (UUID PRIMARY KEY)
- `device_id` (TEXT NOT NULL)
- `table_name` (TEXT NOT NULL)
- `record_count` (INTEGER NOT NULL)
- `sync_type` (TEXT NOT NULL) - Values: `'UPLOAD'`, `'DOWNLOAD'`
- `status` (TEXT NOT NULL) - Values: `'SUCCESS'`, `'FAILED'`, `'PARTIAL'`
- `error_message` (TEXT)
- `started_at` (TIMESTAMPTZ NOT NULL)
- `completed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ NOT NULL)

## Sync Design Patterns

### 1. Idempotent Inserts

Server functions use `ON CONFLICT` to handle duplicates:

```sql
INSERT INTO customers (...)
VALUES (...)
ON CONFLICT (id, device_id)
DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = EXCLUDED.updated_at,
    sync_status = EXCLUDED.sync_status
WHERE EXCLUDED.updated_at > customers.updated_at;
```

**Last Update Wins**: Record with newer `updated_at` overwrites older one.

### 2. Append-Only Tables

For immutable tables (ledger, audit logs):

```sql
INSERT INTO ledger_entries (...)
VALUES (...)
ON CONFLICT (id, device_id) DO NOTHING;
```

**Idempotent**: Duplicate syncs are safely ignored.

### 3. Sync Status Lifecycle

1. **PENDING**: Record created locally, not yet synced
2. **SYNCED**: Record successfully synced to server
3. **FAILED**: Sync attempt failed (will retry)

### 4. Device ID Usage

- Every record includes `device_id` of the PC that created it
- Server uses `(id, device_id)` composite key
- Allows same UUID from different devices
- Enables safe multi-PC synchronization

## Index Strategy

### Local Database Indexes

Indexes are created for:
- **Primary lookups**: `id`, `email`, `name`
- **Foreign keys**: `customer_id`, `job_id`, `service_id`
- **Sync queries**: `sync_status`, `device_id`
- **Date queries**: `date`, `created_at`
- **Business queries**: `payment_status`, `category`, `type`

### Server Database Indexes

Server includes all local indexes plus:
- Composite indexes for sync queries
- Indexes on `(device_id, sync_status)` for efficient sync operations
- Indexes on `created_at` for chronological queries

## Data Integrity Rules

### 1. Foreign Key Constraints

- Enforced at database level
- Prevents orphaned records
- Cascading behavior: None (explicit deletes required)

### 2. Check Constraints

- `sync_status`: Must be `'PENDING'`, `'SYNCED'`, or `'FAILED'`
- `payment_status`: Must be `'paid'`, `'partial'`, or `'unpaid'`
- `entry_type`: Must be valid ledger entry type
- `role`: Must be valid user role

### 3. Immutability Rules

- **Ledger entries**: Cannot be updated or deleted (triggers enforce)
- **Audit logs**: Cannot be updated (no `updated_at` field)
- **Device ID**: Never changes after creation
- **Created At**: Never changes after creation

### 4. Transaction Safety

- All financial operations use `withTransaction()` wrapper
- Ensures ACID compliance
- Automatic rollback on errors
- Prevents partial updates

## Migration Strategy

### Local Migrations

- Tracked in `migrations` table
- Run automatically on app startup
- Idempotent: Can run multiple times safely

### Server Migrations

- PostgreSQL schema defined in `server/schema.sql`
- Run manually or via migration tool
- Includes all tables, indexes, functions, triggers

## Best Practices

### 1. Always Include Standard Fields

Every new table must include:
- `id` (UUID primary key)
- `device_id` (UUID)
- `created_at` (ISO timestamp)
- `updated_at` (ISO timestamp)
- `sync_status` (default 'PENDING')

### 2. Use Transactions for Financial Operations

```javascript
const result = withTransaction((db) => {
  // Multiple operations here
  // All succeed or all fail
});
```

### 3. Never Modify Ledger History

- Use adjustment entries for corrections
- Never UPDATE or DELETE ledger entries
- Triggers will prevent accidental modifications

### 4. Preserve Device ID

- Never overwrite `device_id` on UPDATE
- `device_id` identifies which PC created the record
- Required for multi-PC sync

### 5. Update Sync Status Correctly

- Set `sync_status = 'PENDING'` on CREATE
- Set `sync_status = 'PENDING'` on UPDATE
- Server sets `sync_status = 'SYNCED'` after successful sync
- Set `sync_status = 'FAILED'` on sync errors

---

*Document Version: 1.0*  
*Last Updated: December 2024*

