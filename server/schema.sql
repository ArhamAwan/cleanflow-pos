-- ========================================
-- CleanFlow POS - Server Database Schema
-- PostgreSQL Schema for Multi-PC Sync
-- ========================================
-- 
-- This schema is designed for safe multi-PC synchronization:
-- - Composite unique keys: (id, device_id) allow same UUID from different devices
-- - Idempotent inserts: Safe to resend same record multiple times
-- - Immutable ledgers: Ledger entries cannot be modified
-- - Sync tracking: Track sync status and timestamps
--
-- IMPORTANT: This schema matches the local SQLite schema but uses PostgreSQL types
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CORE TABLES (Matching Local Schema)
-- ========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'accountant', 'data_entry')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,
    
    -- Composite unique key: same UUID from different devices is allowed
    PRIMARY KEY (id, device_id),
    
    -- Indexes for sync queries
    CONSTRAINT idx_users_email_device UNIQUE (email, device_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(sync_status);
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    outstanding_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,
    
    PRIMARY KEY (id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status);
CREATE INDEX IF NOT EXISTS idx_customers_device_id ON customers(device_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Service types table
CREATE TABLE IF NOT EXISTS service_types (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(15, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,
    
    PRIMARY KEY (id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_service_types_name ON service_types(name);
CREATE INDEX IF NOT EXISTS idx_service_types_sync_status ON service_types(sync_status);
CREATE INDEX IF NOT EXISTS idx_service_types_device_id ON service_types(device_id);
CREATE INDEX IF NOT EXISTS idx_service_types_created_at ON service_types(created_at);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('paid', 'partial', 'unpaid')),
    paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,
    
    PRIMARY KEY (id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_service_id ON jobs(service_id);
CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(date);
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON jobs(payment_status);
CREATE INDEX IF NOT EXISTS idx_jobs_sync_status ON jobs(sync_status);
CREATE INDEX IF NOT EXISTS idx_jobs_device_id ON jobs(device_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('cash_in', 'cash_out')),
    amount DECIMAL(15, 2) NOT NULL,
    method TEXT NOT NULL CHECK(method IN ('cash', 'bank')),
    customer_id TEXT,
    job_id TEXT,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,
    
    PRIMARY KEY (id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON payments(sync_status);
CREATE INDEX IF NOT EXISTS idx_payments_device_id ON payments(device_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    method TEXT NOT NULL CHECK(method IN ('cash', 'bank')),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,
    
    PRIMARY KEY (id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_sync_status ON expenses(sync_status);
CREATE INDEX IF NOT EXISTS idx_expenses_device_id ON expenses(device_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

-- Ledger entries table (IMMUTABLE - Append-only)
-- This table stores all financial transactions for double-entry bookkeeping
-- Entries can NEVER be deleted or modified - corrections use adjustment entries
CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK(entry_type IN (
        'JOB_CREATED',
        'PAYMENT_RECEIVED',
        'PAYMENT_MADE',
        'EXPENSE_RECORDED',
        'ADJUSTMENT',
        'OPENING_BALANCE'
    )),
    reference_type TEXT NOT NULL CHECK(reference_type IN ('job', 'payment', 'expense', 'customer', 'system')),
    reference_id TEXT NOT NULL,
    customer_id TEXT,
    description TEXT NOT NULL,
    debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,
    
    PRIMARY KEY (id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_type ON ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_sync_status ON ledger_entries(sync_status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_device_id ON ledger_entries(device_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at);

-- Prevent updates on ledger_entries (immutability)
CREATE OR REPLACE FUNCTION prevent_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries cannot be modified. Use adjustment entries instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_ledger_update_trigger ON ledger_entries;
CREATE TRIGGER prevent_ledger_update_trigger
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_update();

-- Prevent deletes on ledger_entries (immutability)
CREATE OR REPLACE FUNCTION prevent_ledger_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries cannot be deleted. Use adjustment entries instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_ledger_delete_trigger ON ledger_entries;
CREATE TRIGGER prevent_ledger_delete_trigger
    BEFORE DELETE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_delete();

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE')),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    device_id TEXT NOT NULL,
    
    PRIMARY KEY (id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sync_status ON audit_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_device_id ON audit_logs(device_id);

-- ========================================
-- SYNC TRACKING TABLE
-- ========================================

-- Track sync operations for monitoring and debugging
CREATE TABLE IF NOT EXISTS sync_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_count INTEGER NOT NULL,
    sync_type TEXT NOT NULL CHECK(sync_type IN ('UPLOAD', 'DOWNLOAD')),
    status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_operations_device_id ON sync_operations(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_sync_operations_started_at ON sync_operations(started_at);

-- ========================================
-- IDEMPOTENT SYNC FUNCTIONS
-- ========================================

-- Function for idempotent customer sync
-- Uses ON CONFLICT to handle duplicate syncs safely
CREATE OR REPLACE FUNCTION sync_customer(
    p_id TEXT,
    p_device_id TEXT,
    p_name TEXT,
    p_phone TEXT,
    p_address TEXT,
    p_outstanding_balance DECIMAL,
    p_created_at TIMESTAMPTZ,
    p_updated_at TIMESTAMPTZ,
    p_sync_status TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO customers (
        id, device_id, name, phone, address, outstanding_balance,
        created_at, updated_at, sync_status
    ) VALUES (
        p_id, p_device_id, p_name, p_phone, p_address, p_outstanding_balance,
        p_created_at, p_updated_at, p_sync_status
    )
    ON CONFLICT (id, device_id) 
    DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        outstanding_balance = EXCLUDED.outstanding_balance,
        updated_at = EXCLUDED.updated_at,
        sync_status = EXCLUDED.sync_status
    WHERE EXCLUDED.updated_at > customers.updated_at; -- Last update wins
END;
$$ LANGUAGE plpgsql;

-- Function for idempotent job sync
CREATE OR REPLACE FUNCTION sync_job(
    p_id TEXT,
    p_device_id TEXT,
    p_customer_id TEXT,
    p_service_id TEXT,
    p_date DATE,
    p_amount DECIMAL,
    p_payment_status TEXT,
    p_paid_amount DECIMAL,
    p_notes TEXT,
    p_created_at TIMESTAMPTZ,
    p_updated_at TIMESTAMPTZ,
    p_sync_status TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO jobs (
        id, device_id, customer_id, service_id, date, amount,
        payment_status, paid_amount, notes,
        created_at, updated_at, sync_status
    ) VALUES (
        p_id, p_device_id, p_customer_id, p_service_id, p_date, p_amount,
        p_payment_status, p_paid_amount, p_notes,
        p_created_at, p_updated_at, p_sync_status
    )
    ON CONFLICT (id, device_id)
    DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        service_id = EXCLUDED.service_id,
        date = EXCLUDED.date,
        amount = EXCLUDED.amount,
        payment_status = EXCLUDED.payment_status,
        paid_amount = EXCLUDED.paid_amount,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at,
        sync_status = EXCLUDED.sync_status
    WHERE EXCLUDED.updated_at > jobs.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function for idempotent payment sync
CREATE OR REPLACE FUNCTION sync_payment(
    p_id TEXT,
    p_device_id TEXT,
    p_type TEXT,
    p_amount DECIMAL,
    p_method TEXT,
    p_customer_id TEXT,
    p_job_id TEXT,
    p_description TEXT,
    p_date DATE,
    p_created_at TIMESTAMPTZ,
    p_updated_at TIMESTAMPTZ,
    p_sync_status TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO payments (
        id, device_id, type, amount, method, customer_id, job_id,
        description, date, created_at, updated_at, sync_status
    ) VALUES (
        p_id, p_device_id, p_type, p_amount, p_method, p_customer_id, p_job_id,
        p_description, p_date, p_created_at, p_updated_at, p_sync_status
    )
    ON CONFLICT (id, device_id)
    DO UPDATE SET
        type = EXCLUDED.type,
        amount = EXCLUDED.amount,
        method = EXCLUDED.method,
        customer_id = EXCLUDED.customer_id,
        job_id = EXCLUDED.job_id,
        description = EXCLUDED.description,
        date = EXCLUDED.date,
        updated_at = EXCLUDED.updated_at,
        sync_status = EXCLUDED.sync_status
    WHERE EXCLUDED.updated_at > payments.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function for idempotent expense sync
CREATE OR REPLACE FUNCTION sync_expense(
    p_id TEXT,
    p_device_id TEXT,
    p_category TEXT,
    p_amount DECIMAL,
    p_description TEXT,
    p_method TEXT,
    p_date DATE,
    p_created_at TIMESTAMPTZ,
    p_updated_at TIMESTAMPTZ,
    p_sync_status TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO expenses (
        id, device_id, category, amount, description, method, date,
        created_at, updated_at, sync_status
    ) VALUES (
        p_id, p_device_id, p_category, p_amount, p_description, p_method, p_date,
        p_created_at, p_updated_at, p_sync_status
    )
    ON CONFLICT (id, device_id)
    DO UPDATE SET
        category = EXCLUDED.category,
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        method = EXCLUDED.method,
        date = EXCLUDED.date,
        updated_at = EXCLUDED.updated_at,
        sync_status = EXCLUDED.sync_status
    WHERE EXCLUDED.updated_at > expenses.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function for idempotent ledger entry sync (append-only, no updates)
CREATE OR REPLACE FUNCTION sync_ledger_entry(
    p_id TEXT,
    p_device_id TEXT,
    p_entry_type TEXT,
    p_reference_type TEXT,
    p_reference_id TEXT,
    p_customer_id TEXT,
    p_description TEXT,
    p_debit DECIMAL,
    p_credit DECIMAL,
    p_balance DECIMAL,
    p_date DATE,
    p_created_at TIMESTAMPTZ,
    p_updated_at TIMESTAMPTZ,
    p_sync_status TEXT
) RETURNS VOID AS $$
BEGIN
    -- Ledger entries are immutable - only insert, never update
    INSERT INTO ledger_entries (
        id, device_id, entry_type, reference_type, reference_id, customer_id,
        description, debit, credit, balance, date,
        created_at, updated_at, sync_status
    ) VALUES (
        p_id, p_device_id, p_entry_type, p_reference_type, p_reference_id, p_customer_id,
        p_description, p_debit, p_credit, p_balance, p_date,
        p_created_at, p_updated_at, p_sync_status
    )
    ON CONFLICT (id, device_id) DO NOTHING; -- Idempotent: ignore if already exists
END;
$$ LANGUAGE plpgsql;

-- Function for idempotent service type sync
CREATE OR REPLACE FUNCTION sync_service_type(
    p_id TEXT,
    p_device_id TEXT,
    p_name TEXT,
    p_description TEXT,
    p_price DECIMAL,
    p_is_active BOOLEAN,
    p_created_at TIMESTAMPTZ,
    p_updated_at TIMESTAMPTZ,
    p_sync_status TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO service_types (
        id, device_id, name, description, price, is_active,
        created_at, updated_at, sync_status
    ) VALUES (
        p_id, p_device_id, p_name, p_description, p_price, p_is_active,
        p_created_at, p_updated_at, p_sync_status
    )
    ON CONFLICT (id, device_id)
    DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at,
        sync_status = EXCLUDED.sync_status
    WHERE EXCLUDED.updated_at > service_types.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function for idempotent user sync
CREATE OR REPLACE FUNCTION sync_user(
    p_id TEXT,
    p_device_id TEXT,
    p_name TEXT,
    p_email TEXT,
    p_password_hash TEXT,
    p_role TEXT,
    p_is_active BOOLEAN,
    p_created_at TIMESTAMPTZ,
    p_updated_at TIMESTAMPTZ,
    p_sync_status TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO users (
        id, device_id, name, email, password_hash, role, is_active,
        created_at, updated_at, sync_status
    ) VALUES (
        p_id, p_device_id, p_name, p_email, p_password_hash, p_role, p_is_active,
        p_created_at, p_updated_at, p_sync_status
    )
    ON CONFLICT (id, device_id)
    DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at,
        sync_status = EXCLUDED.sync_status
    WHERE EXCLUDED.updated_at > users.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function for idempotent audit log sync
CREATE OR REPLACE FUNCTION sync_audit_log(
    p_id TEXT,
    p_device_id TEXT,
    p_action TEXT,
    p_table_name TEXT,
    p_record_id TEXT,
    p_old_value JSONB,
    p_new_value JSONB,
    p_user_id TEXT,
    p_created_at TIMESTAMPTZ,
    p_sync_status TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        id, device_id, action, table_name, record_id,
        old_value, new_value, user_id, created_at, sync_status
    ) VALUES (
        p_id, p_device_id, p_action, p_table_name, p_record_id,
        p_old_value, p_new_value, p_user_id, p_created_at, p_sync_status
    )
    ON CONFLICT (id, device_id) DO NOTHING; -- Audit logs are append-only
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- QUERY FUNCTIONS FOR SYNC
-- ========================================

-- Get all pending records for a device (for upload)
CREATE OR REPLACE FUNCTION get_pending_records(
    p_device_id TEXT,
    p_table_name TEXT,
    p_limit INTEGER DEFAULT 1000
) RETURNS TABLE (
    record_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE format('
        SELECT row_to_json(t)::jsonb
        FROM %I t
        WHERE device_id = $1 AND sync_status = ''PENDING''
        ORDER BY created_at ASC
        LIMIT $2
    ', p_table_name)
    USING p_device_id, p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get records from other devices (for download)
CREATE OR REPLACE FUNCTION get_other_device_records(
    p_device_id TEXT,
    p_table_name TEXT,
    p_since TIMESTAMPTZ DEFAULT '1970-01-01'::timestamptz,
    p_limit INTEGER DEFAULT 1000
) RETURNS TABLE (
    record_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE format('
        SELECT row_to_json(t)::jsonb
        FROM %I t
        WHERE device_id != $1 
        AND (updated_at > $2 OR sync_status = ''PENDING'')
        ORDER BY created_at ASC
        LIMIT $3
    ', p_table_name)
    USING p_device_id, p_since, p_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- NOTES
-- ========================================
-- 
-- Key Design Decisions:
-- 1. Composite Primary Key (id, device_id): Allows same UUID from different devices
-- 2. Idempotent Sync Functions: Safe to resend same record multiple times
-- 3. Last Update Wins: Conflict resolution based on updated_at timestamp
-- 4. Immutable Ledgers: Ledger entries cannot be updated (triggers prevent it)
-- 5. Sync Status Tracking: Monitor sync operations and failures
--
-- Usage:
-- - Client sends records with device_id
-- - Server uses sync_* functions for idempotent inserts
-- - Client can safely retry failed syncs
-- - Multiple PCs can sync independently without conflicts

