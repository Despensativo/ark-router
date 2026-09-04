# Create Component

## Overview
Create a new React component following project standards with TypeScript, Tailwind CSS, and proper accessibility.

## Steps
1. **Determine component type**
   - UI component (buttons, inputs, cards)
   - Feature component (user profiles, product cards)
   - Layout component (headers, sidebars)

2. **Generate component structure**
   - Create TypeScript interface for props
   - Use functional component with proper typing
   - Add Tailwind CSS classes
   - Include accessibility attributes (ARIA labels, roles)

3. **Add component features**
   - Loading state (if async)
   - Error state (if can fail)
   - Empty state (if displays data)
   - Variants (if multiple styles needed)

4. **Export properly**
   - Use named export
   - Place in appropriate directory (components/ui or components/features)

## Template
```typescript
interface [ComponentName]Props {
  // Define props based on requirements
  className?: string;
  children?: React.ReactNode;
}

export function [ComponentName]({ className, children, ...props }: [ComponentName]Props) {
  return (
    <div className={cn('[base-classes]', className)} {...props}>
      {children}
    </div>
  );
}
```

## Checklist
- [ ] TypeScript interface defined
- [ ] Proper naming (PascalCase)
- [ ] Tailwind CSS styling
- [ ] Accessibility attributes added
- [ ] Loading/error states (if needed)
- [ ] Named export used
- [ ] File placed in correct directory
