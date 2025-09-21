/*
  # Add ratings and comments functionality

  1. New Tables
    - `tool_ratings`
      - `id` (uuid, primary key)
      - `tool_id` (uuid, foreign key to ai_tools)
      - `user_id` (uuid, foreign key to profiles)
      - `rating` (integer, 1-5)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `tool_comments`
      - `id` (uuid, primary key)
      - `tool_id` (uuid, foreign key to ai_tools)
      - `user_id` (uuid, foreign key to profiles)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
    - Add policies for reading all approved tool data

  3. Indexes
    - Add indexes for better query performance
    - Add unique constraint for user-tool rating pairs
*/

-- Create tool_ratings table
CREATE TABLE IF NOT EXISTS tool_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tool_id, user_id)
);

-- Create tool_comments table
CREATE TABLE IF NOT EXISTS tool_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tool_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tool_ratings
CREATE POLICY "Users can read all ratings for approved tools"
  ON tool_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_tools 
      WHERE ai_tools.id = tool_ratings.tool_id 
      AND ai_tools.status = 'approved'
    )
  );

CREATE POLICY "Users can insert their own ratings"
  ON tool_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON tool_ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON tool_ratings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for tool_comments
CREATE POLICY "Users can read all comments for approved tools"
  ON tool_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_tools 
      WHERE ai_tools.id = tool_comments.tool_id 
      AND ai_tools.status = 'approved'
    )
  );

CREATE POLICY "Users can insert their own comments"
  ON tool_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON tool_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON tool_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete any comment"
  ON tool_comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tool_ratings_tool_id ON tool_ratings(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_ratings_user_id ON tool_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_ratings_rating ON tool_ratings(rating);

CREATE INDEX IF NOT EXISTS idx_tool_comments_tool_id ON tool_comments(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_comments_user_id ON tool_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_comments_created_at ON tool_comments(created_at DESC);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tool_ratings_updated_at
  BEFORE UPDATE ON tool_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tool_comments_updated_at
  BEFORE UPDATE ON tool_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create view for tool statistics (optional, for better performance)
CREATE OR REPLACE VIEW tool_stats AS
SELECT 
  t.id,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(r.id) as total_ratings,
  COUNT(c.id) as total_comments
FROM ai_tools t
LEFT JOIN tool_ratings r ON t.id = r.tool_id
LEFT JOIN tool_comments c ON t.id = c.tool_id
WHERE t.status = 'approved'
GROUP BY t.id;