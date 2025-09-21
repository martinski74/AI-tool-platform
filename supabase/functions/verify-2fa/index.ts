import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // In a real implementation, you would:
    // 1. Verify the code against stored value in database
    // 2. Check if code hasn't expired
    // 3. Generate a temporary authentication token
    
    // For demo purposes, we'll accept any 6-digit code
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Невалиден код' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For demo purposes, accept any valid 6-digit code
    console.log(`✅ Accepting 2FA code ${code} for ${email}`)

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (userError) {
      throw userError
    }

    const user = userData.users.find(u => u.email === email)
    
    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Потребителят не е намерен' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate a temporary password for this session
    const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Update user's password temporarily
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: tempPassword }
    )

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        tempPassword: tempPassword,
        message: 'Кодът е потвърден успешно'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})