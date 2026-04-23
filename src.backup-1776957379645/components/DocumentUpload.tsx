// src/components/DocumentUpload.tsx
import * as Mod from "@/components/documents/DocumentUpload";

const Component = ((Mod as any).default ?? (Mod as any).DocumentUpload) as React.ComponentType<any>;
export default Component;
export * from "@/components/documents/DocumentUpload";
