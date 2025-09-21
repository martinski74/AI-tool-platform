import 'dotenv/config'
import { supabase } from '../lib/supabase'

interface SeedUser {
  email: string
  password: string
  full_name: string
  role: 'owner' | 'backend' | 'frontend' | 'pm' | 'qa' | 'designer'
}

const seedUsers: SeedUser[] = [
  {
    email: 'ivan@admin.local',
    password: 'password',
    full_name: 'Иван Иванов',
    role: 'owner'
  },
  {
    email: 'elena@frontend.local',
    password: 'password',
    full_name: 'Елена Петрова',
    role: 'frontend'
  },
  {
    email: 'petar@backend.local',
    password: 'password',
    full_name: 'Петър Георгиев',
    role: 'backend'
  },
  {
    email: 'maria@pm.local',
    password: 'password',
    full_name: 'Мария Стоянова',
    role: 'pm'
  },
  {
    email: 'georgi@qa.local',
    password: 'password',
    full_name: 'Георги Николов',
    role: 'qa'
  },
  {
    email: 'ana@design.local',
    password: 'password',
    full_name: 'Ана Димитрова',
    role: 'designer'
  }
]

async function createSeedUsers() {
  console.log('🌱 Starting to create seed users...')
  
  for (const user of seedUsers) {
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.full_name,
            role: user.role
          }
        }
      })

      if (error) {
        console.error(`❌ Error creating user ${user.email}:`, error.message)
        continue
      }

      if (data.user) {
        console.log(`✅ Created user: ${user.full_name} (${user.email}) - ${user.role}`)
        
        // Update or insert profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role
          })

        if (profileError) {
          console.error(`❌ Error creating profile for ${user.email}:`, profileError.message)
        } else {
          console.log(`✅ Created profile for: ${user.full_name}`)
        }
      }
    } catch (error) {
      console.error(`❌ Unexpected error with user ${user.email}:`, error)
    }
  }
  
  console.log('🎉 Seed users creation completed!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSeedUsers().catch(console.error)
}

export { createSeedUsers, seedUsers }