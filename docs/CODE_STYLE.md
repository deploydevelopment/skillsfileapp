# Code Style Guide

## TypeScript Guidelines

### Naming Conventions
- Use PascalCase for interfaces and types
- Use camelCase for variables, functions, and methods
- Use UPPER_SNAKE_CASE for constants
- Prefix interfaces with 'I' (e.g., `ITimestampRow`)

### Type Definitions
- Always define explicit return types for functions
- Use interfaces for object shapes
- Avoid using `any` type - prefer `unknown` if type is truly unknown
- Use type assertions sparingly and only when necessary

Example:
```typescript
interface ITimestampRow {
  id: number;
  uid: string;
  timestamp: string;
}

const getLatestTimestamp = (): ITimestampRow | null => {
  // Implementation
};
```

## React Native Guidelines

### Component Structure
- Use functional components with hooks
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks
- Use TypeScript for all component props

Example:
```typescript
interface ITimestampButtonProps {
  onPress: () => void;
  label: string;
}

const TimestampButton: React.FC<ITimestampButtonProps> = ({ onPress, label }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{label}</Text>
    </TouchableOpacity>
  );
};
```

### State Management
- Use `useState` for local component state
- Use `useEffect` for side effects
- Keep state as close as possible to where it's used
- Document complex state logic with comments

### Styling
- Use StyleSheet.create for all styles
- Keep styles close to their components
- Use consistent naming for style properties
- Extract common styles into shared constants

Example:
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
  },
});
```

## Database Guidelines

### SQLite Operations
- Use parameterized queries to prevent SQL injection
- Handle errors appropriately
- Use transactions for multiple operations
- Document complex queries

Example:
```typescript
const addTimestamp = (timestamp: string, uid: string): void => {
  try {
    db.execSync(
      'INSERT INTO timestamps (uid, timestamp) VALUES (?, ?)',
      [uid, timestamp]
    );
  } catch (error) {
    console.error('Error adding timestamp:', error);
    throw error;
  }
};
```

## Error Handling

### General Principles
- Use try-catch blocks for async operations
- Log errors appropriately
- Show user-friendly error messages
- Handle edge cases explicitly

Example:
```typescript
const loadData = async (): Promise<void> => {
  try {
    const result = await fetchData();
    setData(result);
  } catch (error) {
    console.error('Error loading data:', error);
    Alert.alert('Error', 'Failed to load data. Please try again.');
  }
};
```

## Comments and Documentation

### Code Comments
- Document complex logic
- Explain "why" not "what"
- Keep comments up to date
- Use JSDoc for function documentation

Example:
```typescript
/**
 * Loads the latest timestamp from the database
 * @returns Promise<ITimestampRow | null> The latest timestamp or null if none exists
 * @throws Error if database operation fails
 */
const loadLatestTimestamp = async (): Promise<ITimestampRow | null> => {
  // Implementation
};
```

## Testing Guidelines

### Unit Tests
- Test business logic thoroughly
- Mock external dependencies
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Example:
```typescript
describe('TimestampButton', () => {
  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<TimestampButton onPress={onPress} label="Test" />);
    
    fireEvent.press(getByText('Test'));
    
    expect(onPress).toHaveBeenCalled();
  });
});
``` 