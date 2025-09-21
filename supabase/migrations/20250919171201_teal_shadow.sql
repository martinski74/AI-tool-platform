/*
  # Activity Tracking System

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `action` (text, type of action performed)
      - `resource_type` (text, type of resource affected)
      - `resource_id` (uuid, id of affected resource)
      - `details` (jsonb, additional details about the action)
      - `ip_address` (text, user's IP address)
      - `user_agent` (text, user's browser/client info)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `activity_logs` table
    - Add policies for reading activity logs (owners can see all, users can see their own)

  3. Indexes
    - Index on user_id for fast user activity queries
    - Index on resource_type and resource_id for resource-specific queries
    - Index on created_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can read all activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Users can read their own activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add constraint for valid actions
ALTER TABLE activity_logs 
ADD CONSTRAINT activity_logs_action_check 
CHECK (action IN (
  'login', 'logout', 'create_tool', 'update_tool', 'delete_tool', 
  'approve_tool', 'reject_tool', 'enable_2fa', 'disable_2fa',
  'create_category', 'update_category', 'delete_category'
));

-- Add constraint for valid resource types
ALTER TABLE activity_logs 
ADD CONSTRAINT activity_logs_resource_type_check 
CHECK (resource_type IN (
  'auth', 'ai_tool', 'category', 'profile', 'system'
));