-- Force PostgREST cache reload by making a schema change
ALTER TABLE checklists ADD COLUMN temp_reload_column TEXT;