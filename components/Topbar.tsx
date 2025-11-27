import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, User, Mic, LogOut, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { ViewState } from '../types';

interface TopbarProps {
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  onOpenCommandPalette: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onNavigate, onLogout, onOpenCommandPalette }) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Close dropdowns when clicking outside
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* Logo Area */}
      <div className="flex items-center gap-3 w-64 cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
          S
        </div>
        <span className="font-semibold text-xl tracking-tight text-slate-900">Sirius DMS</span>
      </div>

      {/* Intelligent Search */}
      <div className="flex-1 max-w-2xl relative">
        <div className={`flex items-center bg-slate-100 rounded-lg px-3 transition-all duration-200 ${isSearchFocused ? 'ring-2 ring-primary/20 bg-white shadow-md' : 'hover:bg-slate-50'}`}>
          <Search size={18} className="text-slate-400" />
          <input 
            type="text"
            placeholder="Найти документы, контрагентов, суммы..."
            className="w-full bg-transparent border-none focus:ring-0 text-sm py-2.5 px-3 text-slate-700 placeholder:text-slate-400"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />
          <button className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <Mic size={16} />
          </button>
          <div 
            onClick={onOpenCommandPalette}
            className="text-xs text-slate-400 font-mono border border-slate-300 rounded px-1.5 ml-2 hidden md:block cursor-pointer hover:bg-slate-200 transition-colors"
            title="Open Command Palette (Cmd+K)"
          >
            ⌘K
          </div>
        </div>

        {/* Search Dropdown / Suggestions */}
        {isSearchFocused && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 py-3 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            <div className="px-4 pb-2 border-b border-slate-50">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Быстрые фильтры</span>
              <div className="flex gap-2 mt-2 flex-wrap">
                 {['Договоры', 'Счета', 'За месяц', '> 1 млн ₽', 'На проверке'].map(tag => (
                   <button key={tag} className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-primary text-xs rounded text-slate-600 transition-colors">
                     {tag}
                   </button>
                 ))}
              </div>
            </div>
            <div className="px-4 py-2">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Недавнее</span>
               <ul className="mt-1 space-y-1">
                 <li className="text-sm text-slate-600 hover:bg-slate-50 px-2 py-1.5 rounded cursor-pointer flex items-center gap-2">
                    <Search size={14} /> Договор Рога и Копыта
                 </li>
                 <li className="text-sm text-slate-600 hover:bg-slate-50 px-2 py-1.5 rounded cursor-pointer flex items-center gap-2">
                    <Search size={14} /> Счета январь 2025
                 </li>
               </ul>
            </div>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 w-64 justify-end">
        
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`text-slate-500 hover:text-slate-700 relative p-2 rounded-full hover:bg-slate-50 transition-colors ${showNotifications ? 'bg-slate-100 text-slate-700' : ''}`}
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white"></span>
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-semibold text-sm text-slate-800">Уведомления</span>
                <span className="text-xs text-primary cursor-pointer hover:underline">Очистить</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="text-warning mt-0.5"><AlertTriangle size={16} /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Обнаружены дубликаты</p>
                      <p className="text-xs text-slate-500 mt-0.5">Система нашла 3 похожих документа в загрузке от 15.01</p>
                      <p className="text-[10px] text-slate-400 mt-1">10 минут назад</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="text-success mt-0.5"><CheckCircle size={16} /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Импорт завершен</p>
                      <p className="text-xs text-slate-500 mt-0.5">Обработано 12 документов из Email</p>
                      <p className="text-[10px] text-slate-400 mt-1">1 час назад</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button 
          onClick={() => onNavigate('settings')}
          className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-50 transition-colors"
        >
          <Settings size={20} />
        </button>

        <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>

        {/* User Profile */}
        <div className="relative" ref={userRef}>
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-slate-50 p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-100"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
              AA
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
               <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                 <p className="text-sm font-semibold text-slate-800">Алексей Алексеев</p>
                 <p className="text-xs text-slate-500 truncate">alex@sirius-dms.com</p>
               </div>
               <div className="p-1">
                 <button 
                   onClick={() => { setShowUserMenu(false); onNavigate('settings'); }}
                   className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                 >
                   <User size={16} className="text-slate-400" /> Профиль
                 </button>
                 <button 
                   onClick={() => { setShowUserMenu(false); onNavigate('settings'); }}
                   className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                 >
                   <Settings size={16} className="text-slate-400" /> Настройки
                 </button>
                 <div className="my-1 border-t border-slate-100"></div>
                 <button 
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                 >
                   <LogOut size={16} /> Выйти
                 </button>
               </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};