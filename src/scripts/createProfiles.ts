import { supabase } from '../lib/supabase'

const profiles = [
  {
    email: 'ivan@admin.local',
    full_name: 'Иван Иванов',
    role: 'owner',
    two_factor_enabled: false
  },
  {
    email: 'elena@frontend.local',
    full_name: 'Елена Петрова',
    role: 'frontend',
    two_factor_enabled: true
  },
  {
    email: 'petar@backend.local',
    full_name: 'Петър Георгиев',
    role: 'backend',
    two_factor_enabled: false
  },
  {
    email: 'maria@pm.local',
    full_name: 'Мария Стоянова',
    role: 'pm',
    two_factor_enabled: false
  },
  {
    email: 'georgi@qa.local',
    full_name: 'Георги Николов',
    role: 'qa',
    two_factor_enabled: false
  },
  {
    email: 'ana@design.local',
    full_name: 'Ана Димитрова',
    role: 'designer',
    two_factor_enabled: false
  }
]

export async function createProfiles() {
  if (!supabase) {
    console.error('Supabase not configured')
    return
  }

  console.log('🔍 Checking existing users in auth.users...')
  
  // Get all users from auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError)
    return
  }
  
  console.log('👥 Found auth users:', authUsers.users.length)
  
  for (const profile of profiles) {
    console.log(`\n🔍 Processing ${profile.email}...`)
    
    // Find corresponding auth user
    const authUser = authUsers.users.find(u => u.email === profile.email)
    
    if (!authUser) {
      console.log(`❌ No auth user found for ${profile.email}`)
      continue
    }
    
    console.log(`✅ Found auth user for ${profile.email}, ID: ${authUser.id}`)
    
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()
    
    if (checkError) {
      console.error(`❌ Error checking profile for ${profile.email}:`, checkError)
      continue
    }
    
    if (existingProfile) {
      console.log(`📝 Profile exists for ${profile.email}, updating...`)
      
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          two_factor_enabled: profile.two_factor_enabled
        })
        .eq('id', authUser.id)
      
      if (updateError) {
        console.error(`❌ Error updating profile for ${profile.email}:`, updateError)
      } else {
        console.log(`✅ Profile updated for ${profile.full_name} (2FA: ${profile.two_factor_enabled})`)
      }
    } else {
      console.log(`➕ Creating new profile for ${profile.email}...`)
      
      // Create new profile
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          two_factor_enabled: profile.two_factor_enabled
        })
      
      if (createError) {
        console.error(`❌ Error creating profile for ${profile.email}:`, createError)
      } else {
        console.log(`✅ Profile created for ${profile.full_name} (2FA: ${profile.two_factor_enabled})`)
      }
    }
  }
  
  console.log('\n🎉 Profile creation/update completed!')
  
  // Verify Elena's profile
  console.log('\n🔍 Verifying Elena\'s profile...')
  const elenaAuth = authUsers.users.find(u => u.email === 'elena@frontend.local')
  if (elenaAuth) {
    const { data: elenaProfile, error: elenaError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', elenaAuth.id)
      .maybeSingle()
    
    console.log('👩 Elena\'s profile:', elenaProfile)
    console.log('🔒 Elena\'s 2FA status:', elenaProfile?.two_factor_enabled)
  }
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
  (window as any).createProfiles = createProfiles
}