-- Add updated_at column to checklist_executions table
ALTER TABLE checklist_executions 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create or replace the trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on checklist_executions to auto-update updated_at on every UPDATE
CREATE TRIGGER update_checklist_executions_updated_at
BEFORE UPDATE ON checklist_executions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON COLUMN checklist_executions.updated_at IS 'Timestamp of last update, automatically managed by trigger';
COMMENT ON TRIGGER update_checklist_executions_updated_at ON checklist_executions IS 'Auto-updates updated_at column on every row update';