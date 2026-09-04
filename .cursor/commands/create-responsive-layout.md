# Create Responsive Layout

## Overview
Build mobile-first responsive layouts with Tailwind CSS that work across all device sizes.

## Mobile-First Approach
Start with mobile styles, then add breakpoints for larger screens.

### Tailwind Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Common Patterns

### Responsive Grid
```typescript
// 1 column mobile, 2 tablet, 3 desktop, 4 large desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <Card key={item.id} item={item} />
  ))}
</div>
```

### Responsive Container
```typescript
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
    Responsive Title
  </h1>
</div>
```

### Hide/Show Elements
```typescript
// Hide on mobile, show on desktop
<div className="hidden lg:block">
  Desktop sidebar
</div>

// Show on mobile, hide on desktop
<div className="block lg:hidden">
  Mobile menu button
</div>
```

### Responsive Navigation
```typescript
export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-4">
            <Link href="/" className="px-3 py-2 rounded hover:bg-gray-100">
              Home
            </Link>
            <Link href="/about" className="px-3 py-2 rounded hover:bg-gray-100">
              About
            </Link>
            <Link href="/contact" className="px-3 py-2 rounded hover:bg-gray-100">
              Contact
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded hover:bg-gray-100"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-2">
            <Link href="/" className="block px-4 py-2 hover:bg-gray-100">
              Home
            </Link>
            <Link href="/about" className="block px-4 py-2 hover:bg-gray-100">
              About
            </Link>
            <Link href="/contact" className="block px-4 py-2 hover:bg-gray-100">
              Contact
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
```

### Responsive Sidebar Layout
```typescript
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-gray-900 text-white
          transform lg:transform-none transition-transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-4">
          <h2 className="text-xl font-bold">Dashboard</h2>
        </div>
        <nav className="mt-4">
          {/* Sidebar links */}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow p-4">
          <button onClick={() => setSidebarOpen(true)}>
            <MenuIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Responsive Typography
```typescript
<div>
  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
    Main Heading
  </h1>
  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mt-4">
    Subheading
  </h2>
  <p className="text-base sm:text-lg leading-relaxed mt-2">
    Body text that scales up on larger screens
  </p>
</div>
```

### Responsive Images
```typescript
import Image from 'next/image';

<div className="relative aspect-video w-full">
  <Image
    src="/hero.jpg"
    alt="Hero"
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  />
</div>
```

### Responsive Spacing
```typescript
<div className="p-4 sm:p-6 lg:p-8">
  <div className="space-y-4 sm:space-y-6 lg:space-y-8">
    {/* Content with responsive spacing */}
  </div>
</div>
```

### Flex Direction Changes
```typescript
// Stack on mobile, row on desktop
<div className="flex flex-col lg:flex-row gap-4">
  <div className="lg:w-1/3">Sidebar</div>
  <div className="lg:w-2/3">Main content</div>
</div>
```

### Responsive Cards
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
  {products.map(product => (
    <div key={product.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="aspect-square relative mb-4">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover rounded"
        />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold">{product.name}</h3>
      <p className="text-sm sm:text-base text-gray-600 mt-2">
        {product.description}
      </p>
      <div className="flex items-center justify-between mt-4">
        <span className="text-lg sm:text-xl font-bold">${product.price}</span>
        <button className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white rounded text-sm sm:text-base">
          Add to Cart
        </button>
      </div>
    </div>
  ))}
</div>
```

## Best Practices

### Touch Targets
```typescript
// Minimum 44x44px for touch targets
<button className="p-3 min-h-[44px] min-w-[44px]">
  <Icon className="w-6 h-6" />
</button>
```

### Responsive Forms
```typescript
<form className="space-y-4 max-w-md mx-auto">
  <div>
    <label className="block text-sm sm:text-base mb-2">
      Email
    </label>
    <input
      type="email"
      className="w-full px-3 py-2 sm:px-4 sm:py-3 border rounded text-sm sm:text-base"
    />
  </div>
  <button className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded">
    Submit
  </button>
</form>
```

### Responsive Tables
```typescript
// Stack table cells on mobile
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-3 py-3 sm:px-6 text-xs sm:text-sm">Name</th>
        <th className="px-3 py-3 sm:px-6 text-xs sm:text-sm">Email</th>
        <th className="hidden md:table-cell px-6 py-3 text-sm">Phone</th>
      </tr>
    </thead>
    <tbody>
      {users.map(user => (
        <tr key={user.id}>
          <td className="px-3 py-4 sm:px-6">{user.name}</td>
          <td className="px-3 py-4 sm:px-6">{user.email}</td>
          <td className="hidden md:table-cell px-6 py-4">{user.phone}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

## Testing Checklist
- [ ] Test on mobile (320px width)
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1024px+)
- [ ] Test on large screens (1920px+)
- [ ] Touch targets ≥44px on mobile
- [ ] Text readable at all sizes
- [ ] Images don't overflow
- [ ] Navigation works on all sizes
- [ ] Forms usable on mobile
- [ ] No horizontal scroll
