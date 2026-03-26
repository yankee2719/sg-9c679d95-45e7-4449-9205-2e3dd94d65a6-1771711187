## Error Type
Runtime SyntaxError

## Error Message
Unexpected token '<', "<!DOCTYPE "... is not valid JSON


    at JSON.parse (<anonymous>:null:null)
    at request (src/services/userAdminApi.ts:10:33)
    at async loadAssignments (src/pages/assignments/index.tsx:271:36)

## Code Frame
   8 |     const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> | undefined) } });
   9 |     const text = await response.text();
> 10 |     const payload = text ? JSON.parse(text) : null;
     |                                 ^
  11 |     if (!response.ok) throw new Error(payload?.error || payload?.message || `API error: ${response.status}`);
  12 |     return (payload?.data ?? payload) as T;
  13 | }

Next.js version: 15.5.9 (Turbopack)
