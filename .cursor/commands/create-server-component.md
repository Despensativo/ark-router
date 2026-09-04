# Create Server Component (Next.js)

## Overview
Create a Next.js Server Component that fetches data on the server with proper metadata and loading states.

## Steps
1. **Create page file**
   - Place in app directory following route structure
   - Use async function for data fetching

2. **Add metadata**
   - Use generateMetadata for dynamic metadata
   - Include title, description, OpenGraph tags

3. **Fetch data**
   - Fetch directly in component (no useEffect)
   - Add proper error handling
   - Configure caching/revalidation

4. **Add Suspense boundaries**
   - Wrap slow sections in Suspense
   - Create loading.tsx for route-level loading

## Template
```typescript
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: PageProps) {
  const data = await fetchData(params.id);
  
  return {
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      images: [{ url: data.image }],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const data = await fetchData(params.id);

  if (!data) notFound();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">{data.title}</h1>
      
      <Suspense fallback={<LoadingSkeleton />}>
        <AsyncContent id={params.id} />
      </Suspense>
    </div>
  );
}

export const revalidate = 3600; // ISR - 1 hour
```

## Checklist
- [ ] Async function used
- [ ] Metadata generated
- [ ] Data fetching implemented
- [ ] Error handling (notFound, try-catch)
- [ ] Suspense boundaries added
- [ ] Caching strategy configured
- [ ] TypeScript types defined
