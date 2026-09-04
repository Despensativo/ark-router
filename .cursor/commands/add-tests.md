# Add Tests

## Overview
Add comprehensive tests for React components or functions using React Testing Library and Jest.

## Steps
1. **Create test file**
   - Name: ComponentName.test.tsx
   - Co-locate with component file

2. **Write test structure**
   - Use describe blocks for organization
   - Test rendering, interactions, states
   - Test accessibility

3. **Mock dependencies**
   - Mock API calls with jest.fn()
   - Mock Next.js router
   - Mock external libraries

4. **Test user behavior**
   - Use userEvent for interactions
   - Test what users see and do
   - Avoid testing implementation details

## Template
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  describe('Rendering', () => {
    it('renders with required props', () => {
      render(<ComponentName prop="value" />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles click events', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<ComponentName onClick={handleClick} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('States', () => {
    it('displays loading state', () => {
      render(<ComponentName isLoading />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays error state', () => {
      const error = new Error('Test error');
      render(<ComponentName error={error} />);
      
      expect(screen.getByRole('alert')).toHaveTextContent('Test error');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ComponentName />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });
  });
});
```

## Checklist
- [ ] Test file created
- [ ] Rendering tests added
- [ ] User interaction tests added
- [ ] State tests (loading, error, empty)
- [ ] Accessibility tests added
- [ ] Mocks configured
- [ ] All tests pass
- [ ] Coverage is adequate
