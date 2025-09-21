import React, { useState } from 'react'
import { Shield, ShieldCheck, ShieldX, Loader2, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useActivityLogger } from '../hooks/useActivityLogger'

const TwoFactorSettings: React.FC = () => {
  const { profile } = useAuth()
  const { logActivity } = useActivityLogger()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleToggleTwoFactor = async () => {
    if (!profile) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const newStatus = !profile.two_factor_enabled

      const { error } = await supabase
        .from('profiles')
        .update({ two_factor_enabled: newStatus })
        .eq('id', profile.id)

      if (error) throw error

      setSuccess(
        newStatus 
          ? 'Двуфакторната автентикация е активирана успешно'
          : 'Двуфакторната автентикация е деактивирана успешно'
      )

      // Log activity
      await logActivity({
        action: newStatus ? 'enable_2fa' : 'disable_2fa',
        resourceType: 'profile',
        resourceId: profile.id,
        details: { 
          two_factor_enabled: newStatus,
          user_email: profile.email,
          changed_at: new Date().toISOString()
        }
      })

      // Refresh profile data
      window.location.reload()
    } catch (error) {
      console.error('Error toggling 2FA:', error)
      setError('Грешка при промяна на настройките')
      
      // Log error activity
      await logActivity({
        action: profile.two_factor_enabled ? 'disable_2fa' : 'enable_2fa',
        resourceType: 'profile',
        resourceId: profile.id,
        details: { 
          error: error.message,
          user_email: profile.email,
          success: false
        }
      })
    } finally {
      setLoading(false)
    }
  }

  if (!profile) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <Shield className="w-6 h-6 text-blue-600 mr-3" />
        <h3 className="text-xl font-bold text-gray-900">Двуфакторна автентикация</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${profile.two_factor_enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
            {profile.two_factor_enabled ? (
              <ShieldCheck className="w-6 h-6 text-green-600" />
            ) : (
              <ShieldX className="w-6 h-6 text-gray-600" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">
              Email автентикация
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              {profile.two_factor_enabled 
                ? 'Двуфакторната автентикация е активна. При всяко влизане ще получавате код на email-а си.'
                : 'Активирайте двуфакторната автентикация за допълнителна сигурност на акаунта си.'
              }
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Mail className="w-4 h-4" />
              <span>{profile.email}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <button
          onClick={handleToggleTwoFactor}
          disabled={loading}
          className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            profile.two_factor_enabled
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Shield className="w-4 h-4 mr-2" />
          )}
          {loading 
            ? 'Запазване...' 
            : profile.two_factor_enabled 
              ? 'Деактивирай 2FA' 
              : 'Активирай 2FA'
          }
        </button>

        {!profile.two_factor_enabled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">Как работи двуфакторната автентикация?(Демо цели)</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• При всяко влизане ще въвеждате email и парола както обикновено</li>
              <li>• След това ще получите 6-цифрен код на email-а си, в случая в конзолата на браузъра Ви</li>
              <li>• Въведете кода за да завършите влизането</li>
              <li>• Вреална среда това осигурява допълнителна защита на акаунта ви</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default TwoFactorSettings