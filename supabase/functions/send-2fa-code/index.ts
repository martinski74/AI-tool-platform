import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    console.log('🔧 OPTIONS request received')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔐 2FA Code Request received at:', new Date().toISOString())
    console.log('📥 Request method:', req.method)
    console.log('📥 Request headers:', Object.fromEntries(req.headers.entries()))
    
    const requestBody = await req.json()
    console.log('📥 Request body:', requestBody)
    
    const { email } = requestBody
    console.log('📧 Email:', email)

    if (!email) {
      console.log('❌ No email provided')
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    console.log('🔢 Generated code:', code)
    
    // Store code in a simple in-memory store (in production, use Redis or database)
    // For demo purposes, we'll use a simple approach
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    console.log('⏰ Code expires at:', expiresAt)
    
    // In a real implementation, you would:
    // 1. Store the code in a database with expiration
    // 2. Send email using a service like SendGrid, AWS SES, etc.
    
    console.log(`🚀 2FA Code for ${email}: ${code} (expires at ${expiresAt})`)
    console.log('=' .repeat(50))
    console.log(`📱 ВАЖНО: Кодът за ${email} е: ${code}`)
    console.log('=' .repeat(50))
    
    // For demo purposes, we'll just log the code
    // In production, send actual email here
    
    const responseData = { 
      success: true, 
      message: 'Код е изпратен на вашия email',
      // For demo only - remove in production
      code: code,
      debug: {
        email,
        codeGenerated: code,
        timestamp: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      }
    }
    
    console.log('📤 Sending response:', responseData)
    console.log('✅ Returning success response')
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in send-2fa-code:', error)
    console.error('❌ Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})