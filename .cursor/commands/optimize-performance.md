# Optimize Performance

## Overview
Analyze and optimize React component performance with memoization, code splitting, and lazy loading.

## Steps
1. **Identify performance issues**
   - Check for unnecessary re-renders
   - Find expensive calculations
   - Look for large bundle sizes
   - Identify render bottlenecks

2. **Apply React optimizations**
   - Add React.memo() for pure components
   - Use useMemo() for expensive calculations
   - Use useCallback() for function props
   - Optimize context usage

3. **Implement code splitting**
   - Use React.lazy() for route-based splitting
   - Use dynamic imports for large components
   - Split vendor bundles

4. **Optimize images and assets**
   - Use next/image (Next.js)
   - Implement lazy loading
   - Use proper image formats (WebP)

## Optimization Patterns

### 1. Memoize Components
```typescript
import { memo } from 'react';

interface ItemProps {
  item: Item;
  onSelect: (id: string) => void;
}

// Memoize to prevent re-renders when props don't change
export const ListItem = memo<ItemProps>(({ item, onSelect }) => {
  console.log('ListItem rendered:', item.id);
  
  return (
    <div onClick={() => onSelect(item.id)}>
      {item.name}
    </div>
  );
});

// Custom comparison function
export const ComplexItem = memo<ItemProps>(
  ({ item, onSelect }) => {
    return <div>{/* ... */}</div>;
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render)
    return prevProps.item.id === nextProps.item.id;
  }
);
```

### 2. Memoize Expensive Calculations
```typescript
import { useMemo } from 'react';

function DataTable({ data, filters }: Props) {
  // Expensive filtering and sorting
  const processedData = useMemo(() => {
    console.log('Processing data...');
    
    let result = data.filter(item => 
      filters.every(filter => filter.match(item))
    );
    
    result.sort((a, b) => a.name.localeCompare(b.name));
    
    return result;
  }, [data, filters]); // Only recalculate when these change

  return (
    <table>
      {processedData.map(item => (
        <tr key={item.id}>{/* ... */}</tr>
      ))}
    </table>
  );
}
```

### 3. Memoize Callbacks
```typescript
import { useCallback } from 'react';

function ParentComponent() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

  // Without useCallback, this creates a new function on every render
  // causing child components to re-render
  const handleItemClick = useCallback((id: string) => {
    console.log('Item clicked:', id);
    // Do something with item
  }, []); // Empty deps = function never changes

  const handleItemUpdate = useCallback((id: string, updates: Partial<Item>) => {
    setItems(prev => 
      prev.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  }, []); // setItems is stable, so empty deps is fine

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      
      {items.map(item => (
        <MemoizedItem 
          key={item.id}
          item={item}
          onClick={handleItemClick}
          onUpdate={handleItemUpdate}
        />
      ))}
    </div>
  );
}
```

### 4. Code Splitting with React.lazy()
```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyChart = lazy(() => import('@/components/HeavyChart'));
const ComplexTable = lazy(() => import('@/components/ComplexTable'));

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart data={chartData} />
      </Suspense>
      
      <Suspense fallback={<TableSkeleton />}>
        <ComplexTable data={tableData} />
      </Suspense>
    </div>
  );
}
```

### 5. Optimize Context
```typescript
import { createContext, useContext, useMemo } from 'react';

// Split context into separate providers
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<Theme>('light');

// Use useMemo to prevent object recreation
function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('light');

  // Memoize value object to prevent unnecessary re-renders
  const userValue = useMemo(
    () => ({ user, setUser }),
    [user]
  );

  const themeValue = useMemo(
    () => ({ theme, setTheme }),
    [theme]
  );

  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        {children}
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```

### 6. Virtualize Long Lists
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <Item item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 7. Image Optimization (Next.js)
```typescript
import Image from 'next/image';

function OptimizedImages() {
  return (
    <>
      {/* Above the fold - use priority */}
      <Image
        src="/hero.jpg"
        alt="Hero"
        width={1200}
        height={600}
        priority
        placeholder="blur"
      />

      {/* Below the fold - lazy load */}
      <Image
        src="/product.jpg"
        alt="Product"
        width={400}
        height={400}
        loading="lazy"
      />
    </>
  );
}
```

## Performance Checklist
- [ ] Identified unnecessary re-renders
- [ ] Added React.memo() to pure components
- [ ] Used useMemo() for expensive calculations
- [ ] Used useCallback() for function props
- [ ] Implemented code splitting with lazy()
- [ ] Virtualized long lists
- [ ] Optimized images (WebP, lazy loading)
- [ ] Split large bundles
- [ ] Optimized context providers
- [ ] Measured improvements with profiler

## Tools for Measuring
```typescript
// React DevTools Profiler
import { Profiler } from 'react';

<Profiler
  id="MyComponent"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} ${phase} took ${actualDuration}ms`);
  }}
>
  <MyComponent />
</Profiler>

// Use React DevTools browser extension
// - Components tab: See component tree and props
// - Profiler tab: Record and analyze renders
```
