# Prepare for Production

## Overview
Comprehensive checklist to prepare React/Next.js application for production deployment.

## Checklist

### Performance
- [ ] Bundle size optimized (<200KB initial)
- [ ] Code splitting implemented
- [ ] Images optimized (WebP, lazy loading)
- [ ] Fonts optimized (next/font or font-display: swap)
- [ ] Remove console.logs
- [ ] Remove source maps from production
- [ ] Enable compression (gzip/brotli)
- [ ] Implement CDN for static assets

### SEO
- [ ] Meta tags on all pages
- [ ] OpenGraph tags added
- [ ] Sitemap.xml generated
- [ ] Robots.txt configured
- [ ] Canonical URLs set
- [ ] JSON-LD structured data
- [ ] 404 page exists
- [ ] Page load time <3s

### Security
- [ ] Environment variables secured
- [ ] No sensitive data in client code
- [ ] HTTPS enforced
- [ ] Content Security Policy headers
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Input validation on all forms
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Dependencies updated (no vulnerabilities)

### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Color contrast verified
- [ ] Focus indicators visible
- [ ] Alt text on images
- [ ] ARIA labels where needed

### Error Handling
- [ ] Error boundaries implemented
- [ ] 404 page
- [ ] 500 error page
- [ ] Error logging (Sentry, etc.)
- [ ] User-friendly error messages
- [ ] Network error handling
- [ ] Fallback UI for failures

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Lighthouse score >90
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Test with slow network

### Monitoring
- [ ] Analytics configured (GA, Plausible)
- [ ] Error monitoring (Sentry)
- [ ] Performance monitoring (Vercel Analytics, New Relic)
- [ ] Uptime monitoring
- [ ] Log aggregation

### Build Configuration
- [ ] Production build successful
- [ ] Environment variables set
- [ ] Database migrations ready
- [ ] API endpoints configured
- [ ] Caching strategy implemented

## Implementation Examples

### Remove Console Logs
```typescript
// next.config.js
module.exports = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

// Or keep specific ones
module.exports = {
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
};
```

### Security Headers
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

### Content Security Policy
```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);

  return response;
}
```

### Environment Variables Validation
```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_API_URL: z.string().url(),
  DATABASE_URL: z.string(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

### Error Logging
```typescript
// lib/error-logger.ts
import * as Sentry from '@sentry/nextjs';

export function logError(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error:', error, context);
  }
}

// Usage
try {
  await riskyOperation();
} catch (error) {
  logError(error as Error, { userId, operation: 'riskyOperation' });
}
```

### Bundle Analysis
```bash
# Install
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your config
});

# Run
ANALYZE=true npm run build
```

### Lighthouse CI
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx @lhci/cli@0.12.x autorun
```

### Pre-deployment Script
```bash
#!/bin/bash
# pre-deploy.sh

echo "🔍 Running pre-deployment checks..."

# Run tests
echo "Running tests..."
npm test || exit 1

# Check types
echo "Checking TypeScript..."
npm run type-check || exit 1

# Lint
echo "Running linter..."
npm run lint || exit 1

# Build
echo "Building for production..."
npm run build || exit 1

# Check bundle size
echo "Analyzing bundle size..."
ANALYZE=true npm run build

# Security audit
echo "Running security audit..."
npm audit --production || exit 1

echo "✅ All checks passed! Ready to deploy."
```

## Deployment Checklist

### Before Deploy
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Bundle size acceptable
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup database

### Deploy
- [ ] Deploy to staging first
- [ ] Test on staging
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all features work
- [ ] Deploy to production
- [ ] Monitor closely

### After Deploy
- [ ] Verify site is up
- [ ] Check error monitoring
- [ ] Monitor performance
- [ ] Test critical user flows
- [ ] Check analytics
- [ ] Monitor server resources

## Production URLs to Check
- [ ] Homepage loads
- [ ] Authentication works
- [ ] Critical user flows work
- [ ] Forms submit correctly
- [ ] API endpoints respond
- [ ] Static assets load
- [ ] Images display
- [ ] No console errors
