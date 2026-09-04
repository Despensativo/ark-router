# Setup Environment Variables

## Overview
Properly configure and validate environment variables for React/Next.js applications.

## Next.js Environment Variables

### Types of Variables

1. **Public (Client-side)**: Prefix with `NEXT_PUBLIC_`
   - Exposed to the browser
   - Safe for client code
   - Example: `NEXT_PUBLIC_API_URL`

2. **Server-only**: No prefix
   - Only available on server
   - Never exposed to browser
   - Example: `DATABASE_URL`, `API_SECRET`

### File Structure
```
.env.local          # Local development (gitignored)
.env.development    # Development defaults
.env.production     # Production defaults
.env.example        # Template for team (committed)
```

## Setup Steps

### 1. Create .env.example
```bash
# .env.example
# API Configuration
NEXT_PUBLIC_API_URL=
DATABASE_URL=
# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=
# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# External Services
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### 2. Create .env.local
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
NEXTAUTH_SECRET=your-secret-key-min-32-characters
NEXTAUTH_URL=http://localhost:3000
```

### 3. Add to .gitignore
```bash
# .gitignore
.env*.local
.env.production
```

## Type-Safe Environment Variables

### Using Zod
```typescript
// lib/env.ts
import { z } from 'zod';

// Define schema
const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']),
  
  // Public
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  
  // Server-only
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  
  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // External Services
  STRIPE_SECRET_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

// Parse and export
export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
});

// Type inference
export type Env = z.infer<typeof envSchema>;
```

### Using T3 Env
```typescript
// env.mjs
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

## Usage

### In Server Components
```typescript
import { env } from '@/lib/env';

export default async function Page() {
  // ✅ Server-side - can use any env variable
  const data = await fetch(env.NEXT_PUBLIC_API_URL, {
    headers: {
      Authorization: `Bearer ${env.API_SECRET}`,
    },
  });

  return <div>...</div>;
}
```

### In Client Components
```typescript
'use client';

import { env } from '@/lib/env';

export function Component() {
  // ✅ Only NEXT_PUBLIC_ variables available
  const apiUrl = env.NEXT_PUBLIC_API_URL;
  
  // ❌ This would cause error (server-only variable)
  // const secret = env.API_SECRET;

  return <div>API: {apiUrl}</div>;
}
```

### In API Routes
```typescript
import { env } from '@/lib/env';

export async function GET() {
  // ✅ All variables available
  const db = await connectDB(env.DATABASE_URL);
  const data = await db.query();

  return Response.json(data);
}
```

## Validation Script

```typescript
// scripts/validate-env.ts
import { env } from '@/lib/env';

try {
  console.log('✅ Environment variables are valid');
  console.log('Environment:', env.NODE_ENV);
} catch (error) {
  console.error('❌ Invalid environment variables:');
  console.error(error);
  process.exit(1);
}
```

### Add to package.json
```json
{
  "scripts": {
    "validate:env": "tsx scripts/validate-env.ts",
    "build": "npm run validate:env && next build"
  }
}
```

## Best Practices

### Don't Hardcode Secrets
```typescript
// ❌ Bad
const API_KEY = 'sk_live_abc123';

// ✅ Good
const API_KEY = env.STRIPE_SECRET_KEY;
```

### Use Descriptive Names
```typescript
// ❌ Bad
NEXT_PUBLIC_KEY=abc123
SECRET=xyz789

// ✅ Good
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Document Each Variable
```bash
# .env.example
# Database connection string
# Example: postgresql://user:password@localhost:5432/db
DATABASE_URL=

# NextAuth secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=

# Application URL (no trailing slash)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Different Values Per Environment
```bash
# .env.development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
DATABASE_URL=postgresql://localhost:5432/dev_db

# .env.production
NEXT_PUBLIC_API_URL=https://api.example.com
DATABASE_URL=postgresql://prod-host:5432/prod_db
```

## Deployment

### Vercel
1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select environment (Production, Preview, Development)
4. Deploy

### Docker
```dockerfile
# Dockerfile
FROM node:18-alpine

# Build-time variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Runtime variables (passed when container runs)
ENV DATABASE_URL=$DATABASE_URL

RUN npm run build
CMD ["npm", "start"]
```

```bash
# docker-compose.yml
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
```

## Checklist
- [ ] .env.example created and committed
- [ ] .env.local added to .gitignore
- [ ] All variables validated with Zod/T3
- [ ] Public variables prefixed with NEXT_PUBLIC_
- [ ] Secrets not in git
- [ ] Environment-specific configs created
- [ ] Validation script added to build
- [ ] Documentation for each variable
- [ ] Production variables configured
- [ ] Team knows how to set up locally
