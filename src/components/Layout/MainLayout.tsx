## Error Type
Build Error

## Error Message
Parsing ecmascript source code failed

## Build Output
    ./ src / components / Layout / MainLayout.tsx: 1: 7
Parsing ecmascript source code failed
    > 1 | -- ============================================================
    |       ^^^
    2 | --MIGRATION: Simplify roles to admin / supervisor / technician
3 | --NUCLEAR VERSION: drops ALL RLS policies, rebuilds everything
4 | -- ============================================================

    Expression expected

Import traces:
Browser:
    ./ src / components / Layout / MainLayout.tsx
    ./ src / pages / dashboard.tsx

SSR:
    ./ src / components / Layout / MainLayout.tsx
    ./ src / pages / dashboard.tsx

Next.js version: 15.5.9(Turbopack)