# State Management

## State Management Strategy

### Local State
- Use `useState` for component-specific state
- Keep state as close as possible to where it's used
- Use `useReducer` for complex state logic
- Implement proper state updates

Example:
```typescript
interface ITimestampState {
  timestamps: ITimestamp[];
  loading: boolean;
  error: string | null;
}

type TimestampAction =
  | { type: 'SET_TIMESTAMPS'; payload: ITimestamp[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const timestampReducer = (
  state: ITimestampState,
  action: TimestampAction
): ITimestampState => {
  switch (action.type) {
    case 'SET_TIMESTAMPS':
      return { ...state, timestamps: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};
```

### Global State
- Use Context API for global state
- Implement proper context providers
- Use custom hooks for context consumption
- Handle state updates efficiently

Example:
```typescript
// context/TimestampContext.tsx
interface ITimestampContext {
  timestamps: ITimestamp[];
  addTimestamp: (timestamp: string) => void;
  removeTimestamp: (id: number) => void;
}

const TimestampContext = createContext<ITimestampContext | null>(null);

export const TimestampProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [state, dispatch] = useReducer(timestampReducer, initialState);

  const addTimestamp = useCallback((timestamp: string) => {
    dispatch({ type: 'SET_TIMESTAMPS', payload: [...state.timestamps, timestamp] });
  }, [state.timestamps]);

  const removeTimestamp = useCallback((id: number) => {
    dispatch({
      type: 'SET_TIMESTAMPS',
      payload: state.timestamps.filter(t => t.id !== id)
    });
  }, [state.timestamps]);

  return (
    <TimestampContext.Provider
      value={{ timestamps: state.timestamps, addTimestamp, removeTimestamp }}
    >
      {children}
    </TimestampContext.Provider>
  );
};

export const useTimestamp = () => {
  const context = useContext(TimestampContext);
  if (!context) {
    throw new Error('useTimestamp must be used within a TimestampProvider');
  }
  return context;
};
```

## State Persistence

### Local Storage
- Use AsyncStorage for local persistence
- Implement proper error handling
- Handle data migration
- Cache data appropriately

Example:
```typescript
// hooks/usePersistentState.ts
const usePersistentState = <T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] => {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    loadPersistedState();
  }, []);

  const loadPersistedState = async () => {
    try {
      const persistedValue = await AsyncStorage.getItem(key);
      if (persistedValue) {
        setState(JSON.parse(persistedValue));
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
  };

  const updateState = async (value: T) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      setState(value);
    } catch (error) {
      console.error('Error persisting state:', error);
    }
  };

  return [state, updateState];
};
```

### Database Storage
- Use SQLite for structured data
- Implement proper data models
- Handle data synchronization
- Manage database connections

Example:
```typescript
// services/database.ts
class DatabaseService {
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabaseSync('timestamps.db');
    this.initializeSchema();
  }

  async saveTimestamp(timestamp: ITimestamp): Promise<void> {
    try {
      await this.db.execAsync(
        'INSERT INTO timestamps (uid, timestamp) VALUES (?, ?)',
        [timestamp.uid, timestamp.timestamp]
      );
    } catch (error) {
      console.error('Error saving timestamp:', error);
      throw error;
    }
  }

  async getTimestamps(): Promise<ITimestamp[]> {
    try {
      return await this.db.getAllAsync<ITimestamp>(
        'SELECT * FROM timestamps ORDER BY timestamp DESC'
      );
    } catch (error) {
      console.error('Error getting timestamps:', error);
      throw error;
    }
  }
}
```

## State Updates

### Optimistic Updates
- Implement optimistic UI updates
- Handle rollback scenarios
- Show loading states
- Manage error states

Example:
```typescript
const TimestampList: React.FC = () => {
  const [timestamps, setTimestamps] = useState<ITimestamp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTimestamp = async (timestamp: string) => {
    const optimisticTimestamp: ITimestamp = {
      id: Date.now(),
      uid: generateUniqueId(),
      timestamp
    };

    setTimestamps(prev => [optimisticTimestamp, ...prev]);
    setLoading(true);
    setError(null);

    try {
      await saveTimestamp(optimisticTimestamp);
    } catch (error) {
      setTimestamps(prev => prev.filter(t => t.id !== optimisticTimestamp.id));
      setError('Failed to save timestamp');
    } finally {
      setLoading(false);
    }
  };
};
```

### Batch Updates
- Group related state updates
- Use `useReducer` for complex updates
- Implement proper error handling
- Handle race conditions

Example:
```typescript
const batchUpdateTimestamps = async (updates: ITimestampUpdate[]) => {
  try {
    await db.transactionAsync(async (tx) => {
      for (const update of updates) {
        await tx.executeAsync(
          'UPDATE timestamps SET timestamp = ? WHERE id = ?',
          [update.timestamp, update.id]
        );
      }
    });
  } catch (error) {
    console.error('Error batch updating timestamps:', error);
    throw error;
  }
};
```

## State Synchronization

### Real-time Updates
- Implement WebSocket connections
- Handle connection states
- Manage reconnection logic
- Process real-time events

Example:
```typescript
const useWebSocket = (url: string) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
    };
  }, []);

  const connect = () => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setConnected(true);
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    ws.current.onclose = () => {
      setConnected(false);
      setTimeout(connect, 5000); // Reconnect after 5 seconds
    };
  };

  return { connected, messages };
};
```

### Offline Support
- Implement offline-first architecture
- Handle data conflicts
- Sync when online
- Manage offline queue

Example:
```typescript
class OfflineQueue {
  private queue: ITimestamp[] = [];
  private isOnline = true;

  addToQueue(timestamp: ITimestamp) {
    this.queue.push(timestamp);
    if (this.isOnline) {
      this.processQueue();
    }
  }

  async processQueue() {
    while (this.queue.length > 0) {
      const timestamp = this.queue[0];
      try {
        await saveTimestamp(timestamp);
        this.queue.shift();
      } catch (error) {
        console.error('Error processing queue:', error);
        break;
      }
    }
  }

  setOnline(online: boolean) {
    this.isOnline = online;
    if (online) {
      this.processQueue();
    }
  }
}
```

## Testing

### State Testing
- Test state updates
- Test state persistence
- Test error handling
- Test edge cases

Example:
```typescript
describe('Timestamp State Management', () => {
  it('should add timestamp to state', () => {
    const { result } = renderHook(() => useTimestamp());
    
    act(() => {
      result.current.addTimestamp('2024-03-20');
    });
    
    expect(result.current.timestamps).toHaveLength(1);
    expect(result.current.timestamps[0].timestamp).toBe('2024-03-20');
  });

  it('should persist state to storage', async () => {
    const { result } = renderHook(() => usePersistentState('timestamps', []));
    
    act(() => {
      result.current[1]([{ id: 1, timestamp: '2024-03-20' }]);
    });
    
    const persisted = await AsyncStorage.getItem('timestamps');
    expect(JSON.parse(persisted!)).toHaveLength(1);
  });
}); 