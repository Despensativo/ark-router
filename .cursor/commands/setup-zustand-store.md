# Setup Zustand Store

## Overview
Create a Zustand store for state management with TypeScript, persist middleware, and dev tools.

## Steps
1. **Define store interface**
   - Define state shape
   - Define actions (mutations)
   - Add proper TypeScript types

2. **Create store**
   - Use Zustand create function
   - Add middleware (persist, devtools)
   - Implement actions

3. **Use in components**
   - Import and use hooks
   - Select only needed state
   - Call actions to update state

## Template

### Basic Store
```typescript
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

### Store with Persist
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
);
```

### Store with DevTools
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        addItem: (item) =>
          set((state) => ({
            items: [...state.items, item],
          })),
        removeItem: (id) =>
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
          })),
        updateQuantity: (id, quantity) =>
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity } : item
            ),
          })),
        clearCart: () => set({ items: [] }),
        total: () => {
          const { items } = get();
          return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        },
      }),
      {
        name: 'cart-storage',
      }
    )
  )
);
```

### Async Actions
```typescript
interface DataStore {
  data: Data[];
  isLoading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  createItem: (item: Partial<Data>) => Promise<void>;
}

export const useDataStore = create<DataStore>((set) => ({
  data: [],
  isLoading: false,
  error: null,
  
  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      set({ data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch data', isLoading: false });
    }
  },
  
  createItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const newItem = await response.json();
      set((state) => ({
        data: [...state.data, newItem],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to create item', isLoading: false });
    }
  },
}));
```

## Usage in Components

```typescript
// Select specific state
function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

// Or destructure (less optimal for re-renders)
function Cart() {
  const { items, addItem, removeItem, total } = useCartStore();
  
  return (
    <div>
      <p>Total: ${total()}</p>
      {items.map(item => (
        <div key={item.id}>
          {item.name}
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

## Checklist
- [ ] Store interface defined
- [ ] Actions implemented
- [ ] Persist middleware (if needed)
- [ ] DevTools middleware (for debugging)
- [ ] Async actions handle loading/error states
- [ ] TypeScript types complete
- [ ] Components use selectors efficiently
