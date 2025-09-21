import React, { useState, useEffect } from 'react'
import { Clock, User, Eye, Filter, Search } from 'lucide-react'
import { supabase, ActivityLog, activityActions, resourceTypes } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRoleProtection } from '../hooks/useRoleProtection'

const ActivityLogComponent: React.FC = () => {
  const { profile } = useAuth()
  const { isAuthorized } = useRoleProtection({ allowedRoles: ['owner'] })
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedResourceType, setSelectedResourceType] = useState('')
  const [selectedUser, setSelectedUser] = useState('')

  useEffect(() => {
    if (isAuthorized) {
      fetchActivityLogs()
    }
  }, [isAuthorized])

  const fetchActivityLogs = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles!activity_logs_user_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = !selectedAction || log.action === selectedAction
    const matchesResourceType = !selectedResourceType || log.resource_type === selectedResourceType
    const matchesUser = !selectedUser || log.user_id === selectedUser
    
    return matchesSearch && matchesAction && matchesResourceType && matchesUser
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login':
      case 'create_tool':
      case 'create_category':
      case 'approve_tool':
      case 'enable_2fa':
        return 'bg-green-100 text-green-800'
      case 'logout':
      case 'disable_2fa':
        return 'bg-gray-100 text-gray-800'
      case 'update_tool':
      case 'update_category':
        return 'bg-blue-100 text-blue-800'
      case 'delete_tool':
      case 'delete_category':
      case 'reject_tool':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) return null
    
    return Object.entries(details).map(([key, value]) => (
      <div key={key} className="text-xs text-gray-500">
        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {
          typeof value === 'string' && value.length > 50 
            ? `${value.substring(0, 50)}...`
            : typeof value === 'object' 
              ? JSON.stringify(value)
              : String(value)
        }
      </div>
    ))
  }

  const uniqueUsers = Array.from(new Set(logs.map(log => log.user_id).filter(Boolean)))
    .map(userId => logs.find(log => log.user_id === userId)?.user)
    .filter(Boolean)

  if (!isAuthorized) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Зареждане на активността...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Лог на активността</h2>
          <p className="text-gray-600 mt-1">Проследяване на действията в системата</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Търси в логовете..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Всички действия</option>
            {Object.entries(activityActions).map(([action, label]) => (
              <option key={action} value={action}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={selectedResourceType}
            onChange={(e) => setSelectedResourceType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Всички ресурси</option>
            {Object.entries(resourceTypes).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Всички потребители</option>
            {uniqueUsers.map(user => (
              <option key={user?.id} value={user?.id}>
                {user?.full_name}
              </option>
            ))}
          </select>

          <div className="flex items-center text-sm text-gray-600">
            <Filter className="w-4 h-4 mr-2" />
            {filteredLogs.length} от {logs.length}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Потребител
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действие
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ресурс
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Детайли
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Време
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {log.user?.full_name || 'Неизвестен'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {log.user?.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {activityActions[log.action as keyof typeof activityActions] || log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">
                        {resourceTypes[log.resource_type as keyof typeof resourceTypes] || log.resource_type}
                      </p>
                      {log.resource_id && (
                        <p className="text-xs text-gray-500 font-mono">
                          {log.resource_id.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {formatDetails(log.details)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      <div>
                        <p>{new Date(log.created_at).toLocaleDateString('bg-BG')}</p>
                        <p className="text-xs">{new Date(log.created_at).toLocaleTimeString('bg-BG')}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredLogs.map(log => (
            <div key={log.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">{log.user?.full_name || 'Неизвестен'}</p>
                  <p className="text-sm text-gray-500">{log.user?.email}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                  {activityActions[log.action as keyof typeof activityActions] || log.action}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Ресурс</p>
                  <p>{resourceTypes[log.resource_type as keyof typeof resourceTypes] || log.resource_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Детайли</p>
                  {formatDetails(log.details)}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm text-gray-500">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{new Date(log.created_at).toLocaleString('bg-BG')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Eye className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Няма намерени записи</h3>
            <p className="text-gray-600">
              Опитайте с различни филтри или изчакайте повече активност.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLogComponent