// Legacy path: /api/checklists/template/[id] routes to the main template handler.
// The original file had `export { default } from "../template/[id]"` which
// imports itself causing a circular definition.
export { default } from "@/pages/api/checklists/template/index";
