# Create Form

## Overview
Create a comprehensive form with React Hook Form, Zod validation, error handling, and loading states.

## Steps
1. **Define form schema**
   - Create Zod schema with all fields and validation rules
   - Define TypeScript types from schema

2. **Set up form**
   - Use React Hook Form with Zod resolver
   - Configure form state and submission handling

3. **Add form fields**
   - Create input components with labels
   - Wire up register() for each field
   - Display validation errors

4. **Handle submission**
   - Implement async submission handler
   - Show loading state during submission
   - Display success/error feedback

## Template
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define schema
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  terms: z.boolean().refine(val => val === true, 'You must accept terms'),
});

type FormData = z.infer<typeof formSchema>;

interface FormProps {
  onSubmit: (data: FormData) => Promise<void>;
}

export function ContactForm({ onSubmit }: FormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
      terms: false,
    },
  });

  const onSubmitHandler = async (data: FormData) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
      {/* Name field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Name
        </label>
        <input
          {...register('name')}
          id="name"
          type="text"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Email field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Message field */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2">
          Message
        </label>
        <textarea
          {...register('message')}
          id="message"
          rows={4}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
        {errors.message && (
          <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
        )}
      </div>

      {/* Terms checkbox */}
      <div className="flex items-center">
        <input
          {...register('terms')}
          id="terms"
          type="checkbox"
          className="mr-2"
          disabled={isSubmitting}
        />
        <label htmlFor="terms" className="text-sm">
          I accept the terms and conditions
        </label>
      </div>
      {errors.terms && (
        <p className="text-sm text-red-600">{errors.terms.message}</p>
      )}

      {/* Success message */}
      {isSubmitSuccessful && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg">
          Form submitted successfully!
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Checklist
- [ ] Zod schema defined with validation
- [ ] React Hook Form configured
- [ ] All fields registered
- [ ] Error messages displayed
- [ ] Loading state during submission
- [ ] Success feedback shown
- [ ] Form accessible (labels, ARIA)
- [ ] Disabled during submission
