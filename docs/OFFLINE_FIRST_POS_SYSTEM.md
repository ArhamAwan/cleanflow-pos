# Offline-First POS System: Complete Infrastructure Documentation

## 1. What the System Is

The CleanFlow POS system is a desktop application designed for managing point-of-sale operations, customer accounts, jobs, payments, expenses, and financial ledgers. It is built specifically for environments where internet connectivity is unreliable or unavailable.

### Key Characteristics

- **Offline-First Design**: The system works completely without internet. All operations happen locally on your computer.
- **Zero Downtime**: Business operations never stop due to connectivity issues. Work continues seamlessly whether internet is available or not.
- **Data Safety**: Every transaction is protected by database-level safety mechanisms. Data cannot be lost even if power fails during an operation.
- **Multi-PC Support**: Multiple computers can run the system independently, with data safely synchronized when internet becomes available.

### What It Does

- **Customer Management**: Store customer information, track outstanding balances, view customer transaction history
- **Job Management**: Create service jobs, track payment status, manage job details
- **Payment Processing**: Record customer payments, track cash flow, manage payment methods
- **Expense Tracking**: Record business expenses, categorize spending, track cash outflows
- **Financial Ledger**: Automatic double-entry bookkeeping with immutable transaction history
- **Reporting**: Generate daily reports, monthly summaries, customer statements, and financial reports - all offline

---

## 2. Core Principle

### Local-First Storage

Every piece of data is stored immediately on your local computer in a SQLite database. There is no waiting for server responses, no network delays, and no dependency on external services.

### Sync-Later Model

Internet connectivity is **optional**, not required. When internet is available, the system can synchronize data with a central server. When internet is not available, work continues normally.

### Internet as Enhancement

The internet connection serves only to synchronize data between multiple computers. It does not enable or disable any features. All functionality works identically whether online or offline.

### Work Never Stops

The system is designed so that connectivity issues never interrupt business operations. Employees can continue adding customers, creating jobs, recording payments, and generating reports regardless of network status.

---

## 3. High-Level Architecture

### System Components

Each computer running the POS system has:

- **Electron Desktop Application**: The user interface built with React
- **Local SQLite Database**: All data stored on the local hard drive
- **Unique Device ID**: Each computer is identified by a unique UUID

The server (when implemented) serves only as a synchronization meeting point. It does not control operations or store the primary copy of data.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    OFFLINE-FIRST POS SYSTEM                  │
└─────────────────────────────────────────────────────────────┘

    PC 1                          PC 2                          PC 3
┌─────────────┐            ┌─────────────┐            ┌─────────────┐
│  Electron   │            │  Electron   │            │  Electron   │
│   + React   │            │   + React   │            │   + React   │
│             │            │             │            │             │
│  SQLite DB  │            │  SQLite DB  │            │  SQLite DB  │
│  (Local)    │            │  (Local)    │            │  (Local)    │
│             │            │             │            │             │
│ Device ID:  │            │ Device ID:  │            │ Device ID:  │
│  UUID-1     │            │  UUID-2     │            │  UUID-3     │
└──────┬──────┘            └──────┬──────┘            └──────┬──────┘
       │                         │                         │
       │                         │                         │
       └─────────────┬───────────┴───────────┬───────────┘
                     │                       │
                     │   (Optional Sync)     │
                     │                       │
                     ▼                       ▼
            ┌───────────────────────────────┐
            │      Sync Server              │
            │   (PostgreSQL Database)       │
            │                               │
            │  - Receives data from PCs     │
            │  - Stores with device_id      │
            │  - Distributes to other PCs   │
            │  - Never controls operations │
            └───────────────────────────────┘

Key Points:
- PCs never communicate directly with each other
- Each PC works completely independently
- Server is only used for synchronization
- All operations work offline
```

### Communication Flow

- **PC to Database**: Direct local file access (instant, always available)
- **PC to Server**: HTTP requests (only when internet available, optional)
- **PC to PC**: Never happens directly (always through server if at all)

---

## 4. How Daily Work Happens (Offline)

All daily operations happen entirely on your local computer. No internet connection is checked or required.

### Adding a Customer

1. User fills out customer form (name, phone, address)
2. Clicks "Add Customer"
3. System generates a unique UUID for the customer
4. Data is saved immediately to local SQLite database
5. Customer appears in the list instantly
6. Record is marked with `sync_status = 'PENDING'` (for future sync)
7. **No internet check occurs**

### Creating a Job

1. User selects customer and service type
2. Enters job details (date, amount, notes)
3. Clicks "Create Job"
4. System performs these operations **in a single transaction**:
   - Creates job record with UUID
   - Creates ledger entry (debit to customer account)
   - Updates customer outstanding balance
   - Creates audit log entry
5. All operations succeed or fail together (transaction safety)
6. Job appears immediately in the system
7. **No internet check occurs**

### Recording a Payment

1. User selects job and enters payment amount
2. Chooses payment method (cash or bank transfer)
3. Clicks "Record Payment"
4. System performs these operations **in a single transaction**:
   - Creates payment record with UUID
   - Updates job payment status
   - Creates ledger entry (credit to customer account)
   - Updates customer outstanding balance
   - Creates audit log entry
5. Payment is recorded immediately
6. Customer balance updates instantly
7. **No internet check occurs**

### Adding an Expense

1. User selects expense category
2. Enters amount, description, payment method, and date
3. Clicks "Add Expense"
4. System performs these operations **in a single transaction**:
   - Creates expense record with UUID
   - Creates ledger entry (debit to expense account)
   - Creates audit log entry
5. Expense is recorded immediately
6. **No internet check occurs**

### Generating Reports

1. User selects report type (daily, monthly, customer ledger, etc.)
2. Chooses date range
3. Clicks "Generate Report"
4. System queries local SQLite database
5. Report is generated instantly from local data
6. All data appears in reports, including unsynced records
7. **No internet check occurs**

### Key Point

Every operation is **instant** and **local**. The system never waits for network responses or checks connectivity. Work flows smoothly regardless of internet status.

---

## 5. Power Failure Behavior

The system is designed to protect your data even if power fails unexpectedly.

### SQLite WAL Mode

The database uses **Write-Ahead Logging (WAL)** mode, which provides crash safety:

- Changes are written to a log file first
- The main database file is updated later
- If power fails, the log can be replayed to recover
- This ensures data integrity even during unexpected shutdowns

### Transaction Safety (ACID Guarantees)

All financial operations use database transactions:

- **Atomicity**: Either all changes succeed or all fail (no partial updates)
- **Consistency**: Database always remains in a valid state
- **Isolation**: Concurrent operations don't interfere with each other
- **Durability**: Once committed, changes are permanent

### What Happens During Power Loss

**Scenario 1: Power fails during a transaction**

- The transaction is not yet committed
- On restart, SQLite automatically rolls back the incomplete transaction
- No partial data is saved
- Database remains in a consistent state
- User can retry the operation

**Scenario 2: Power fails after transaction commits**

- The transaction was successfully written to the WAL log
- On restart, SQLite replays the WAL log
- All committed changes are recovered
- No data loss occurs

**Scenario 3: Power fails during database write**

- WAL mode ensures writes are atomic
- Either the entire write succeeds or it doesn't happen
- No corrupted data can be created
- Database integrity is maintained

### On App Restart

1. Database file is checked for integrity
2. WAL log is replayed if needed
3. All committed transactions are recovered
4. System continues normally with all data intact
5. No manual recovery needed

### Data Safety Guarantee

**Your data is safe**. The combination of WAL mode and transaction safety means that:

- Completed operations are never lost
- Incomplete operations never corrupt data
- Power failures do not cause data loss
- System always recovers to a consistent state

---

## 6. Reports

All reports are generated from your local database. They work identically whether you're online or offline.

### Report Generation Process

1. User requests a report (daily, monthly, customer ledger, etc.)
2. System queries the local SQLite database
3. Data is processed and formatted
4. Report is displayed or exported
5. **No server connection is made**

### Unsynced Data in Reports

Reports include **all** data in your local database, including:

- Records that haven't been synced yet (`sync_status = 'PENDING'`)
- Records that have been synced (`sync_status = 'SYNCED'`)
- Records that failed to sync (`sync_status = 'FAILED'`)

This ensures reports are always complete and reflect your actual business data.

### Available Reports

- **Daily Reports**: Jobs, payments, and expenses for a specific day
- **Monthly Reports**: Summary of revenue, expenses, and profit for a month
- **Customer Ledgers**: Complete transaction history for individual customers
- **Cash Flow Reports**: Inflows and outflows over a date range
- **Outstanding Receivables**: Customers with unpaid balances

### Report Features

- **Instant Generation**: Reports appear immediately (no waiting for server)
- **Always Available**: Works offline, online, or with intermittent connectivity
- **Complete Data**: Includes all local records regardless of sync status
- **Export Capability**: Can export to Excel or PDF for sharing
- **Date Filtering**: Filter by any date range

### Key Point

Reports are **always accurate** because they read directly from your local database, which contains your complete business data.

---

## 7. Multi-PC Setup

The system supports multiple computers working independently, with safe synchronization when internet is available.

### Device Identification

**First Run on Each PC:**

1. System generates a unique UUID (Universally Unique Identifier)
2. UUID is stored in the `app_settings` table as `device_id`
3. This UUID never changes for this computer
4. Example: `2c727b9e-7871-4802-87c0-1ced3d180c3c`

**Every Record Tagged:**

- Every customer, job, payment, expense, and ledger entry includes a `device_id` field
- This identifies which computer created the record
- Enables safe multi-PC synchronization

### Independent Operation

Each PC operates completely independently:

- **PC 1** can create customers, jobs, and payments
- **PC 2** can create different customers, jobs, and payments
- **PC 3** can create yet another set of records
- All PCs work simultaneously without coordination
- No PC needs to know about other PCs to function

### No Direct Communication

PCs never communicate directly with each other:

- PC 1 cannot send data directly to PC 2
- PC 2 cannot query PC 1's database
- PCs only communicate through the sync server (when internet available)
- This prevents conflicts and ensures safe operation

### Multi-PC Workflow Example

**Morning (All PCs Offline):**

- PC 1: Creates 5 jobs, records 3 payments
- PC 2: Creates 3 customers, creates 2 jobs
- PC 3: Records 4 expenses, creates 1 job

**Afternoon (Internet Available):**

- All PCs sync their data to the server
- Server receives data from all three PCs
- Each PC downloads data from other PCs
- All PCs now have complete data

**Evening (PC 2 Goes Offline):**

- PC 1 and PC 3 continue working
- PC 2 works independently offline
- Next sync: PC 2's new data is shared with others

### Key Point

Multiple computers can work simultaneously without conflicts because each record has a unique UUID and device ID, preventing ID collisions.

---

## 8. Sync Behavior (When Internet Is Available)

Synchronization is optional and happens in the background when internet is available.

### Detecting Pending Data

The system identifies records that need syncing by checking the `sync_status` field:

- `sync_status = 'PENDING'`: Record needs to be synced
- `sync_status = 'SYNCED'`: Record has been synced
- `sync_status = 'FAILED'`: Sync attempt failed (will retry)

### Sync Process (Step-by-Step)

**Step 1: Query Local Database**

- System queries for all records where `sync_status = 'PENDING'`
- Groups records by table (customers, jobs, payments, expenses, etc.)
- Prepares data for transmission

**Step 2: Send to Server**

- Each record is sent to the server with:
  - Record data (all fields)
  - `device_id` (identifies which PC created it)
  - `created_at` timestamp
  - `updated_at` timestamp

**Step 3: Server Processing**

- Server receives data from PC
- Stores records in PostgreSQL database
- Tags each record with the PC's `device_id`
- Records timestamp of sync

**Step 4: Download Other PCs' Data**

- PC requests records from other devices
- Server sends records created by other PCs
- PC merges new records into local database
- New records are marked as `sync_status = 'SYNCED'`

**Step 5: Mark as Synced**

- After successful sync, local records are updated:
  - `sync_status = 'SYNCED'`
  - `updated_at` timestamp preserved

### Duplicate Prevention

UUIDs ensure no conflicts:

- Each record has a globally unique UUID
- Even if two PCs create records simultaneously, UUIDs won't collide
- Server can safely store records from multiple PCs
- No ID conflicts possible

### Conflict Resolution (MVP Strategy)

When the same record exists on multiple PCs with different data:

- **Rule**: Last `updated_at` timestamp wins
- If PC 1 updated a customer at 10:00 AM
- And PC 2 updated the same customer at 2:00 PM
- PC 2's version is kept (newer timestamp)
- This is a simple, safe strategy for MVP

### Sync Frequency

- Sync can happen:
  - Manually (user clicks "Sync Now")
  - Automatically (when internet detected, configurable interval)
  - On app startup (if internet available)
- Sync does not interrupt work
- Sync happens in the background

### Failed Sync Handling

If sync fails:

- Record remains `sync_status = 'PENDING'`
- System will retry on next sync attempt
- Work continues normally
- No data is lost

### Key Point

Sync is **non-blocking**. Work continues normally whether sync succeeds, fails, or hasn't happened yet.

---

## 9. Conflict Prevention Strategy

The system is designed to prevent conflicts before they occur, rather than resolving them after.

### Append-Only Ledgers

Ledger entries are **immutable**:

- Once created, a ledger entry cannot be modified
- Database triggers prevent UPDATE operations
- Database triggers prevent DELETE operations
- To correct an error, create an adjustment entry instead

**Why This Matters:**

- Financial history is preserved exactly as it happened
- Audit trail is complete and unalterable
- No conflicts from editing historical transactions
- Corrections are visible as separate entries

### No Deletions

Records are never truly deleted:

- Instead, use status flags (e.g., `is_active = 0`)
- Or create cancellation/adjustment records
- Historical data remains for audit purposes
- Prevents sync conflicts from deletions

### Adjustments Instead of Edits

When data needs correction:

**Wrong Approach (Not Used):**

- Edit the original record
- This can cause sync conflicts

**Correct Approach (Used):**

- Create a new adjustment record
- Original record remains unchanged
- Adjustment clearly shows what changed
- No conflicts possible

**Example:**

- Job created with amount $1000
- Later discovered should be $1200
- Instead of editing: Create adjustment entry for +$200
- Both original and adjustment are preserved

### UUID-Based IDs

All records use UUIDs instead of auto-increment IDs:

- **UUID**: `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (globally unique)
- **Auto-increment**: `1, 2, 3, 4...` (can conflict across PCs)

**Why UUIDs:**

- No ID collisions between PCs
- Can create records offline without coordination
- Safe for distributed systems
- No need for server to assign IDs

### MVP Conflict Rule: Last Update Wins

For records that can be updated (customers, jobs, etc.):

- When same record exists on multiple PCs with different data
- Compare `updated_at` timestamps
- Keep the record with the latest timestamp
- Simple, predictable, safe for MVP

**Future Enhancement:**

- More sophisticated conflict resolution
- User prompts for conflicts
- Merge strategies
- For now, timestamp-based resolution is sufficient

### Key Point

The system prevents most conflicts through design (immutable ledgers, UUIDs, no deletions) and handles remaining conflicts simply (last update wins).

---

## 10. What the System NEVER Does

To ensure reliability and data safety, the system explicitly avoids certain practices:

### Never Blocks Work Due to Internet

- Operations never wait for network responses
- No "checking connection..." delays
- No "please wait while syncing..." messages blocking work
- Internet connectivity is never checked before allowing operations

### Never Edits Ledger History

- Ledger entries cannot be modified (enforced by database triggers)
- Ledger entries cannot be deleted (enforced by database triggers)
- Financial history is permanent and unalterable
- Corrections create new entries, never modify old ones

### Never Uses Auto-Increment IDs

- All records use UUIDs (Universally Unique Identifiers)
- No sequential numbering that could conflict
- No dependency on server for ID assignment
- Safe for offline operation and multi-PC setups

### Never Allows PC-to-PC Direct Communication

- PCs never connect directly to each other
- All communication goes through the sync server
- Prevents network conflicts and security issues
- Ensures controlled, safe data exchange

### Never Requires Internet for Daily Operations

- All features work completely offline
- No "online only" functionality
- No degraded mode when offline
- Full functionality regardless of connectivity

### Never Loses Data Due to Power Failure

- WAL mode protects against corruption
- Transactions ensure atomicity
- Incomplete operations roll back safely
- Completed operations are never lost

### Never Modifies Data Without User Action

- No automatic data changes
- No background modifications
- All changes are explicit user actions
- Audit trail records every change

### Never Shares Data Without Explicit Sync

- Data stays local until user initiates sync
- No automatic cloud uploads
- User controls when data is synchronized
- Privacy and control maintained

---

## 11. Tech Stack Summary

### Frontend: Electron + React

- **Electron**: Desktop application framework (runs on Windows, Mac, Linux)
- **React**: User interface library (modern, responsive UI)
- **TypeScript**: Type-safe JavaScript (prevents errors)
- **Result**: Cross-platform desktop app with modern web UI

### Local Database: SQLite with WAL Mode

- **SQLite**: Embedded database (no separate server needed)
- **WAL Mode**: Write-Ahead Logging (crash-safe)
- **Location**:
  - Development: `./data/cleanflow.db`
  - Production: `app.getPath('userData')/cleanflow.db`
- **Result**: Fast, reliable, local data storage

### Communication: IPC (Inter-Process Communication)

- **IPC**: Secure bridge between React UI and Electron main process
- **Context Bridge**: Exposes safe API to React (no direct Node.js access)
- **Preload Script**: Secure communication layer
- **Result**: React UI can request data operations safely

### Server: Node.js + PostgreSQL (Future Implementation)

- **Node.js**: Server runtime
- **PostgreSQL**: Central database for synchronization
- **Purpose**: Sync meeting point only (not required for operation)
- **Status**: Architecture prepared, implementation pending

### Data Format

- **IPC Communication**: JSON (JavaScript Object Notation)
- **Database Storage**: SQL (Structured Query Language)
- **Record IDs**: UUID v4 (Universally Unique Identifier)

### ID System: UUID v4

- **Format**: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- **Uniqueness**: Globally unique (no collisions)
- **Generation**: Created locally on each PC
- **Usage**: All records (customers, jobs, payments, expenses, ledger entries)

### Key Technologies

- **better-sqlite3**: Fast, synchronous SQLite driver for Node.js
- **uuid**: UUID generation library
- **Transaction Wrapper**: Custom `withTransaction()` function for ACID safety
- **Database Triggers**: Enforce ledger immutability

---

## 12. Server Database Schema

### PostgreSQL Schema Design

The server uses PostgreSQL to store synchronized data from all PCs. The schema is designed for safe multi-PC synchronization with idempotent operations.

### Key Design Principles

1. **Composite Primary Keys**: All tables use `(id, device_id)` as the primary key

   - Allows the same UUID from different devices
   - Prevents conflicts while maintaining UUID benefits
   - Example: PC1 creates customer with UUID `abc-123`, PC2 can also create a customer with UUID `abc-123` - both are stored separately

2. **Idempotent Sync Functions**: Server provides sync functions that safely handle duplicate submissions

   - Uses `ON CONFLICT (id, device_id) DO UPDATE` for most tables
   - Uses `ON CONFLICT DO NOTHING` for immutable tables (ledger, audit logs)
   - Last update wins: Conflict resolution based on `updated_at` timestamp

3. **Immutable Ledgers**: Server enforces ledger immutability with triggers

   - Prevents UPDATE operations on `ledger_entries`
   - Prevents DELETE operations on `ledger_entries`
   - Corrections must use new adjustment entries

4. **Sync Tracking**: `sync_operations` table tracks all sync attempts
   - Records device_id, table_name, record_count
   - Tracks success/failure status
   - Enables monitoring and debugging

### Server Tables

All server tables match local SQLite schema with these differences:

- Uses PostgreSQL types (`TIMESTAMPTZ`, `DECIMAL`, `BOOLEAN`, `JSONB`)
- Composite primary keys: `PRIMARY KEY (id, device_id)`
- Additional indexes for sync queries
- Sync utility functions for idempotent inserts

### Idempotent Sync Functions

The server provides these functions for safe synchronization:

- `sync_customer()` - Idempotent customer sync
- `sync_job()` - Idempotent job sync
- `sync_payment()` - Idempotent payment sync
- `sync_expense()` - Idempotent expense sync
- `sync_ledger_entry()` - Append-only ledger sync (no updates)
- `sync_service_type()` - Idempotent service type sync
- `sync_user()` - Idempotent user sync
- `sync_audit_log()` - Append-only audit log sync

### Sync Query Functions

- `get_pending_records(device_id, table_name, limit)` - Get records pending sync for a device
- `get_other_device_records(device_id, table_name, since, limit)` - Get records from other devices

### Conflict Resolution Strategy

**Last Update Wins**: When the same record (same `id` and `device_id`) is synced multiple times:

- Server compares `updated_at` timestamps
- Record with newer `updated_at` overwrites older one
- This ensures the most recent version is always stored

**Exception - Immutable Tables**:

- Ledger entries: `ON CONFLICT DO NOTHING` - duplicates are ignored
- Audit logs: `ON CONFLICT DO NOTHING` - duplicates are ignored

### Server Schema File

The complete PostgreSQL schema is defined in `server/schema.sql`. This file includes:

- All table definitions with composite keys
- Indexes for sync performance
- Triggers for ledger immutability
- Idempotent sync functions
- Query functions for sync operations

---

## 13. One-Line Summaries

### Client-Friendly Summary

> "A POS system that works completely offline, syncs when internet is available, and never loses your data."

### Developer-Friendly Summary

> "Offline-first Electron app with local SQLite, UUID-based records, immutable ledgers, and eventual consistency sync model."

---

## Additional Technical Details

### Database Schema

All tables include these standard fields:

- `id`: UUID (primary key)
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp
- `sync_status`: 'PENDING' | 'SYNCED' | 'FAILED'
- `device_id`: UUID of the PC that created the record

### Transaction Safety

All financial operations use `withTransaction()` wrapper:

- Ensures ACID compliance
- Automatic rollback on errors
- Prevents partial updates
- Guarantees data consistency

### Audit Trail

Every data change is logged in `audit_logs` table:

- Records who made the change (user_id)
- Records what changed (old_value, new_value)
- Records when it changed (created_at)
- Records which PC made the change (device_id)

### Ledger Immutability

Database triggers enforce ledger rules:

```sql
CREATE TRIGGER prevent_ledger_update
BEFORE UPDATE ON ledger_entries
BEGIN
  SELECT RAISE(ABORT, 'Ledger entries cannot be modified.');
END
```

### Sync Status Lifecycle

1. **PENDING**: Record created locally, not yet synced
2. **SYNCED**: Record successfully synced to server
3. **FAILED**: Sync attempt failed (will retry)

---

## Conclusion

This offline-first POS system is designed for reliability, data safety, and uninterrupted operation. It works completely offline, protects data from power failures, supports multiple PCs safely, and synchronizes when internet is available - all while maintaining data integrity and providing a smooth user experience.

The architecture prioritizes local operation, uses proven technologies (SQLite, transactions, UUIDs), and implements safety mechanisms (WAL mode, immutable ledgers, audit trails) to ensure your business data is always safe and accessible.

---

_Document Version: 1.0_  
_Last Updated: December 2024_
