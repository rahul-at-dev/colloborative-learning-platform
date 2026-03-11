// Shared API helper – attaches Clerk userId + userName headers to every request
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiRequest = async (path, options = {}, userMeta = {}) => {
  const { userId = '', userName = '' } = userMeta;

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-user-name': userName,
    ...(options.headers || {}),
  };

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};
