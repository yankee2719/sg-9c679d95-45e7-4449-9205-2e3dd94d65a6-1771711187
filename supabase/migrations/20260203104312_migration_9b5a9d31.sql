-- Add images column to checklist_items table
ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- Create storage bucket for checklist images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('checklist-images', 'checklist-images', true)
ON CONFLICT (id) DO NOTHING;