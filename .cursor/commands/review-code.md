# Review Code

## Overview
Comprehensive code review checklist to ensure quality, security, and maintainability.

## Review Categories

### 1. Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logic errors
- [ ] Loading and error states work correctly

### 2. Code Quality
- [ ] Code is readable and well-structured
- [ ] Functions are small and focused (<50 lines)
- [ ] Components are reasonable size (<200 lines)
- [ ] Variable names are descriptive
- [ ] No code duplication
- [ ] Follows project conventions
- [ ] Complex logic has comments

### 3. TypeScript
- [ ] All props have interfaces
- [ ] No 'any' types (use 'unknown' if needed)
- [ ] Return types defined for functions
- [ ] Proper type inference used
- [ ] Exported types when shared

### 4. React Best Practices
- [ ] Functional components used
- [ ] Proper hook usage (no violations of rules)
- [ ] Keys provided for list items
- [ ] No inline functions in JSX (use useCallback)
- [ ] Memoization used appropriately
- [ ] Server Components used when possible (Next.js)

### 5. Next.js Specific (if applicable)
- [ ] Server Components used by default
- [ ] 'use client' only when necessary
- [ ] Metadata properly defined
- [ ] Images use next/image
- [ ] Loading and error UI provided
- [ ] Proper caching strategy

### 6. Styling
- [ ] Tailwind CSS used consistently
- [ ] Responsive design implemented
- [ ] Dark mode support (if required)
- [ ] No inline styles (use Tailwind)

### 7. Security
- [ ] No obvious security vulnerabilities
- [ ] Input validation present
- [ ] Sensitive data handled properly
- [ ] No hardcoded secrets
- [ ] XSS prevention in place

### 8. Accessibility
- [ ] Semantic HTML used
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] Proper color contrast
- [ ] Focus states visible

### 9. Performance
- [ ] No unnecessary re-renders
- [ ] Large lists virtualized (if needed)
- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Bundle size considered

### 10. Testing
- [ ] Tests written for new functionality
- [ ] Tests cover edge cases
- [ ] Tests are readable
- [ ] All tests pass

## Review Process

1. **Read the code**
   - Understand what it does
   - Check for obvious issues

2. **Run the code**
   - Test functionality manually
   - Verify edge cases

3. **Check tests**
   - Run test suite
   - Verify coverage

4. **Provide feedback**
   - Be specific and constructive
   - Suggest improvements
   - Acknowledge good patterns
