import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import React from 'react'

type Role = 'owner' | 'backend' | 'frontend' | 'pm' | 'qa' | 'designer'

interface UseRoleProtectionOptions {
  allowedRoles: Role[]
  redirectTo?: string
  onUnauthorized?: () => void
}

export const useRoleProtection = ({ 
  allowedRoles, 
  redirectTo, 
  onUnauthorized 
}: UseRoleProtectionOptions) => {
  const { profile, loading } = useAuth()

  const hasAccess = profile && allowedRoles.includes(profile.role)
  const isAuthorized = !loading && hasAccess

  useEffect(() => {
    if (!loading && !hasAccess) {
      if (onUnauthorized) {
        onUnauthorized()
      } else if (redirectTo) {
        window.location.href = redirectTo
      }
    }
  }, [loading, hasAccess, onUnauthorized, redirectTo])

  return {
    isAuthorized,
    loading,
    profile,
    hasAccess
  }
}

// Higher-order component for role protection
export const withRoleProtection = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: Role[]
) => {
  return (props: P) => {
    const { isAuthorized, loading } = useRoleProtection({ allowedRoles })

    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Проверка на достъпа...</span>
        </div>
      )
    }

    if (!isAuthorized) {
      return (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Достъп отказан</h3>
          <p className="text-gray-600">Нямате необходимите права за достъп до тази страница.</p>
        </div>
      )
    }

    return <Component {...props} />
  }
}