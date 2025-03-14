# Timestamp App Architecture

## Core Principles

### 1. Clean Architecture
- **Separation of Concerns**: Each component and module should have a single responsibility
- **Dependency Rule**: Dependencies should point inward, with core business logic at the center
- **Layers**:
  - **Presentation**: UI components and screens
  - **Domain**: Business logic and use cases
  - **Data**: Data sources and repositories

### 2. Type Safety
- Use TypeScript for all new code
- Define clear interfaces for all data structures
- Avoid using `any` type unless absolutely necessary
- Example:
```typescript
interface Timestamp {
  id: number;
  uid: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
```

### 3. State Management
- **Local State**: Use React hooks for component-level state
- **Global State**: Use Context API for app-wide state
- **Persistence**: SQLite for local storage
- Example:
```typescript
interface AppState {
  timestamps: Timestamp[];
  isLoading: boolean;
  error: Error | null;
}
```

### 4. Error Handling
- Implement consistent error handling across the app
- Use typed error classes
- Provide user-friendly error messages
- Example:
```typescript
class DatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

### 5. Testing Strategy
- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user flows
- Example:
```typescript
describe('TimestampService', () => {
  it('should create timestamp with correct format', () => {
    const timestamp = createTimestamp();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
  });
});
```

## Project Structure

```
SkillsFileAppExpo/
├── app/                    # Expo Router app directory
│   └── (tabs)/            # Tab navigation screens
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── services/             # Business logic and services
├── utils/                # Utility functions
├── types/                # TypeScript type definitions
├── constants/            # App constants and configuration
└── docs/                 # Documentation
```

## Database Architecture

### 1. Record Requirements
Every record in any table must include the following base fields:
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `uid`: TEXT NOT NULL (unique identifier)
- `created`: DATETIME NOT NULL (creation timestamp)
- `creator`: TEXT NOT NULL (uid of creating user)
- `updated`: DATETIME NOT NULL (last update timestamp)
- `updator`: TEXT NOT NULL (uid of last updating user)

### 2. Schema Design
- Use SQLite for local storage
- Implement migrations for schema changes
- Example:
```sql
-- Base table structure for all tables
CREATE TABLE timestamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  created DATETIME NOT NULL,
  creator TEXT NOT NULL,
  updated DATETIME NOT NULL,
  updator TEXT NOT NULL,
  -- Additional table-specific fields
  timestamp TEXT NOT NULL
);

-- User table for tracking system users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  created DATETIME NOT NULL,
  creator TEXT NOT NULL,
  updated DATETIME NOT NULL,
  updator TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE
);
```

### 3. Data Access
- Use repository pattern for data access
- Implement data validation
- Example:
```typescript
interface TimestampRepository {
  create(timestamp: Omit<Timestamp, 'id'>): Promise<Timestamp>;
  findAll(): Promise<Timestamp[]>;
  deleteAll(): Promise<void>;
}
```

## UI/UX Guidelines

### 1. Component Design
- Use functional components with hooks
- Implement proper prop types
- Follow atomic design principles
- Example:
```typescript
interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}
```

### 2. Styling
- Use StyleSheet.create for styles
- Implement a theme system
- Follow consistent naming conventions
- Example:
```typescript
const theme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    error: '#FF3B30',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
  },
};
```

## Performance Guidelines

### 1. Optimization
- Implement proper memoization
- Use lazy loading for heavy components
- Optimize database queries
- Example:
```typescript
const MemoizedComponent = React.memo(({ data }) => {
  // Component logic
});
```

### 2. Monitoring
- Track performance metrics
- Implement error tracking
- Monitor database performance
- Example:
```typescript
const trackPerformance = (metric: string, value: number) => {
  // Implementation
};
```

## Security Guidelines

### 1. Data Protection
- Sanitize user inputs
- Implement proper data validation
- Use secure storage for sensitive data
- Example:
```typescript
const sanitizeInput = (input: string): string => {
  return input.replace(/[<>]/g, '');
};
```

### 2. Error Handling
- Don't expose sensitive information in errors
- Implement proper logging
- Handle edge cases gracefully
- Example:
```typescript
try {
  // Operation
} catch (error) {
  logError(error);
  showUserFriendlyError();
}
```

## Future Considerations

### 1. Scalability
- Plan for data growth
- Implement pagination
- Consider caching strategies
- Example:
```typescript
interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### 2. Extensibility
- Design for feature additions
- Implement plugin architecture
- Consider modular design
- Example:
```typescript
interface Plugin {
  name: string;
  version: string;
  initialize: () => Promise<void>;
}
```

## Version Control

### 1. Git Workflow
- Use feature branches
- Implement semantic versioning
- Write meaningful commit messages
- Example:
```
feat: add timestamp milliseconds support
fix: resolve database connection issues
docs: update architecture documentation
```

### 2. Code Review
- Review all code changes
- Follow coding standards
- Document breaking changes
- Example:
```markdown
## Breaking Changes
- Updated timestamp format to include milliseconds
- Modified database schema to support new features
```

This architecture document will be updated as the project evolves and new requirements are identified. 