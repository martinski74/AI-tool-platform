import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  Search, 
  Filter, 
  Check, 
  X, 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  BookOpen,
  Video,
  Tag,
  User,
  Calendar,
  MessageSquare,
  Star
} from 'lucide-react'
import { supabase, AITool, Category, roleDisplayNames, difficultyLevels, pricingModels, toolStatuses } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { useCacheManager } from '../hooks/useCache'

const AdminPanel: React.FC = () => {
  const { user, profile } = useAuth()
  const { logActivity } = useActivityLogger()
  const { invalidatePattern } = useCacheManager()
  const [tools, setTools] = useState<AITool[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null)

  useEffect(() => {
    if (profile?.role === 'owner') {
      fetchTools()
      fetchCategories()
    }
  }, [profile])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
    } else {
      setCategories(data || [])
    }
  }

  const fetchTools = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('ai_tools')
      .select(`
        *,
        category:categories(id, name, color),
        creator:profiles!ai_tools_created_by_fkey(id, full_name, email),
        approver:profiles!ai_tools_approved_by_fkey(id, full_name),
        tool_roles(role)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tools:', error)
    } else {
      const toolsWithRoles = data?.map(tool => ({
        ...tool,
        roles: tool.tool_roles?.map((tr: any) => tr.role) || []
      })) || []
      
      setTools(toolsWithRoles)
    }
    
    setLoading(false)
  }

  const handleApprove = async (toolId: string) => {
    const tool = tools.find(t => t.id === toolId)
    
    try {
    const { error } = await supabase
      .from('ai_tools')
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        rejection_reason: null
      })
      .eq('id', toolId)

      if (error) throw error
      
      // Log activity
      await logActivity({
        action: 'approve_tool',
        resourceType: 'ai_tool',
        resourceId: toolId,
        details: { 
          tool_name: tool?.name,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        }
      })
      
      // Invalidate cache
      invalidatePattern('tools')
      invalidatePattern('dashboard-stats')
      
      fetchTools()
    } catch (error) {
      console.error('Error approving tool:', error)
      // Log error activity
      await logActivity({
        action: 'approve_tool',
        resourceType: 'ai_tool',
        resourceId: toolId,
        details: { 
          tool_name: tool?.name,
          error: error.message,
          success: false
        }
      })
    }
  }

  const handleReject = (tool: AITool) => {
    setSelectedTool(tool)
    setRejectionReason('')
    setShowRejectionModal(true)
  }

  const confirmReject = async () => {
    if (!selectedTool) return

    try {
    const { error } = await supabase
      .from('ai_tools')
      .update({
        status: 'rejected',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason || 'Няма посочена причина'
      })
      .eq('id', selectedTool.id)

      if (error) throw error
      
      // Log activity
      await logActivity({
        action: 'reject_tool',
        resourceType: 'ai_tool',
        resourceId: selectedTool.id,
        details: { 
          tool_name: selectedTool.name,
          rejection_reason: rejectionReason || 'Няма посочена причина',
          rejected_by: user?.id,
          rejected_at: new Date().toISOString()
        }
      })
      
      // Invalidate cache
      invalidatePattern('tools')
      invalidatePattern('dashboard-stats')
      
      fetchTools()
      setShowRejectionModal(false)
      setSelectedTool(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting tool:', error)
      // Log error activity
      await logActivity({
        action: 'reject_tool',
        resourceType: 'ai_tool',
        resourceId: selectedTool.id,
        details: { 
          tool_name: selectedTool.name,
          rejection_reason: rejectionReason,
          error: error.message,
          success: false
        }
      })
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
      
      fetchTools()
    } catch (error) {
      console.error('Error deleting tool:', error)
      // Log error activity
      await logActivity({
        action: 'delete_tool',
        resourceType: 'ai_tool',
        resourceId: toolId,
        details: { 
          tool_name: tool?.name,
          error: error.message,
          success: false
        }
      })
    }
  }

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.creator?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tool.tags || []).some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !selectedCategory || tool.category_id === selectedCategory
    const matchesStatus = !selectedStatus || tool.status === selectedStatus
    const matchesRole = !selectedRole || tool.roles.includes(selectedRole)
    
    return matchesSearch && matchesCategory && matchesStatus && matchesRole
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'approved': return <CheckCircle className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

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

  if (profile?.role !== 'owner') {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Достъп отказан</h3>
        <p className="text-gray-600">Само собственици имат достъп до админ панела.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Зареждане на инструменти...</span>
      </div>
    )
  }

  const pendingCount = tools.filter(t => t.status === 'pending').length
  const approvedCount = tools.filter(t => t.status === 'approved').length
  const rejectedCount = tools.filter(t => t.status === 'rejected').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Админ панел</h2>
          <p className="text-gray-600 mt-1">Управление на AI инструменти и одобрения</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Общо инструменти</p>
              <p className="text-2xl font-bold text-gray-900">{tools.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Чакат одобрение</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Одобрени</p>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Отхвърлени</p>
              <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Всички статуси</option>
            {Object.entries(toolStatuses).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
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
            {filteredTools.length} от {tools.length}
          </div>
        </div>
      </div>

      {/* Tools List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Инструмент
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Създател
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTools.map(tool => (
                <tr key={tool.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {tool.name}
                        </p>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {tool.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(tool.difficulty_level)}`}>
                            {difficultyLevels[tool.difficulty_level]}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPricingColor(tool.pricing_model)}`}>
                            {pricingModels[tool.pricing_model]}
                          </span>
                        </div>
                        {(tool.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
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
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {tool.creator?.full_name || 'Неизвестен'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {tool.creator?.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tool.status)}`}>
                        {getStatusIcon(tool.status)}
                        <span className="ml-1">{toolStatuses[tool.status]}</span>
                      </span>
                    </div>
                    {tool.status === 'rejected' && tool.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">
                        {tool.rejection_reason}
                      </p>
                    )}
                    {tool.approver && (
                      <p className="text-xs text-gray-500 mt-1">
                        от {tool.approver.full_name}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {tool.category && (
                      <span 
                        className="inline-block px-2 py-1 text-xs font-medium rounded-full text-white"
                        style={{ backgroundColor: tool.category.color }}
                      >
                        {tool.category.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(tool.created_at).toLocaleDateString('bg-BG')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {tool.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(tool.id)}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                            title="Одобри"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(tool)}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Отхвърли"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {/* Rating and Comments Info */}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {(tool.average_rating || 0) > 0 && (
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                            <span>{(tool.average_rating || 0).toFixed(1)} ({tool.total_ratings || 0})</span>
                          </div>
                        )}
                        {(tool.total_comments || 0) > 0 && (
                          <div className="flex items-center">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            <span>{tool.total_comments} коментара</span>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        {tool.website_url && (
                          <a
                            href={tool.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Уебсайт"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {tool.documentation_url && (
                          <a
                            href={tool.documentation_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                            title="Документация"
                          >
                            <BookOpen className="w-4 h-4" />
                          </a>
                        )}
                        {tool.video_url && (
                          <a
                            href={tool.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Видео"
                          >
                            <Video className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(tool.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Изтрий"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredTools.map(tool => (
            <div key={tool.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tool.name}</p>
                  <p className="text-sm text-gray-500 line-clamp-2">{tool.description}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tool.status)}`}>
                  {getStatusIcon(tool.status)}
                  <span className="ml-1">{toolStatuses[tool.status]}</span>
                </span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-2" />
                  <span>{tool.creator?.full_name || 'Неизвестен'}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span>{new Date(tool.created_at).toLocaleDateString('bg-BG')}</span>
                </div>
                {tool.category && (
                  <div className="flex items-center">
                     <span 
                        className="inline-block px-2 py-1 text-xs font-medium rounded-full text-white"
                        style={{ backgroundColor: tool.category.color }}
                      >
                        {tool.category.name}
                      </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  {tool.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(tool.id)}
                        className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors"
                        title="Одобри"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(tool)}
                        className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                        title="Отхвърли"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(tool.id)}
                    className="p-2 bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200 transition-colors"
                    title="Изтрий"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Eye className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Няма намерени инструменти</h3>
            <p className="text-gray-600">
              Опитайте с различни филтри или изчакайте потребителите да добавят нови инструменти.
            </p>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && selectedTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Отхвърляне на инструмент
              </h3>
              <button
                onClick={() => setShowRejectionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Отхвърляте инструмента <strong>{selectedTool.name}</strong>. 
                Моля, посочете причина за отхвърлянето:
              </p>
              
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Причина за отхвърляне..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отказ
              </button>
              <button
                onClick={confirmReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Отхвърли
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel