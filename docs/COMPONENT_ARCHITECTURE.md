# Component Architecture

## Component Structure

### Directory Organization
```
components/
├── common/           # Reusable UI components
├── forms/           # Form-related components
├── layout/          # Layout components
├── screens/         # Screen-specific components
└── types/           # Component type definitions
```

### Component Categories

#### Common Components
- Basic UI elements (buttons, inputs, cards)
- Shared styling components
- Utility components
- Loading states

Example:
```typescript
// components/common/Button.tsx
interface IButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<IButtonProps> = ({
  onPress,
  label,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[variant]]}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};
```

#### Form Components
- Input fields
- Form validation
- Form submission
- Error handling

Example:
```typescript
// components/forms/SkillsFileForm.tsx
interface ISkillsFileFormProps {
  onSubmit: (timestamp: string) => void;
  initialValue?: string;
}

export const SkillsFileForm: React.FC<ISkillsFileFormProps> = ({
  onSubmit,
  initialValue
}) => {
  const [timestamp, setTimestamp] = useState(initialValue || '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!timestamp) {
      setError('Timestamp is required');
      return;
    }
    onSubmit(timestamp);
    setTimestamp('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={timestamp}
        onChangeText={setTimestamp}
        style={styles.input}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button onPress={handleSubmit} label="Submit" />
    </View>
  );
};
```

#### Layout Components
- Screen layouts
- Navigation containers
- Content wrappers
- Grid systems

Example:
```typescript
// components/layout/ScreenLayout.tsx
interface IScreenLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerRight?: React.ReactNode;
}

export const ScreenLayout: React.FC<IScreenLayoutProps> = ({
  children,
  title,
  headerRight
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {title && <Text style={styles.title}>{title}</Text>}
        {headerRight}
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
};
```

## Component Design Principles

### Single Responsibility
- Each component should have one primary purpose
- Keep components focused and maintainable
- Extract complex logic into custom hooks
- Use composition over inheritance

### Props Interface
- Define clear prop interfaces
- Use TypeScript for type safety
- Document required vs optional props
- Use default props when appropriate

Example:
```typescript
interface ICardProps {
  title: string;
  content: string;
  onPress?: () => void;
  variant?: 'default' | 'highlighted';
  children?: React.ReactNode;
}

const Card: React.FC<ICardProps> = ({
  title,
  content,
  onPress,
  variant = 'default',
  children
}) => {
  // Implementation
};
```

### State Management
- Use local state for component-specific data
- Lift state up when needed
- Use context for global state
- Implement proper state updates

Example:
```typescript
const SkillsFileList: React.FC = () => {
  const [timestamps, setTimestamps] = useState<ISkillsFile[]>([]);

  useEffect(() => {
    loadTimestamps();
  }, []);

  const loadTimestamps = async () => {
    try {
      const data = await fetchTimestamps();
      setTimestamps(data);
    } catch (error) {
      console.error('Error loading timestamps:', error);
    }
  };

  return (
    <View>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={timestamps}
          renderItem={({ item }) => <SkillsFileItem timestamp={item} />}
          keyExtractor={item => item.id.toString()}
        />
      )}
    </View>
  );
};
```

## Styling Guidelines

### Style Organization
- Use StyleSheet.create for styles
- Keep styles close to components
- Use consistent naming conventions
- Extract common styles

Example:
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
```

### Theme System
- Implement a consistent theme
- Use theme variables for colors, spacing, etc.
- Support dark/light mode
- Make components theme-aware

Example:
```typescript
// theme/index.ts
export const theme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    text: '#000000',
    error: '#FF3B30',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    body: {
      fontSize: 16,
    },
  },
};
```

## Performance Optimization

### Render Optimization
- Use React.memo for expensive components
- Implement proper key props
- Avoid unnecessary re-renders
- Use useCallback and useMemo appropriately

Example:
```typescript
const SkillsFileItem = React.memo<ISkillsFileItemProps>(({ timestamp }) => {
  return formatDate(timestamp);
});
```

### Image Optimization
- Use appropriate image formats
- Implement lazy loading
- Cache images when possible
- Handle loading states

## Testing

### Component Testing
- Test component rendering
- Test user interactions
- Test prop changes
- Test error states

Example:
```typescript
describe('SkillsFileForm', () => {
  it('should render correctly', () => {
    const { getByPlaceholderText, getByText } = render(
      <SkillsFileForm onSubmit={jest.fn()} />
    );
    
    expect(getByPlaceholderText('Enter timestamp')).toBeTruthy();
    expect(getByText('Submit')).toBeTruthy();
  });

  it('should handle submission', () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <SkillsFileForm onSubmit={onSubmit} />
    );
    
    fireEvent.changeText(getByPlaceholderText('Enter timestamp'), '2024-03-20');
    fireEvent.press(getByText('Submit'));
    
    expect(onSubmit).toHaveBeenCalledWith('2024-03-20');
  });
});
``` 