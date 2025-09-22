import React, { useState } from 'react'
import { LogIn, Loader2, Users, Bot } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useToaster } from '../hooks/useToaster'

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [twoFactorEmail, setTwoFactorEmail] = useState('')
  const { signIn, verifyTwoFactor, resendTwoFactorCode, loading } = useAuth()
  const { showSuccessToast, showErrorToast } = useToaster()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!supabase) {
      showErrorToast('Системата не е конфигурирана. Моля, свържете се с администратор.')
      return
    }
    
    const { error } = await signIn(email, password)
    if (error) {
      if (error.message === 'TWO_FACTOR_REQUIRED') {
        setTwoFactorEmail(email)
        setShowTwoFactor(true)
        showSuccessToast('Код за потвърждение е изпратен на вашия email')
        setEmail('')
        setPassword('')
      } else {
        showErrorToast('Грешен email или парола')
      }
    } else {
      // Successful login without 2FA
      showSuccessToast('Успешен вход в системата')
      setEmail('')
      setPassword('')
    }
  }

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await verifyTwoFactor(twoFactorEmail, twoFactorCode)
    if (error) {
      showErrorToast('Невалиден код за потвърждение')
    }
  }

  const handleResendCode = async () => {
    const { error } = await resendTwoFactorCode(twoFactorEmail)
    if (error) {
      showErrorToast('Грешка при изпращане на кода')
    } else {
      showSuccessToast('Нов код е изпратен на вашия email')
    }
  }

  const seedUsers = [
    { email: 'ivan@admin.local', name: 'Иван Иванов', role: 'Owner', twoFactor: false },
    { email: 'elena@frontend.local', name: 'Елена Петрова', role: 'Frontend', twoFactor: true },
    { email: 'petar@backend.local', name: 'Петър Георгиев', role: 'Backend', twoFactor: false },
    { email: 'maria@pm.local', name: 'Мария Стоянова', role: 'PM', twoFactor: false },
    { email: 'georgi@qa.local', name: 'Георги Николов', role: 'QA', twoFactor: false },
    { email: 'ana@design.local', name: 'Ана Димитрова', role: 'Designer', twoFactor: false }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Tools Platform</h1>
            <p className="text-gray-600">Вътрешна система за споделяне на AI инструменти</p>
          </div>

          {!showTwoFactor ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email адрес
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="example@company.local"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Парола
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-5 h-5 mr-2" />
                )}
                {loading ? 'Влизане...' : 'Влез в системата'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <LogIn className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Двуфакторна автентикация</h2>
                <p className="text-gray-600">
                  Въведете кода, който получихте на <strong>{twoFactorEmail}</strong>
                </p>
              </div>

              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Код за потвърждение
                </label>
                <input
                  type="text"
                  id="twoFactorCode"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-2xl font-mono tracking-widest"
                  placeholder="123456"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Въведете 6-цифрения код от email-а
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-5 h-5 mr-2" />
                )}
                {loading ? 'Потвърждаване...' : 'Потвърди'}
              </button>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Изпрати отново
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTwoFactor(false)
                    setTwoFactorCode('')
                    setTwoFactorEmail('')
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Назад
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Test Users Panel */}
        <div className={`hidden lg:block bg-white rounded-2xl shadow-xl p-8 lg:p-10 ${showTwoFactor ? 'opacity-50' : ''}`}>
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Тестови потребители</h2>
          </div>
          
          <p className="text-gray-600 mb-6">Използвайте следните акаунти за тестване на системата:</p>
          
          <div className="space-y-4">
            {seedUsers.map((user, index) => (
              <div
                key={index}
                className={`border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors ${showTwoFactor ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => {
                  if (showTwoFactor) return
                  setEmail(user.email)
                  setPassword('password')
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Парола за всички:</strong> password
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Кликнете върху потребител за автоматично попълване
            </p>
            {showTwoFactor && (
              <p className="text-xs text-blue-600 mt-2">
                <strong>Забележка:</strong> Завършете двуфакторната автентикация първо
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginForm