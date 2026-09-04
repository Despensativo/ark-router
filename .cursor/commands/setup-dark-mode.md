# Setup Dark Mode

## Overview
Implement dark mode with Tailwind CSS, system preference detection, and user preference persistence.

## Steps
1. **Configure Tailwind**
   - Enable dark mode in config
   - Choose strategy (class or media)

2. **Create theme provider**
   - Detect system preference
   - Store user preference
   - Provide theme context

3. **Add theme toggle**
   - Create toggle component
   - Update theme on click
   - Save preference

4. **Style components**
   - Add dark: variants to Tailwind classes
   - Ensure proper contrast in both modes

## Implementation

### 1. Configure Tailwind CSS
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media' for system preference only
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Define custom colors for dark mode
      },
    },
  },
};
```

### 2. Theme Provider
```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Get saved theme or default to system
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved) {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing class
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      // Use system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      setResolvedTheme(systemTheme);
      
      // Listen for system preference changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        root.classList.remove('light', 'dark');
        root.classList.add(newTheme);
        setResolvedTheme(newTheme);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Use explicit theme
      root.classList.add(theme);
      setResolvedTheme(theme);
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### 3. Theme Toggle Component
```typescript
'use client';

import { useTheme } from './ThemeProvider';
import { MoonIcon, SunIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded ${
          theme === 'light'
            ? 'bg-white dark:bg-gray-700 shadow'
            : 'hover:bg-gray-300 dark:hover:bg-gray-700'
        }`}
        aria-label="Light mode"
      >
        <SunIcon className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded ${
          theme === 'dark'
            ? 'bg-white dark:bg-gray-700 shadow'
            : 'hover:bg-gray-300 dark:hover:bg-gray-700'
        }`}
        aria-label="Dark mode"
      >
        <MoonIcon className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded ${
          theme === 'system'
            ? 'bg-white dark:bg-gray-700 shadow'
            : 'hover:bg-gray-300 dark:hover:bg-gray-700'
        }`}
        aria-label="System theme"
      >
        <ComputerDesktopIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
```

### 4. Simple Toggle (Moon/Sun)
```typescript
'use client';

import { useTheme } from './ThemeProvider';

export function SimpleThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="w-6 h-6" />
      ) : (
        <MoonIcon className="w-6 h-6" />
      )}
    </button>
  );
}
```

### 5. Add to Layout
```typescript
// app/layout.tsx
import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 6. Styling Components
```typescript
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        Card Title
      </h2>
      <p className="text-gray-600 dark:text-gray-300">
        {children}
      </p>
    </div>
  );
}
```

## Dark Mode Color Palette

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Light mode
        background: 'rgb(255, 255, 255)',
        foreground: 'rgb(0, 0, 0)',
        
        // Dark mode (add as CSS variables)
        // --background-dark: rgb(17, 24, 39)
        // --foreground-dark: rgb(255, 255, 255)
      },
    },
  },
};
```

## Best Practices

### Contrast Requirements
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### Common Classes
```typescript
// Background
className="bg-white dark:bg-gray-900"

// Text
className="text-gray-900 dark:text-white"

// Border
className="border-gray-200 dark:border-gray-700"

// Hover
className="hover:bg-gray-100 dark:hover:bg-gray-800"

// Input
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"

// Button
className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white"
```

## Preventing Flash
```typescript
// Add this script to prevent flash on page load
// app/layout.tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        const theme = localStorage.getItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const resolvedTheme = theme === 'system' || !theme ? systemTheme : theme;
        document.documentElement.classList.add(resolvedTheme);
      })();
    `,
  }}
/>
```

## Checklist
- [ ] Tailwind dark mode configured
- [ ] ThemeProvider created
- [ ] Theme toggle component added
- [ ] All components have dark: variants
- [ ] Proper contrast in both modes
- [ ] Theme persists across sessions
- [ ] System preference detected
- [ ] No flash on page load
- [ ] Images optimized for both modes
- [ ] Tested all interactive states
