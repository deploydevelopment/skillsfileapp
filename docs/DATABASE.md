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