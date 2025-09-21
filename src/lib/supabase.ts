import { createClient } from '@supabase/supabase-js'

// Support both browser (import.meta.env) and Node.js (process.env) environments
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL

const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : process.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please click "Connect to Supabase" button to set up your project.')
}

// Only create client if we have valid environment variables
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'owner' | 'backend' | 'frontend' | 'pm' | 'qa' | 'designer'
  two_factor_enabled: boolean
  created_at: string
  updated_at: string
}

export const roleDisplayNames = {
  owner: 'Собственик',
  backend: 'Backend Developer',
  frontend: 'Frontend Developer',
  pm: 'Project Manager',
  qa: 'QA Engineer',
  designer: 'UI/UX Designer'
} as const

export interface Category {
  id: string
  name: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

export interface AITool {
  id: string
  name: string
  description: string
  category_id?: string
  website_url?: string
  documentation_url?: string
  video_url?: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  pricing_model: 'free' | 'freemium' | 'paid' | 'enterprise'
  tags: string[]
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_by?: string
  created_at: string
  updated_at: string
  average_rating?: number
  total_ratings?: number
  total_comments?: number
  category?: Category
  creator?: Profile
  approver?: Profile
  roles?: string[]
}

export interface ToolRole {
  id: string
  tool_id: string
  role: string
  created_at: string
}

export const difficultyLevels = {
  beginner: 'Начинаещ',
  intermediate: 'Средно ниво',
  advanced: 'Напреднал'
} as const

export const pricingModels = {
  free: 'Безплатен',
  freemium: 'Freemium',
  paid: 'Платен',
  enterprise: 'Enterprise'
} as const

export const toolStatuses = {
  pending: 'Чака одобрение',
  approved: 'Одобрен',
  rejected: 'Отхвърлен'
}

export interface ActivityLog {
  id: string
  user_id?: string
  action: string
  resource_type: string
  resource_id?: string
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
  user?: Profile
}

export const activityActions = {
  login: 'Влизане в системата',
  logout: 'Излизане от системата',
  create_tool: 'Създаване на инструмент',
  update_tool: 'Редактиране на инструмент',
  delete_tool: 'Изтриване на инструмент',
  approve_tool: 'Одобряване на инструмент',
  reject_tool: 'Отхвърляне на инструмент',
  enable_2fa: 'Активиране на 2FA',
  disable_2fa: 'Деактивиране на 2FA',
  create_category: 'Създаване на категория',
  update_category: 'Редактиране на категория',
  delete_category: 'Изтриване на категория'
} as const

export const resourceTypes = {
  auth: 'Автентикация',
  ai_tool: 'AI Инструмент',
  category: 'Категория',
  profile: 'Профил',
  system: 'Система'
} as const

export interface ToolRating {
  id: string
  tool_id: string
  user_id: string
  rating: number
  created_at: string
  updated_at: string
  user?: Profile
}

export interface ToolComment {
  id: string
  tool_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: Profile
}