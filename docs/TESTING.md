# Testing Guidelines

## Testing Strategy

### Unit Testing
- Test individual components and functions
- Mock external dependencies
- Use Jest and React Testing Library
- Follow AAA pattern (Arrange, Act, Assert)

Example:
```typescript
// components/__tests__/TimestampButton.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { TimestampButton } from '../TimestampButton';

describe('TimestampButton', () => {
  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TimestampButton onPress={onPress} label="Record Timestamp" />
    );

    fireEvent.press(getByText('Record Timestamp'));
    expect(onPress).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByText } = render(
      <TimestampButton
        onPress={jest.fn()}
        label="Record Timestamp"
        disabled={true}
      />
    );

    expect(getByText('Record Timestamp')).toBeDisabled();
  });
});
```

### Integration Testing
- Test component interactions
- Test navigation flows
- Test data flow
- Use React Native Testing Library

Example:
```typescript
// screens/__tests__/TimestampScreen.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TimestampScreen } from '../TimestampScreen';
import { TimestampProvider } from '../../context/TimestampContext';

describe('TimestampScreen', () => {
  it('should add new timestamp when button is pressed', async () => {
    const { getByText, getByTestId } = render(
      <TimestampProvider>
        <TimestampScreen />
      </TimestampProvider>
    );

    fireEvent.press(getByText('Record Timestamp'));

    await waitFor(() => {
      expect(getByTestId('timestamp-list')).toHaveLength(1);
    });
  });
});
```

### End-to-End Testing
- Test complete user flows
- Use Detox or Maestro
- Test on real devices
- Handle platform differences

Example:
```typescript
// e2e/timestamp.spec.ts
import { device, element, by, expect } from 'detox';

describe('Timestamp App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should record and display timestamps', async () => {
    await element(by.text('Record Timestamp')).tap();
    
    await expect(element(by.id('timestamp-list'))).toBeVisible();
    await expect(element(by.id('timestamp-item-0'))).toBeVisible();
  });
});
```

## Test Organization

### Directory Structure
```
__tests__/
├── components/     # Component tests
├── screens/        # Screen tests
├── hooks/          # Custom hook tests
├── utils/          # Utility function tests
└── e2e/           # End-to-end tests
```

### Test File Naming
- Use `.test.tsx` or `.spec.tsx` for test files
- Match test file name with source file
- Group related tests in describe blocks
- Use clear test descriptions

Example:
```typescript
// components/__tests__/TimestampList.test.tsx
describe('TimestampList', () => {
  describe('rendering', () => {
    it('should render empty state', () => {
      // Test empty state
    });

    it('should render list of timestamps', () => {
      // Test list rendering
    });
  });

  describe('interactions', () => {
    it('should handle refresh', () => {
      // Test refresh functionality
    });

    it('should handle item press', () => {
      // Test item press
    });
  });
});
```

## Mocking

### External Dependencies
- Mock database operations
- Mock network requests
- Mock navigation
- Mock device features

Example:
```typescript
// __mocks__/database.ts
jest.mock('../services/database', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    getTimestamps: jest.fn().mockResolvedValue([
      { id: 1, timestamp: '2024-03-20' }
    ]),
    saveTimestamp: jest.fn().mockResolvedValue(undefined)
  }))
}));

// __mocks__/navigation.ts
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn()
  })
}));
```

### Custom Hooks
- Mock state updates
- Mock effects
- Mock callbacks
- Test error states

Example:
```typescript
// hooks/__tests__/useTimestamp.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useTimestamp } from '../useTimestamp';

describe('useTimestamp', () => {
  it('should add timestamp', () => {
    const { result } = renderHook(() => useTimestamp());

    act(() => {
      result.current.addTimestamp('2024-03-20');
    });

    expect(result.current.timestamps).toHaveLength(1);
    expect(result.current.timestamps[0].timestamp).toBe('2024-03-20');
  });

  it('should handle errors', async () => {
    const { result } = renderHook(() => useTimestamp());

    await act(async () => {
      await result.current.addTimestamp('invalid');
    });

    expect(result.current.error).toBeTruthy();
  });
});
```

## Test Utilities

### Custom Render Functions
- Wrap components with providers
- Add common test utilities
- Handle platform differences
- Add custom matchers

Example:
```typescript
// test-utils.tsx
import { render } from '@testing-library/react-native';
import { TimestampProvider } from './context/TimestampContext';

const customRender = (ui: React.ReactElement, options = {}) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <TimestampProvider>{children}</TimestampProvider>
    ),
    ...options
  });
};

export * from '@testing-library/react-native';
export { customRender as render };
```

### Test Helpers
- Create test data
- Mock common operations
- Handle async operations
- Clean up after tests

Example:
```typescript
// test-helpers.ts
export const createTestTimestamp = (overrides = {}) => ({
  id: Date.now(),
  uid: 'test-uid',
  timestamp: new Date().toISOString(),
  ...overrides
});

export const waitForAsync = async (callback: () => void) => {
  await waitFor(callback, { timeout: 5000 });
};

export const cleanupDatabase = async () => {
  // Clean up test database
};
```

## Performance Testing

### Component Performance
- Test render performance
- Test update performance
- Test memory usage
- Use React Native Performance Monitor

Example:
```typescript
// performance/__tests__/TimestampList.performance.test.tsx
import { render } from '@testing-library/react-native';
import { TimestampList } from '../../components/TimestampList';

describe('TimestampList Performance', () => {
  it('should render efficiently with many items', () => {
    const startTime = performance.now();
    const { getByTestId } = render(
      <TimestampList items={generateManyItems(1000)} />
    );
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100);
    expect(getByTestId('timestamp-list')).toBeTruthy();
  });
});
```

### Memory Testing
- Test memory leaks
- Test garbage collection
- Monitor heap usage
- Clean up resources

Example:
```typescript
// performance/__tests__/Memory.test.tsx
import { render, unmountComponentAtNode } from 'react-native';
import { TimestampScreen } from '../../screens/TimestampScreen';

describe('Memory Management', () => {
  it('should not leak memory', () => {
    const container = document.createElement('div');
    const { unmount } = render(<TimestampScreen />, { container });

    // Perform operations
    unmount();
    unmountComponentAtNode(container);

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
  });
});
```

## Continuous Integration

### Test Automation
- Run tests on CI/CD pipeline
- Generate test reports
- Set up test coverage reporting
- Configure test environments

Example:
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

### Test Coverage
- Set minimum coverage thresholds
- Track coverage trends
- Exclude unnecessary files
- Generate coverage reports

Example:
```json
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
``` 