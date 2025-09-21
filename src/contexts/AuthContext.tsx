import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'
import { useCacheManager } from '../hooks/useCache'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  verifyTwoFactor: (email: string, code: string) => Promise<{ error: any }>
  resendTwoFactorCode: (email: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { clearAll } = useCacheManager()

  useEffect(() => {
    // Check if Supabase is properly configured
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    if (!supabase) return

    try {
      console.log('🔍 Fetching profile for user ID:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error)
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.log('📝 Profile not found, will be created by trigger on next login')
        }
      } else {
        console.log('✅ Profile fetched successfully:', data)
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured. Please set up your environment variables.' } }
    }

    setLoading(true)
    
    try {
      // Sign in normally
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (authError) {
        setLoading(false)
        return { error: authError }
      }
      
      // After successful login, check if user has 2FA enabled and show code
      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('two_factor_enabled')
          .eq('email', email)
          .maybeSingle()

        if (profileData?.two_factor_enabled) {
          // Generate and show 2FA code in console AFTER successful login
          const code = Math.floor(100000 + Math.random() * 900000).toString()
          console.log('='.repeat(50))
          console.log(`🔐 2FA КОД ЗА ${email}: ${code}`)
          console.log('='.repeat(50))
        }

        // Log successful login activity
        try {
          await supabase
            .from('activity_logs')
            .insert([{
              user_id: authData.user.id,
              action: 'login',
              resource_type: 'auth',
              details: {
                email: email,
                login_time: new Date().toISOString(),
                has_2fa: profileData?.two_factor_enabled || false,
                user_agent: navigator.userAgent
              },
              user_agent: navigator.userAgent
            }])
        } catch (logError) {
          console.error('Failed to log login activity:', logError)
        }
      }
      
      setLoading(false)
      return { error: null }
    } catch (error) {
      console.error('Error during sign in:', error)
      setLoading(false)
      return { error: { message: 'Грешка при влизане' } }
    }
  }

  const verifyTwoFactor = async (email: string, code: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured. Please set up your environment variables.' } }
    }

    setLoading(true)
    
    // Call edge function to verify 2FA code
    const { data, error } = await supabase.functions.invoke('verify-2fa', {
      body: { email, code }
    })

    if (error || !data.success) {
      setLoading(false)
      return { error: error || { message: 'Невалиден код' } }
    }

    // Sign in with the temporary token
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: data.tempPassword
    })

    setLoading(false)
    return { error: signInError }
  }

  const resendTwoFactorCode = async (email: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured. Please set up your environment variables.' } }
    }

    const { error } = await supabase.functions.invoke('send-2fa-code', {
      body: { email }
    })

    return { error }
  }

  const signOut = async () => {
    if (!supabase) {
      return { error: null }
    }

    // Clear all cache on logout
    clearAll()
    
    try {
      // Clear local state first
      setSession(null)
      setUser(null)
      setProfile(null)
      
      // Try to sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      // If session doesn't exist, that's fine - user is already logged out
      if (error && (
        error.message?.includes('Session from session_id claim in JWT does not exist') ||
        error.message?.includes('session_not_found')
      )) {
        console.log('Session already expired, logout successful')
        return { error: null }
      }
      
      if (error) {
        console.error('Logout error:', error)
        // Even if there's an error, we've cleared local state
        return { error: null }
      }
      
      console.log('Logout successful')
      return { error: null }
    } catch (error: any) {
      console.error('Logout exception:', error)
      // Even if there's an exception, we've cleared local state
      return { error: null }
    }
  }

  const value = {
    session,
    user,
    profile,
    signIn,
    verifyTwoFactor,
    resendTwoFactorCode,
    signOut,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}