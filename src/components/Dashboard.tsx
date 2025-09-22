import React from 'react'
import { LogOut, Settings, Users, Wrench, BarChart3, Shield, Palette, TestTube, Bot, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, roleDisplayNames } from '../lib/supabase'
import AIToolsList from './AIToolsList'
import TwoFactorSettings from './TwoFactorSettings'
import AdminPanel from './AdminPanel'
import ActivityLogComponent from './ActivityLog'
import { useCache } from '../hooks/useCache'
import { useActivityLogger } from '../hooks/useActivityLogger'

const Dashboard: React.FC = () => {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = React.useState('dashboard')
  const { logActivity } = useActivityLogger()

  // Cache categories and tool counts
  const { data: stats } = useCache(
    'dashboard-stats',
    async () => {
      const [toolsResponse, categoriesResponse, usersResponse] = await Promise.all([
        supabase.from('ai_tools').select('id', { count: 'exact' }),
        supabase.from('categories').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' })
      ])
      
      return {
        tools: toolsResponse.count || 0,
        categories: categoriesResponse.count || 0,
        users: usersResponse.count || 0
      }
    },
    { ttl: 60 } // Cache for 1 minute
  )

  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const handleSignOut = async () => {
    await logActivity({
      action: 'logout',
      resourceType: 'auth'
    })
    await signOut()
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield className="w-6 h-6" />
      case 'backend':
        return <Wrench className="w-6 h-6" />
      case 'frontend':
        return <Palette className="w-6 h-6" />
      case 'pm':
        return <BarChart3 className="w-6 h-6" />
      case 'qa':
        return <TestTube className="w-6 h-6" />
      case 'designer':
        return <Palette className="w-6 h-6" />
      default:
        return <Users className="w-6 h-6" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'from-purple-500 to-purple-600'
      case 'backend':
        return 'from-green-500 to-green-600'
      case 'frontend':
        return 'from-blue-500 to-blue-600'
      case 'pm':
        return 'from-orange-500 to-orange-600'
      case 'qa':
        return 'from-red-500 to-red-600'
      case 'designer':
        return 'from-pink-500 to-pink-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Зареждане на профила...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <Bot className="w-8 h-8 text-blue-600 mr-3" />
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">AI Tools Platform</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-sm text-gray-600">
                {profile.full_name}
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Изход
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <Wrench className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <BarChart3 className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
          <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:flex sm:space-x-8`}>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors w-full text-left`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Табло
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tools'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors w-full text-left`}
            >
              <Wrench className="w-4 h-4 inline mr-2" />
              AI Инструменти
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors w-full text-left`}
            >
              <Lock className="w-4 h-4 inline mr-2" />
              Сигурност
            </button>
            {profile?.role === 'owner' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admin'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors w-full text-left`}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Администрация
              </button>
            )}
            {profile?.role === 'owner' && (
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors w-full text-left`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Активност
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <div className={`bg-gradient-to-r ${getRoleColor(profile.role)} rounded-2xl p-8 text-white`}>
                <div className="flex items-center mb-4">
                  {getRoleIcon(profile.role)}
                  <div className="ml-4">
                    <h2 className="text-3xl font-bold">
                      Добре дошъл, {profile.full_name}!
                    </h2>
                    <p className="text-lg opacity-90 mt-1">
                      Ти си с роля: {roleDisplayNames[profile.role]}
                    </p>
                  </div>
                </div>
                <div className="mt-6 text-white/80">
                  <p>Използвай платформата за да откриеш и споделиш AI инструменти с останалите екипи.</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Wrench className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">AI Инструменти</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.tools || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Активни потребители</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.users || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Категории</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.categories || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Role-specific Actions */}
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Налични функции за твоята роля
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Common actions for all users */}
                <button 
                  onClick={() => setActiveTab('tools')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="p-2 bg-blue-100 rounded-lg mr-4">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Разглеждай инструменти</p>
                    <p className="text-sm text-gray-600">Открий нови AI решения</p>
                  </div>
                </button>

                <button 
                  onClick={() => setActiveTab('tools')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="p-2 bg-green-100 rounded-lg mr-4">
                    <Settings className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Добави инструмент</p>
                    <p className="text-sm text-gray-600">Сподели ново AI решение</p>
                  </div>
                </button>

                <button 
                  onClick={() => setActiveTab('security')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="p-2 bg-red-100 rounded-lg mr-4">
                    <Lock className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Настройки за сигурност</p>
                    <p className="text-sm text-gray-600">Управлявай двуфакторната автентикация</p>
                  </div>
                </button>

                {/* Owner specific actions */}
                {profile.role === 'owner' && (
                  <>
                    <button 
                      onClick={() => setActiveTab('admin')}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="p-2 bg-purple-100 rounded-lg mr-4">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Управлявай потребители</p>
                        <p className="text-sm text-gray-600">Администрирай достъпи</p>
                      </div>
                    </button>

                    <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                      <div className="p-2 bg-orange-100 rounded-lg mr-4">
                        <BarChart3 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Статистики</p>
                        <p className="text-sm text-gray-600">Прегледай употребата</p>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Последна активност</h3>
              </div>
              <div className="p-6">
                <div className="text-center text-gray-500 py-8">
                  <p>Тук ще се показва последната активност в платформата</p>
                  <p className="text-sm mt-2">Функционалността ще бъде добавена скоро</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'tools' && <AIToolsList />}

        {activeTab === 'security' && <TwoFactorSettings />}

        {activeTab === 'admin' && profile?.role === 'owner' && <AdminPanel />}

        {activeTab === 'activity' && profile?.role === 'owner' && <ActivityLogComponent />}
      </main>
    </div>
  )
}

export default Dashboard