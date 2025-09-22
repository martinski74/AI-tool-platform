import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, ExternalLink, BookOpen, Video, Edit, Trash2, Eye, Tag, Star, MessageSquare } from 'lucide-react'
import { supabase, AITool, Category, roleDisplayNames, difficultyLevels, pricingModels } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import AIToolForm from './AIToolForm'
import { useCache } from '../hooks/useCache'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { useCacheManager } from '../hooks/useCache'
import ToolRating from './ToolRating'
import ToolComments from './ToolComments'
import { useToaster } from '../hooks/useToaster'

const AIToolsList: React.FC = () => {
  const { user, profile } = useAuth()
  const { logActivity } = useActivityLogger()
  const { invalidatePattern } = useCacheManager()
  const { showSuccessToast, showErrorToast } = useToaster()
  const [tools, setTools] = useState<AITool[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTool, setEditingTool] = useState<AITool | undefined>()
  const [expandedTool, setExpandedTool] = useState<string | null>(null)

  // Cache categories
  const { data: categories = [] } = useCache(
    'categories',
    async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    },
    { ttl: 300 } // Cache for 5 minutes
  )

  useEffect(() => {
    fetchTools()
  }, [])

  const fetchTools = async () => {
    setLoading(true)
    
    try {
      // Get all approved tools for regular users, all tools for owners
      let query = supabase
        .from('ai_tools')
        .select(`
          *,
          category:categories(id, name, color),
          creator:profiles!ai_tools_created_by_fkey(id, full_name),
          tool_roles(role)
        `)
      
      // Filter based on user permissions
      if (profile?.role === 'owner') {
        // Owners can see all tools
        query = query.order('created_at', { ascending: false })
      } else {
        // Regular users can see approved tools and their own tools
        query = query
          .or(`status.eq.approved,created_by.eq.${user?.id}`)
          .order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        showErrorToast('Грешка при зареждане на инструментите')
        setTools([])
        return
      }

      console.log('Fetched tools:', data?.length, 'tools')
      
      // Get tools with basic data
      const toolsWithRoles = data?.map(tool => ({
        ...tool,
        roles: tool.tool_roles?.map((tr: any) => tr.role) || []
      })) || []
      
      console.log('Tools with roles:', toolsWithRoles.length)
      
      // Get statistics for each tool
      const toolsWithStats = await Promise.all(
        toolsWithRoles.map(async (tool) => {
          try {
            // Get comment count
            const { count: commentCount } = await supabase
              .from('tool_comments')
              .select('*', { count: 'exact', head: true })
              .eq('tool_id', tool.id)
            
            // Get rating statistics
            const { data: ratingData } = await supabase
              .from('tool_ratings')
              .select('rating')
              .eq('tool_id', tool.id)
            
            const ratings = ratingData || []
            const averageRating = ratings.length > 0 
              ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
              : 0
            
            return {
              ...tool,
              total_comments: commentCount || 0,
              total_ratings: ratings.length,
              average_rating: averageRating
            }
          } catch (statError) {
            console.error('Error fetching stats for tool:', tool.id, statError)
            return {
              ...tool,
              total_comments: 0,
              total_ratings: 0,
              average_rating: 0
            }
          }
        })
      )
      
      console.log('Final tools with stats:', toolsWithStats.length)
      setTools(toolsWithStats)
      
    } catch (error) {
      showErrorToast('Грешка при зареждане на инструментите')
      setTools([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (toolId: string) => {
    const tool = tools.find(t => t.id === toolId)
    if (!confirm('Сигурни ли сте, че искате да изтриете този инструмент?')) {
      return
    }

    try {
    const { error } = await supabase
      .from('ai_tools')
      .delete()
      .eq('id', toolId)

      if (error) throw error
      
      // Log activity
      await logActivity({
        action: 'delete_tool',
        resourceType: 'ai_tool',
        resourceId: toolId,
        details: { 
          tool_name: tool?.name,
          deleted_by: user?.id,
          deleted_at: new Date().toISOString()
        }
      })
      
      // Invalidate cache
      invalidatePattern('tools')
      invalidatePattern('dashboard-stats')
      
      showSuccessToast('Инструментът е изтрит успешно')
      fetchTools()
    } catch (error) {
      showErrorToast('Грешка при изтриване на инструмента')
    }
  }

  const canEditTool = (tool: AITool) => {
    return tool.created_by === user?.id || profile?.role === 'owner'
  }

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tool.tags || []).some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !selectedCategory || tool.category_id === selectedCategory
    const matchesRole = !selectedRole || tool.roles.includes(selectedRole)
    
    return matchesSearch && matchesCategory && matchesRole
  })

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPricingColor = (model: string) => {
    switch (model) {
      case 'free': return 'bg-green-100 text-green-800'
      case 'freemium': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-orange-100 text-orange-800'
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Зареждане на инструменти...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Инструменти</h2>
          <p className="text-gray-600 mt-1">Открий и сподели AI решения с екипа</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Добави инструмент
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Търси инструменти..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Всички категории</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Всички роли</option>
            {Object.entries(roleDisplayNames).map(([role, displayName]) => (
              <option key={role} value={role}>
                {displayName}
              </option>
            ))}
          </select>

          <div className="flex items-center text-sm text-gray-600">
            <Filter className="w-4 h-4 mr-2" />
            {filteredTools.length} от {tools.length} инструмента
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(filteredTools) && filteredTools.map(tool => (
          <React.Fragment key={tool.id}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{tool.name}</h3>
                  {tool.category && (
                    <span 
                      className="inline-block px-2 py-1 text-xs font-medium rounded-full text-white mb-2"
                      style={{ backgroundColor: tool.category.color }}
                    >
                      {tool.category.name}
                    </span>
                  )}
                </div>
                {canEditTool(tool) && (
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => {
                        setEditingTool(tool)
                        setShowForm(true)
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tool.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{tool.description}</p>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(tool.difficulty_level)}`}>
                  {difficultyLevels[tool.difficulty_level]}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPricingColor(tool.pricing_model)}`}>
                  {pricingModels[tool.pricing_model]}
                </span>
              </div>

              {/* Tags */}
              {(tool.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {(tool.tags || []).slice(0, 3).map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {(tool.tags || []).length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                      +{(tool.tags || []).length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Roles */}
              {tool.roles.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Подходящ за:</p>
                  <div className="flex flex-wrap gap-1">
                    {tool.roles.map(role => (
                      <span key={role} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        {roleDisplayNames[role as keyof typeof roleDisplayNames]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex gap-2">
                {tool.website_url && (
                  <a
                    href={tool.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Сайт
                  </a>
                )}
                {tool.documentation_url && (
                  <a
                    href={tool.documentation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm"
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Docs
                  </a>
                )}
                {tool.video_url && (
                  <a
                    href={tool.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
                  >
                    <Video className="w-4 h-4 mr-1" />
                    Видео
                  </a>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {tool.creator?.full_name && `Добавен от ${tool.creator.full_name}`}
                </span>
                <span>
                  {new Date(tool.created_at).toLocaleDateString('bg-BG')}
                </span>
              </div>

              {/* Rating and Comments */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <ToolRating
                  toolId={tool.id}
                  averageRating={tool.average_rating || 0}
                  totalRatings={tool.total_ratings || 0}
                  onRatingChange={fetchTools}
                />
                
                <div className="mt-3">
                  <ToolComments
                    toolId={tool.id}
                    totalComments={tool.total_comments || 0}
                    onCommentChange={fetchTools}
                  />
                </div>
              </div>
            </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Eye className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Няма намерени инструменти</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory || selectedRole
              ? 'Опитайте с различни филтри или добавете нов инструмент.'
              : 'Започнете като добавите първия AI инструмент.'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добави инструмент
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <AIToolForm
          tool={editingTool}
          onClose={() => {
            setShowForm(false)
            setEditingTool(undefined)
          }}
          onSave={() => {
            fetchTools()
            setEditingTool(undefined)
          }}
        />
      )}
    </div>
  )
}

export default AIToolsList