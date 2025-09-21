import React, { useState, useEffect } from 'react'
import { MessageSquare, Send, Edit, Trash2, Loader2, User } from 'lucide-react'
import { supabase, ToolComment } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ToolCommentsProps {
  toolId: string
  totalComments?: number
  onCommentChange?: () => void
}

const ToolComments: React.FC<ToolCommentsProps> = ({ 
  toolId, 
  totalComments = 0,
  onCommentChange 
}) => {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<ToolComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    if (showComments) {
      fetchComments()
    }
  }, [showComments, toolId])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tool_comments')
        .select(`
          *,
          user:profiles!tool_comments_user_id_fkey(id, full_name, email)
        `)
        .eq('tool_id', toolId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('tool_comments')
        .insert({
          tool_id: toolId,
          user_id: user.id,
          content: newComment.trim()
        })

      if (error) throw error

      setNewComment('')
      await fetchComments()
      
      // Update the total comments count in the parent component
      if (onCommentChange) {
        onCommentChange()
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim() || submitting) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('tool_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId)

      if (error) throw error

      setEditingComment(null)
      setEditContent('')
      await fetchComments()
    } catch (error) {
      console.error('Error updating comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете този коментар?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('tool_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      await fetchComments()
      
      // Update the total comments count in the parent component
      if (onCommentChange) {
        onCommentChange()
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const canEditComment = (comment: ToolComment) => {
    return comment.user_id === user?.id || profile?.role === 'owner'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('bg-BG', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else {
      return date.toLocaleDateString('bg-BG')
    }
  }

  return (
    <div className="space-y-4">
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">
            Коментари ({totalComments})
          </span>
        </button>
      </div>

      {showComments && (
        <div className="space-y-4">
          {/* Add Comment Form */}
          {user && (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Напишете коментар..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {submitting ? 'Изпращане...' : 'Коментирай'}
                </button>
              </div>
            </form>
          )}

          {/* Comments List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Зареждане на коментари...</span>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {comment.user?.full_name || 'Неизвестен потребител'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    {canEditComment(comment) && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingComment(comment.id)
                            setEditContent(comment.content)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {editingComment === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setEditingComment(null)
                            setEditContent('')
                          }}
                          className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Отказ
                        </button>
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          disabled={!editContent.trim() || submitting}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {submitting ? 'Запазване...' : 'Запази'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Все още няма коментари</p>
              {user && (
                <p className="text-sm">Бъдете първият, който ще коментира!</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ToolComments