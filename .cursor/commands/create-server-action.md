# Create Server Action

## Overview
Create a Next.js Server Action for handling mutations with validation and error handling.

## Steps
1. **Create server action file**
   - Place in lib/actions directory
   - Add 'use server' directive at top

2. **Add validation**
   - Define Zod schema for input validation
   - Validate all inputs before processing

3. **Implement action**
   - Perform database operation
   - Add authentication/authorization checks
   - Handle errors gracefully

4. **Revalidate data**
   - Use revalidatePath for specific pages
   - Use revalidateTag for tagged data

## Template
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

type ActionResult = 
  | { success: true; data: any }
  | { success: false; error: string };

export async function createPost(formData: FormData): Promise<ActionResult> {
  try {
    // Validate input
    const validated = schema.parse({
      title: formData.get('title'),
      content: formData.get('content'),
    });

    // Authentication check (if needed)
    // const session = await getServerSession();
    // if (!session) {
    //   return { success: false, error: 'Unauthorized' };
    // }

    // Database operation
    const post = await db.post.create({
      data: validated,
    });

    // Revalidate affected paths
    revalidatePath('/posts');

    return { success: true, data: post };
  } catch (error) {
    console.error('Server action error:', error);
    
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => e.message).join(', ') 
      };
    }
    
    return { success: false, error: 'Failed to create post' };
  }
}
```

## Checklist
- [ ] 'use server' directive added
- [ ] Zod schema defined
- [ ] Input validation implemented
- [ ] Error handling added
- [ ] Authentication check (if needed)
- [ ] Database operation performed
- [ ] revalidatePath or revalidateTag called
- [ ] TypeScript types defined
