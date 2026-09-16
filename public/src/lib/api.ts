const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type AuthRole = 'customer' | 'rider' | 'warehouse' | 'admin';

type ApiOptions = RequestInit & { auth?: boolean };

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.auth !== false) {
    const token = localStorage.getItem('jb_best_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body as T;
};

export const login = (email: string, password: string) =>
  apiRequest<{ token: string; user: { role: AuthRole } }>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });

export const register = (name: string, email: string, password: string) =>
  apiRequest<{ token: string; user: { role: AuthRole } }>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ name, email, password }),
  });