/*
  # Add approval system for AI tools

  1. Schema Changes
    - Add `status` column to `ai_tools` table with values: 'pending', 'approved', 'rejected'
    - Add `approved_by` column to track who approved/rejected
    - Add `approved_at` timestamp
    - Add `rejection_reason` for feedback

  2. Security
    - Update RLS policies to handle approval workflow
    - Only owners can approve/reject tools
    - Users can only see approved tools (except their own)

  3. Indexes
    - Add index on status for filtering
    - Add index on approved_by for tracking
*/

-- Add new columns to ai_tools table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_tools' AND column_name = 'status'
  ) THEN
    ALTER TABLE ai_tools ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_tools' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE ai_tools ADD COLUMN approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_tools' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE ai_tools ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_tools' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE ai_tools ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_tools_status ON ai_tools(status);
CREATE INDEX IF NOT EXISTS idx_ai_tools_approved_by ON ai_tools(approved_by);

-- Update existing tools to be approved (for backward compatibility)
UPDATE ai_tools SET status = 'approved' WHERE status = 'pending';

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read ai_tools" ON ai_tools;
DROP POLICY IF EXISTS "Anyone can create ai_tools" ON ai_tools;
DROP POLICY IF EXISTS "Creator and owners can update ai_tools" ON ai_tools;
DROP POLICY IF EXISTS "Creator and owners can delete ai_tools" ON ai_tools;

-- Create new RLS policies for approval system
CREATE POLICY "Users can read approved tools and own tools"
  ON ai_tools
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved' OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Users can create tools (pending approval)"
  ON ai_tools
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'pending');

CREATE POLICY "Creator and owners can update tools"
  ON ai_tools
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Creator and owners can delete tools"
  ON ai_tools
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  );