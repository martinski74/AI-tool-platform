import React, { useState, useEffect } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { supabase, ToolRating } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ToolRatingProps {
  toolId: string
  averageRating?: number
  totalRatings?: number
  onRatingChange?: () => void
}

const ToolRatingComponent: React.FC<ToolRatingProps> = ({ 
  toolId, 
  averageRating = 0, 
  totalRatings = 0,
  onRatingChange 
}) => {
  const { user } = useAuth()
  const [userRating, setUserRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUserRating()
    }
  }, [user, toolId])

  const fetchUserRating = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tool_ratings')
        .select('rating')
        .eq('tool_id', toolId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user rating:', error)
      } else if (data) {
        setUserRating(data.rating)
      }
    } catch (error) {
      console.error('Error fetching user rating:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRatingClick = async (rating: number) => {
    if (!user || submitting) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('tool_ratings')
        .upsert({
          tool_id: toolId,
          user_id: user.id,
          rating: rating
        })

      if (error) throw error

      setUserRating(rating)
      if (onRatingChange) {
        onRatingChange()
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (rating: number, interactive: boolean = false) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1
      const isFilled = interactive 
        ? (hoveredRating || userRating) >= starValue
        : rating >= starValue
      
      return (
        <Star
          key={index}
          className={`w-5 h-5 ${
            isFilled 
              ? 'text-yellow-400 fill-current' 
              : 'text-gray-300'
          } ${
            interactive 
              ? 'cursor-pointer hover:text-yellow-400 transition-colors' 
              : ''
          }`}
          onClick={interactive ? () => handleRatingClick(starValue) : undefined}
          onMouseEnter={interactive ? () => setHoveredRating(starValue) : undefined}
          onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
        />
      )
    })
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-500">Зареждане...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Average Rating Display */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          {renderStars(averageRating)}
        </div>
        <span className="text-sm text-gray-600">
          {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
        </span>
        <span className="text-sm text-gray-500">
          ({totalRatings} {totalRatings === 1 ? 'оценка' : 'оценки'})
        </span>
      </div>

      {/* User Rating */}
      {user && (
        <div className="border-t pt-3">
          <p className="text-sm text-gray-700 mb-2">
            {userRating > 0 ? 'Вашата оценка:' : 'Оценете този инструмент:'}
          </p>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {renderStars(userRating, true)}
            </div>
            {submitting && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            )}
            {userRating > 0 && (
              <span className="text-sm text-gray-600">
                {userRating} от 5 звезди
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ToolRatingComponent