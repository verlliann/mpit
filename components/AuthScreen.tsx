import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { GLASS_STYLES } from '../constants';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('demo@sirius-dms.com');
  const [password, setPassword] = useState('password');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || 'Не удалось войти в систему');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="mb-8 flex flex-col items-center z-10">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-indigo-500/30 mb-6 ring-4 ring-white/50 backdrop-blur-sm">
          S
        </div>
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Sirius DMS</h1>
        <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500" />
          Интеллектуальная система управления
        </p>
      </div>

      <div className={`w-full max-w-md rounded-3xl overflow-hidden z-10 ${GLASS_STYLES.modal}`}>
        <div className="p-10 bg-white/60 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-slate-800 mb-8 text-center">Вход в систему</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Mail size={20} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all ${GLASS_STYLES.input}`}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Пароль</label>
                <a href="#" className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors hover:underline">Забыли пароль?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all ${GLASS_STYLES.input}`}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50/80 backdrop-blur-sm border border-rose-100 rounded-xl text-sm text-rose-600 font-medium flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Вход...
                </>
              ) : (
                <>
                  Войти <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <ShieldCheck size={14} />
            <span>Защищенное соединение 256-bit SSL</span>
          </div>
        </div>
        <div className="bg-white/40 px-8 py-5 border-t border-white/20 text-center backdrop-blur-md">
          <p className="text-xs text-slate-500 font-medium">
            Нет аккаунта? <a href="#" className="text-indigo-600 hover:text-indigo-800 transition-colors font-bold hover:underline">Свяжитесь с администратором</a>
          </p>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-400/80 font-medium z-10">
        &copy; 2025 Sirius Systems Inc. Все права защищены.
      </div>
    </div>
  );
};