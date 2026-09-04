# Audit Accessibility

## Overview
Comprehensive accessibility audit checklist for WCAG 2.1 AA compliance.

## Steps
1. **Semantic HTML**
   - Check proper heading hierarchy
   - Verify semantic elements used
   - Ensure landmarks are present

2. **Keyboard Navigation**
   - Test tab order
   - Verify all interactive elements accessible
   - Check focus indicators visible

3. **ARIA Attributes**
   - Add labels for screen readers
   - Implement proper roles
   - Use aria-live for dynamic content

4. **Color & Contrast**
   - Verify color contrast ratios
   - Don't rely on color alone
   - Support dark mode

## Accessibility Checklist

### Semantic HTML
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Use `<button>` for buttons (not `<div>` with onClick)
- [ ] Use `<a>` for links
- [ ] Use `<nav>`, `<main>`, `<aside>`, `<article>`
- [ ] Form inputs have associated `<label>`
- [ ] Tables use `<th>`, `<caption>`, `scope`

### Keyboard Navigation
- [ ] All interactive elements accessible via Tab
- [ ] Logical tab order
- [ ] Skip to main content link
- [ ] Focus indicators visible
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys for lists/menus
- [ ] Enter/Space activate buttons

### Screen Reader Support
- [ ] Images have alt text
- [ ] Decorative images have empty alt (`alt=""`)
- [ ] Icon buttons have aria-label
- [ ] Form inputs have labels
- [ ] Error messages associated with inputs
- [ ] Loading states announced
- [ ] Dynamic content updates announced (aria-live)

### ARIA Attributes
- [ ] aria-label for icon-only buttons
- [ ] aria-labelledby for complex labels
- [ ] aria-describedby for help text
- [ ] aria-invalid for errors
- [ ] aria-required for required fields
- [ ] aria-expanded for collapsibles
- [ ] role attributes where needed

### Color & Contrast
- [ ] Text contrast ratio ≥ 4.5:1
- [ ] Large text contrast ≥ 3:1
- [ ] UI components contrast ≥ 3:1
- [ ] Focus indicators contrast ≥ 3:1
- [ ] Don't rely on color alone
- [ ] Links distinguishable from text

### Forms
- [ ] Labels associated with inputs
- [ ] Error messages clear and specific
- [ ] Errors announced to screen readers
- [ ] Required fields indicated
- [ ] Help text available
- [ ] Validation doesn't rely on color alone

### Images & Media
- [ ] Images have descriptive alt text
- [ ] Complex images have long descriptions
- [ ] Videos have captions
- [ ] Audio has transcripts
- [ ] Auto-play disabled or controllable

### Interactive Elements
- [ ] Click targets ≥ 44x44px (mobile)
- [ ] Buttons look clickable
- [ ] Links underlined or clearly distinguished
- [ ] Focus states visible
- [ ] Disabled state clearly indicated

## Code Examples

### Semantic HTML
```typescript
// ❌ Bad
<div onClick={handleClick}>Click me</div>
<div className="heading">Title</div>

// ✅ Good
<button onClick={handleClick}>Click me</button>
<h1>Title</h1>
```

### Keyboard Navigation
```typescript
export function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Trap focus
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <h2 id="modal-title">Modal Title</h2>
      {children}
      <button onClick={onClose} aria-label="Close modal">
        ×
      </button>
    </div>
  );
}
```

### ARIA Labels
```typescript
// Icon button
<button aria-label="Delete item">
  <TrashIcon />
</button>

// Complex label
<div id="section-description">
  This section contains user settings
</div>
<section aria-labelledby="section-description">
  {/* content */}
</section>

// Error state
<input
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && (
  <p id="email-error" role="alert" className="text-red-600">
    {error}
  </p>
)}
```

### Form Accessibility
```typescript
<form>
  <div>
    <label htmlFor="email" className="block mb-2">
      Email <span aria-label="required">*</span>
    </label>
    <input
      id="email"
      type="email"
      aria-required="true"
      aria-invalid={!!errors.email}
      aria-describedby={errors.email ? 'email-error' : 'email-help'}
    />
    <p id="email-help" className="text-sm text-gray-600">
      We'll never share your email
    </p>
    {errors.email && (
      <p id="email-error" role="alert" className="text-sm text-red-600">
        {errors.email.message}
      </p>
    )}
  </div>
</form>
```

### Live Regions
```typescript
function SearchResults({ results, isLoading }: Props) {
  return (
    <>
      {isLoading && (
        <div aria-live="polite" aria-busy="true">
          Loading results...
        </div>
      )}
      
      <div aria-live="polite" aria-atomic="true">
        {results.length} results found
      </div>
      
      <ul>{/* results */}</ul>
    </>
  );
}
```

### Skip Link
```typescript
// app/layout.tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white"
>
  Skip to main content
</a>

<main id="main-content">
  {/* content */}
</main>
```

## Testing Tools

### Browser Extensions
- axe DevTools
- WAVE
- Lighthouse (Chrome DevTools)

### Automated Testing
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component is accessible', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing
- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Test with browser zoom at 200%
- [ ] Test in high contrast mode
- [ ] Test with reduced motion settings

## Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
