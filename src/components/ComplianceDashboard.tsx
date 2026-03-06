// src/components/ComplianceDashboard.tsx
import * as Mod from "@/components/documents/ComplianceDashboard";

const Component = ((Mod as any).default ?? (Mod as any).ComplianceDashboard) as React.ComponentType<any>;
export default Component;
export * from "@/components/documents/ComplianceDashboard";
