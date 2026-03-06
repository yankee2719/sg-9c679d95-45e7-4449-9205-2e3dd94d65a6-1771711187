// src/components/DocumentList.tsx
import * as Mod from "@/components/documents/DocumentList";

const Component = ((Mod as any).default ?? (Mod as any).DocumentList) as React.ComponentType<any>;
export default Component;
export * from "@/components/documents/DocumentList";
