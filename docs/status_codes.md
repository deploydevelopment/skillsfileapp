# Status Codes

Throughout the SkillsFile application, we use a consistent status code system to track the lifecycle state of various entities (companies, qualifications, users, etc.).

## Status Code Values

| Code | Status   | Description |
|------|----------|-------------|
| 0    | Live     | The entity is active and currently in use |
| 1    | Archived | The entity has been archived but is preserved for historical records |
| 2    | Deleted  | The entity has been marked for deletion |

## Usage Guidelines

- New entities should always be created with status `0` (Live)
- When an entity is no longer needed but its historical data should be preserved, use status `1` (Archived)
- Use status `2` (Deleted) only when the entity should be excluded from all operations but needs to be maintained for audit purposes
- Actual deletion from the database should be handled through separate cleanup processes

## Implementation Example

```typescript
enum EntityStatus {
  Live = 0,
  Archived = 1,
  Deleted = 2
}

interface Entity {
  status: EntityStatus;
  // ... other fields
}
```

## Database Schema

When creating database tables that need status tracking, include a `status` column:

```sql
CREATE TABLE entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status INTEGER NOT NULL DEFAULT 0,
  -- ... other columns
  CHECK (status IN (0, 1, 2))
);
```

## Filtering Examples

When querying entities, remember to consider the status:

```sql
-- Get only live entities
SELECT * FROM entities WHERE status = 0;

-- Get live and archived entities
SELECT * FROM entities WHERE status IN (0, 1);

-- Get all entities including deleted
SELECT * FROM entities;
``` 