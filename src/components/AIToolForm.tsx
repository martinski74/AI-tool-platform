import React, { useState, useEffect } from 'react'
import { X, Plus, ExternalLink, BookOpen, Video, Tag, Save, Loader2 } from 'lucide-react'
import { supabase, Category, AITool, roleDisplayNames, difficultyLevels, pricingModels } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { useCacheManager } from '../hooks/useCache'
import { useCache } from '../hooks/useCache'
import { useToaster } from '../hooks/useToaster'

interface AIToolFormProps {
  tool?: AITool
  onClose: () => void
  onSave: () => void
}

const AIToolForm: React.FC<AIToolFormProps> = ({ tool, onClose, onSave }) => {
  const { user } = useAuth()
  const { logActivity } = useActivityLogger()
  const { invalidatePattern } = useCacheManager()
  const { showSuccessToast, showErrorToast } = useToaster()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  
  const [formData, setFormData] = useState({
    name: tool?.name || '',
    description: tool?.description || '',
    category_id: tool?.category_id || '',
    website_url: tool?.website_url || '',
    documentation_url: tool?.documentation_url || '',
    video_url: tool?.video_url || '',
    difficulty_level: tool?.difficulty_level || 'beginner' as const,
    pricing_model: tool?.pricing_model || 'free' as const,
    tags: tool?.tags || [],
    roles: tool?.roles || []
  })

  const [currentTag, setCurrentTag] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) {
      showErrorToast('Грешка при зареждане на категориите')
    } else {
      setCategories(data || [])
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: newCategoryName.trim() }])
      .select()
      .single()

    if (error) {
      showErrorToast('Грешка при създаване на категория')
    } else {
      setCategories([...categories, data])
      setFormData({ ...formData, category_id: data.id })
      setNewCategoryName('')
      setShowNewCategory(false)
      showSuccessToast('Категорията е създадена успешно')
    }
    setLoading(false)
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, currentTag.trim()]
      })
      setCurrentTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    })
  }

  const handleRoleToggle = (role: string) => {
    const newRoles = formData.roles.includes(role)
      ? formData.roles.filter(r => r !== role)
      : [...formData.roles, role]
    
    setFormData({ ...formData, roles: newRoles })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      let toolData
      
      if (tool) {
        // Update existing tool
        const { data, error } = await supabase
          .from('ai_tools')
          .update({
            name: formData.name,
            description: formData.description,
            category_id: formData.category_id || null,
            website_url: formData.website_url || null,
            documentation_url: formData.documentation_url || null,
            video_url: formData.video_url || null,
            difficulty_level: formData.difficulty_level,
            pricing_model: formData.pricing_model,
            tags: formData.tags
          })
          .eq('id', tool.id)
          .select()
          .single()

        if (error) throw error
        toolData = data
        showSuccessToast('Инструментът е редактиран успешно')
        
      } else {
        // Create new tool
        const { data, error } = await supabase
          .from('ai_tools')
          .insert([{
            name: formData.name,
            description: formData.description,
            category_id: formData.category_id || null,
            website_url: formData.website_url || null,
            documentation_url: formData.documentation_url || null,
            video_url: formData.video_url || null,
            difficulty_level: formData.difficulty_level,
            pricing_model: formData.pricing_model,
            tags: formData.tags,
            status: 'pending',
            created_by: user.id
          }])
          .select()
          .single()

        if (error) throw error
        toolData = data
        showSuccessToast('Инструментът е създаден успешно')
      }

      // Update tool roles
      if (toolData) {
        // Delete existing roles
        await supabase
          .from('tool_roles')
          .delete()
          .eq('tool_id', toolData.id)

        // Insert new roles
        if (formData.roles.length > 0) {
          const roleInserts = formData.roles.map(role => ({
            tool_id: toolData.id,
            role
          }))

          await supabase
            .from('tool_roles')
            .insert(roleInserts)
        }
      }

      // Log activity AFTER all database operations are complete
      if (tool) {
        await logActivity({
          action: 'update_tool',
          resourceType: 'ai_tool',
          resourceId: tool.id,
          details: { 
            name: formData.name, 
            category: formData.category_id,
            roles: formData.roles,
            changes: 'Updated tool details and roles'
          }
        })
      } else if (toolData) {
        await logActivity({
          action: 'create_tool',
          resourceType: 'ai_tool',
          resourceId: toolData.id,
          details: { 
            name: formData.name, 
            category: formData.category_id,
            roles: formData.roles,
            status: 'pending'
          }
        })
      }

      // Invalidate cache
      invalidatePattern('tools')
      invalidatePattern('dashboard-stats')
      
      onSave()
      onClose()
    } catch (error) {
      showErrorToast('Грешка при запис на инструмента')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {tool ? 'Редактиране на инструмент' : 'Добавяне на нов AI инструмент'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Име на инструмента *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ChatGPT, Midjourney, GitHub Copilot..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Кратко описание на инструмента и неговите възможности..."
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Категория
            </label>
            <div className="flex gap-2">
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Избери категория</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {showNewCategory && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Име на нова категория"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Създай
                </button>
              </div>
            )}
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ExternalLink className="w-4 h-4 inline mr-1" />
                Уебсайт
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 inline mr-1" />
                Документация
              </label>
              <input
                type="url"
                value={formData.documentation_url}
                onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Video className="w-4 h-4 inline mr-1" />
                Видео
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Difficulty and Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ниво на трудност
              </label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(difficultyLevels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ценови модел
              </label>
              <select
                value={formData.pricing_model}
                onChange={(e) => setFormData({ ...formData, pricing_model: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(pricingModels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Тагове
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Добави таг..."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 hover:text-blue-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Подходящ за роли
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(roleDisplayNames).map(([role, displayName]) => (
                <label key={role} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{displayName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отказ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Запазване...' : 'Запази'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AIToolForm