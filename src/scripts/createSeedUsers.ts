import { supabase } from '../lib/supabase'

const seedUsers = [
  {
    email: 'ivan@admin.local',
    password: 'password',
    full_name: 'Иван Иванов',
    role: 'owner',
    two_factor_enabled: false
  },
  {
    email: 'elena@frontend.local',
    password: 'password',
    full_name: 'Елена Петрова',
    role: 'frontend',
    two_factor_enabled: true
  },
  {
    email: 'petar@backend.local',
    password: 'password',
    full_name: 'Петър Георгиев',
    role: 'backend',
    two_factor_enabled: false
  },
  {
    email: 'maria@pm.local',
    password: 'password',
    full_name: 'Мария Стоянова',
    role: 'pm',
    two_factor_enabled: false
  },
  {
    email: 'georgi@qa.local',
    password: 'password',
    full_name: 'Георги Николов',
    role: 'qa',
    two_factor_enabled: false
  },
  {
    email: 'ana@design.local',
    password: 'password',
    full_name: 'Ана Димитрова',
    role: 'designer',
    two_factor_enabled: false
  }
]

export async function createSeedUsers() {
  if (!supabase) {
    console.error('Supabase not configured')
    return
  }

  console.log('🌱 Creating seed users...')
  
  // First, check if users already exist in auth.users but missing profiles
  console.log('🔍 Checking existing users...')
  const { data: existingUsers, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return
  }
  
  console.log('👥 Found existing users:', existingUsers.users.length)
  
  // Check which users need profiles
  for (const authUser of existingUsers.users) {
    if (authUser.email) {
      const seedUser = seedUsers.find(u => u.email === authUser.email)
      if (seedUser) {
        console.log(`🔍 Checking profile for ${authUser.email}...`)
        
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()
        
        if (profileError) {
          console.error(`❌ Error checking profile for ${authUser.email}:`, profileError)
          continue
        }
        
        if (!existingProfile) {
          console.log(`➕ Creating missing profile for ${authUser.email}`)
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email: seedUser.email,
              full_name: seedUser.full_name,
              role: seedUser.role,
              two_factor_enabled: seedUser.two_factor_enabled
            })
          
          if (createProfileError) {
            console.error(`❌ Error creating profile for ${authUser.email}:`, createProfileError)
          } else {
            console.log(`✅ Profile created for ${seedUser.full_name} (2FA: ${seedUser.two_factor_enabled})`)
          }
        } else {
          console.log(`✅ Profile already exists for ${authUser.email}`)
          
          // Update 2FA status if needed
          if (existingProfile.two_factor_enabled !== seedUser.two_factor_enabled) {
            console.log(`🔄 Updating 2FA status for ${authUser.email} to ${seedUser.two_factor_enabled}`)
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ two_factor_enabled: seedUser.two_factor_enabled })
              .eq('id', authUser.id)
            
            if (updateError) {
              console.error(`❌ Error updating 2FA for ${authUser.email}:`, updateError)
            } else {
              console.log(`✅ 2FA updated for ${authUser.email}`)
            }
          }
        }
      }
    }
  }
  
  for (const user of seedUsers) {
    try {
      console.log(`👤 Creating user: ${user.full_name} (${user.email})`)
      
      // First, try to sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.full_name,
            role: user.role
          }
        }
      })

      if (authError && !authError.message.includes('User already registered')) {
        console.error(`❌ Auth error for ${user.email}:`, authError.message)
        continue
      } else if (authError && authError.message.includes('User already registered')) {
        console.log(`ℹ️ User ${user.email} already exists, skipping auth creation`)
        continue
      }

      if (authData.user) {
        console.log(`✅ Auth user created: ${user.email}`)
        
        // Create or update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            two_factor_enabled: user.two_factor_enabled
          })

        if (profileError) {
          console.error(`❌ Profile error for ${user.email}:`, profileError.message)
        } else {
          console.log(`✅ Profile created: ${user.full_name} (2FA: ${user.two_factor_enabled})`)
        }
      }
    } catch (error) {
      console.error(`❌ Unexpected error with ${user.email}:`, error)
    }
  }
  
  console.log('🎉 Seed users creation completed!')
}
