# Refactor Component

## Overview
Refactor an existing component to improve code quality, performance, and maintainability.

## Steps
1. **Analyze current component**
   - Identify code smells
   - Check component size (>200 lines?)
   - Look for duplicated logic
   - Review performance

2. **Extract logic**
   - Move business logic to custom hooks
   - Extract sub-components
   - Create utility functions

3. **Improve types**
   - Add missing TypeScript types
   - Remove 'any' types
   - Add JSDoc comments

4. **Optimize performance**
   - Add React.memo if needed
   - Use useMemo for expensive calculations
   - Use useCallback for function props

5. **Improve accessibility**
   - Add ARIA labels
   - Ensure keyboard navigation
   - Add semantic HTML

## Refactoring Checklist
- [ ] Component under 200 lines
- [ ] No code duplication
- [ ] Business logic in custom hooks
- [ ] All TypeScript types defined
- [ ] No 'any' types
- [ ] Performance optimized
- [ ] Accessibility improved
- [ ] Tests updated
- [ ] Functionality unchanged

## Common Refactoring Patterns

### Extract Custom Hook
```typescript
// Before
function Component() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // fetch logic
  }, []);
  
  return <div>{/* JSX */}</div>;
}

// After
function useData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // fetch logic
  }, []);
  
  return { data, loading };
}

function Component() {
  const { data, loading } = useData();
  return <div>{/* JSX */}</div>;
}
```

### Extract Sub-component
```typescript
// Before
function LargeComponent() {
  return (
    <div>
      <div className="header">{/* header JSX */}</div>
      <div className="content">{/* content JSX */}</div>
      <div className="footer">{/* footer JSX */}</div>
    </div>
  );
}

// After
function Header() { /* ... */ }
function Content() { /* ... */ }
function Footer() { /* ... */ }

function LargeComponent() {
  return (
    <div>
      <Header />
      <Content />
      <Footer />
    </div>
  );
}
```
