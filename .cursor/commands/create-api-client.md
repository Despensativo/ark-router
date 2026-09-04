# Create API Client

## Overview
Set up a centralized API client with error handling, interceptors, and TypeScript types.

## Steps
1. **Create base client**
   - Configure base URL
   - Set default headers
   - Add request/response interceptors

2. **Add error handling**
   - Handle network errors
   - Handle HTTP errors
   - Format error messages

3. **Create typed methods**
   - GET, POST, PUT, DELETE methods
   - TypeScript generics for responses
   - Request/response type safety

4. **Add utilities**
   - Authentication token handling
   - Request cancellation
   - Retry logic

## Template

### Basic API Client
```typescript
// lib/api-client.ts
class APIClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new APIError(
          error.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return {} as T;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error', 0);
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  setAuthToken(token: string) {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  clearAuthToken() {
    const { Authorization, ...rest } = this.defaultHeaders;
    this.defaultHeaders = rest;
  }
}

class APIError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'APIError';
  }
}

export const apiClient = new APIClient(process.env.NEXT_PUBLIC_API_URL || '/api');
```

### With Axios
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        if (error.response) {
          // Server responded with error
          const message = (error.response.data as any)?.message || error.message;
          throw new APIError(message, error.response.status);
        } else if (error.request) {
          // Request made but no response
          throw new APIError('No response from server', 0);
        } else {
          // Error in request setup
          throw new APIError(error.message, 0);
        }
      }
    );
  }

  async get<T>(url: string, config?: any): Promise<T> {
    return this.client.get(url, config);
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.client.post(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.client.put(url, data, config);
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    return this.client.delete(url, config);
  }
}

export const apiClient = new APIClient();
```

### Type-Safe API Methods
```typescript
// lib/api/users.ts
import { apiClient } from './api-client';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
}

export const userAPI = {
  getAll: () => apiClient.get<User[]>('/users'),
  
  getById: (id: string) => apiClient.get<User>(`/users/${id}`),
  
  create: (data: CreateUserDTO) => apiClient.post<User>('/users', data),
  
  update: (id: string, data: Partial<User>) =>
    apiClient.put<User>(`/users/${id}`, data),
  
  delete: (id: string) => apiClient.delete<void>(`/users/${id}`),
  
  search: (query: string) =>
    apiClient.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`),
};
```

### With React Query
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from './api/users';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: userAPI.getAll,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => userAPI.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      userAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
    },
  });
}
```

### Request Cancellation
```typescript
class APIClient {
  private abortControllers: Map<string, AbortController> = new Map();

  async get<T>(endpoint: string, requestId?: string): Promise<T> {
    // Cancel previous request with same ID
    if (requestId) {
      this.abortControllers.get(requestId)?.abort();
      const controller = new AbortController();
      this.abortControllers.set(requestId, controller);
      
      return this.request<T>(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
    }
    
    return this.request<T>(endpoint, { method: 'GET' });
  }

  cancelRequest(requestId: string) {
    this.abortControllers.get(requestId)?.abort();
    this.abortControllers.delete(requestId);
  }
}

// Usage
apiClient.get('/search', 'search-request');
// If another search is triggered:
apiClient.get('/search?q=new', 'search-request'); // Cancels previous
```

### Retry Logic
```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
}

// Usage
const data = await fetchWithRetry(() => apiClient.get<User[]>('/users'));
```

## Checklist
- [ ] Base client configured
- [ ] Request/response interceptors added
- [ ] Error handling implemented
- [ ] TypeScript types defined
- [ ] Authentication token handling
- [ ] Request cancellation support
- [ ] Retry logic for failed requests
- [ ] Typed API methods created
- [ ] Integrated with React Query/SWR
