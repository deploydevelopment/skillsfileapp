# Database Guidelines

## SQLite Implementation

### Database Structure
- Use SQLite for local storage
- Implement proper schema versioning
- Include indexes for frequently queried columns
- Use appropriate data types for columns

### Schema Design
- Use meaningful table and column names
- Include primary keys for all tables
- Add appropriate foreign key constraints
- Document schema changes

Example:
```sql
CREATE TABLE IF NOT EXISTS skillsfile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skillsfile_uid ON skillsfile(uid);
CREATE INDEX IF NOT EXISTS idx_skillsfile_timestamp ON skillsfile(timestamp);
```

## Database Operations

### Connection Management
- Use a single database connection per app session
- Implement proper connection error handling
- Close connections when no longer needed
- Handle connection pooling if necessary

Example:
```typescript
class DatabaseManager {
  private static instance: DatabaseManager;
  private db: SQLite.SQLiteDatabase;

  private constructor() {
    this.db = SQLite.openDatabaseSync('skillsfile.db');
    this.initializeSchema();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
}
```

### Query Guidelines
- Use parameterized queries to prevent SQL injection
- Implement proper error handling for queries
- Use transactions for multiple operations
- Optimize queries for performance

Example:
```typescript
const addTimestamp = (timestamp: string, uid: string): void => {
  try {
    this.db.execSync(
      'INSERT INTO skillsfile (uid, timestamp) VALUES (?, ?)',
      [uid, timestamp]
    );
  } catch (error) {
    console.error('Error adding timestamp:', error);
    throw error;
  }
};
```

### Data Validation
- Validate data before insertion
- Implement proper type checking
- Handle null values appropriately
- Use constraints for data integrity

Example:
```typescript
interface ISkillsFileData {
  uid: string;
  timestamp: string;
}

const validateSkillsFileData = (data: ISkillsFileData): boolean => {
  if (!data.uid || !data.timestamp) {
    return false;
  }
  return true;
};
```

## Migration Strategy

### Version Control
- Implement schema version tracking
- Create migration scripts for schema changes
- Test migrations thoroughly
- Document migration steps

Example:
```typescript
const MIGRATIONS = [
  {
    version: 1,
    up: (db: SQLite.SQLiteDatabase) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS skillsfile (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
      `);
    },
    down: (db: SQLite.SQLiteDatabase) => {
      db.execSync('DROP TABLE IF EXISTS skillsfile;');
    }
  }
];
```

### Backup and Recovery
- Implement regular database backups
- Create recovery procedures
- Test backup and recovery processes
- Document backup procedures

## Performance Optimization

### Indexing Strategy
- Create indexes for frequently queried columns
- Monitor index usage
- Remove unused indexes
- Consider composite indexes for common queries

### Query Optimization
- Use EXPLAIN to analyze queries
- Optimize JOIN operations
- Limit result sets appropriately
- Use appropriate data types

Example:
```typescript
// Optimized query with limit and index
const getLatestSkillsFile = (limit: number = 10): ISkillsFileRow[] => {
  try {
    return db.getAllSync<ISkillsFileRow>(
      'SELECT * FROM skillsfile ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  } catch (error) {
    console.error('Error getting latest skillsfile:', error);
    return [];
  }
};
```

## Error Handling

### Database Errors
- Implement proper error handling
- Log database errors appropriately
- Provide user-friendly error messages
- Handle connection errors gracefully

Example:
```typescript
const handleDatabaseError = (error: Error): void => {
  console.error('Database error:', error);
  // Implement appropriate error handling
  // e.g., retry logic, user notification
};
```

### Data Integrity
- Implement data validation
- Use database constraints
- Handle edge cases
- Maintain data consistency

## Testing

### Database Testing
- Test database operations thoroughly
- Mock database for unit tests
- Use test databases for integration tests
- Clean up test data

Example:
```typescript
describe('Database Operations', () => {
  beforeEach(() => {
    // Setup test database
    setupTestDatabase();
  });

  afterEach(() => {
    // Clean up test database
    cleanupTestDatabase();
  });

  it('should add timestamp successfully', () => {
    const timestamp = new Date().toISOString();
    const uid = generateUID();
    
    addTimestamp(timestamp, uid);
    
    const result = getTimestamp(uid);
    expect(result).toBeDefined();
    expect(result.timestamp).toBe(timestamp);
  });
}); 
```

## Database Syncing

### Syncing Status Field
All tables in the database include a `synced` column with the following specifications:
- Type: TINYINT NOT NULL
- Values: 0 (not synced) or 1 (synced)
- Default: 0

The following tables include the synced column:
- qualifications
- users
- quals_req
- qual_company_req
- companies

### Syncing Rules

1. **Records Created in App**
   - When a new record is created directly in the app:
     - `synced` is set to 0 (default)
     - Record is pending sync with Supabase

2. **Records from JSON**
   - When records are imported from JSON files:
     - `synced` is set to 1
     - These records are considered already synced

3. **Record Updates**
   - When a record is updated:
     - `synced` is set to 0
     - Record will be synced with Supabase
   - After successful Supabase sync:
     - `synced` is set to 1

4. **Supabase Callback**
   - When Supabase confirms a sync:
     - `synced` is set to 1
     - Record is considered in sync

Example table creation:
```sql
CREATE TABLE table_name (
    -- other fields...
    synced TINYINT NOT NULL DEFAULT 0
);
```

Example sync status update:
```sql
-- After successful Supabase sync
UPDATE table_name 
SET synced = 1 
WHERE id = ?;

-- After local modification
UPDATE table_name 
SET synced = 0 
WHERE id = ?;
```

### Implementation Example

```typescript
interface BaseRecord {
  id: number;
  created_at: string;
  creator: string;
  updated_at: string;
  updator: string;
  synced: number;
}

// Creating a new record
const createRecord = async (data: Partial<BaseRecord>): Promise<void> => {
  const now = new Date().toISOString();
  const userId = getCurrentUserId(); // Implementation depends on auth system
  
  await db.execAsync(`
    INSERT INTO table_name (
      created_at, creator, updated_at, updator, synced, ...other_fields
    ) VALUES (
      ?, ?, ?, ?, 0, ...other_values
    )
  `, [now, userId, now, userId, ...Object.values(data)]);
};

// Importing from API
const importFromApi = async (apiData: any): Promise<void> => {
  const now = new Date().toISOString();
  const systemId = 'SYSTEM'; // Or appropriate system identifier
  
  await db.execAsync(`
    INSERT INTO table_name (
      created_at, creator, updated_at, updator, synced, ...other_fields
    ) VALUES (
      ?, ?, ?, ?, 1, ...other_values
    )
  `, [now, systemId, now, systemId, ...Object.values(apiData)]);
};

// Updating a record
const updateRecord = async (id: number, data: Partial<BaseRecord>): Promise<void> => {
  const now = new Date().toISOString();
  const userId = getCurrentUserId();
  
  await db.execAsync(`
    UPDATE table_name 
    SET updated_at = ?, updator = ?, synced = 0, ...other_fields
    WHERE id = ?
  `, [now, userId, ...Object.values(data), id]);
};
```

### Sync Status Tracking
- Use the `synced` field to track which records need to be synced with Supabase
- Only records with `synced = 0` should be included in sync operations
- After successful sync to Supabase, update `synced` to 1
- Maintain sync status even if the app is offline
- Consider implementing a sync queue for failed sync attempts

### Best Practices
1. Always check the `synced` status before performing sync operations
2. Implement proper error handling for sync failures
3. Consider implementing a sync retry mechanism
4. Log sync operations for debugging purposes
5. Consider implementing a sync status indicator in the UI