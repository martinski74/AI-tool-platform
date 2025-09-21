/*
  # AI Tools Management System

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text, optional)
      - `color` (text, for UI theming)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `ai_tools`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category_id` (uuid, foreign key)
      - `website_url` (text, optional)
      - `documentation_url` (text, optional)
      - `video_url` (text, optional)
      - `difficulty_level` (text, enum: beginner, intermediate, advanced)
      - `pricing_model` (text, enum: free, freemium, paid, enterprise)
      - `tags` (text array)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `tool_roles` (many-to-many relationship)
      - `id` (uuid, primary key)
      - `tool_id` (uuid, foreign key)
      - `role` (text, matching profile roles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Specific policies for tool management based on roles

  3. Indexes
    - Performance indexes for common queries
    - Full-text search support for tools
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Tools table
CREATE TABLE IF NOT EXISTS ai_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  website_url text,
  documentation_url text,
  video_url text,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  pricing_model text CHECK (pricing_model IN ('free', 'freemium', 'paid', 'enterprise')) DEFAULT 'free',
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tool roles junction table (many-to-many)
CREATE TABLE IF NOT EXISTS tool_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid REFERENCES ai_tools(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'backend', 'frontend', 'pm', 'qa', 'designer')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tool_id, role)
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_roles ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Anyone can read categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Owners can delete categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

-- AI Tools policies
CREATE POLICY "Anyone can read ai_tools"
  ON ai_tools
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create ai_tools"
  ON ai_tools
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator and owners can update ai_tools"
  ON ai_tools
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Creator and owners can delete ai_tools"
  ON ai_tools
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

-- Tool roles policies
CREATE POLICY "Anyone can read tool_roles"
  ON tool_roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tool creator can manage tool_roles"
  ON tool_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_tools 
      WHERE ai_tools.id = tool_roles.tool_id 
      AND ai_tools.created_by = auth.uid()
    )
  );

CREATE POLICY "Owners can manage all tool_roles"
  ON tool_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_tools_category_id ON ai_tools(category_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_created_by ON ai_tools(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_tools_created_at ON ai_tools(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_roles_tool_id ON tool_roles(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_roles_role ON tool_roles(role);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_ai_tools_search ON ai_tools USING gin(to_tsvector('english', name || ' ' || description));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_tools_updated_at
  BEFORE UPDATE ON ai_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert default categories
INSERT INTO categories (name, description, color) VALUES
  ('Генериране на текст', 'AI инструменти за създаване и редактиране на текстово съдържание', '#3B82F6'),
  ('Генериране на изображения', 'AI инструменти за създаване и обработка на изображения', '#10B981'),
  ('Анализ на данни', 'AI инструменти за анализ, визуализация и обработка на данни', '#F59E0B'),
  ('Програмиране', 'AI асистенти за разработка на софтуер и код', '#8B5CF6'),
  ('Дизайн и креативност', 'AI инструменти за дизайн, UX/UI и креативни проекти', '#EF4444'),
  ('Автоматизация', 'AI решения за автоматизация на бизнес процеси', '#06B6D4'),
  ('Чатботове и асистенти', 'AI чатботове и виртуални асистенти', '#84CC16')
ON CONFLICT (name) DO NOTHING;