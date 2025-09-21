import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type ActivityAction = 
  | 'login' 
  | 'logout' 
  | 'create_tool' 
  | 'update_tool' 
  | 'delete_tool'
  | 'approve_tool' 
  | 'reject_tool' 
  | 'enable_2fa' 
  | 'disable_2fa'
  | 'create_category' 
  | 'update_category' 
  | 'delete_category'

type ResourceType = 'auth' | 'ai_tool' | 'category' | 'profile' | 'system'

interface LogActivityParams {
  action: ActivityAction
  resourceType: ResourceType
  resourceId?: string
  details?: Record<string, any>
}

export const useActivityLogger = () => {
  const { user } = useAuth()

  const logActivity = useCallback(async ({
    action,
    resourceType,
    resourceId,
    details = {}
  }: LogActivityParams) => {
    if (!user || !supabase) return

    try {
      // Get user's IP and user agent (simplified for demo)
      const userAgent = navigator.userAgent
      
      // Ensure details is a proper object
      const activityDetails = {
        timestamp: new Date().toISOString(),
        user_id: user.id,
        ...details
      }
      
      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: user.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details: activityDetails,
          user_agent: userAgent,
        }])

      if (error) {
        console.error('Failed to log activity:', error)
        throw error
      }
      
      console.log(`✅ Activity logged: ${action} on ${resourceType}`, activityDetails)
      
    } catch (error) {
      console.error('Failed to log activity:', error)
      // Don't throw error to avoid breaking the main functionality
    }
  }, [user])

  return { logActivity }
}