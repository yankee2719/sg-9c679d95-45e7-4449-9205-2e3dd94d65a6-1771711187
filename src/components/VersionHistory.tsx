// src/components/VersionHistory.tsx
import * as Mod from "@/components/documents/VersionHistory";

const Component = ((Mod as any).default ?? (Mod as any).VersionHistory) as React.ComponentType<any>;
export default Component;
export * from "@/components/documents/VersionHistory";
