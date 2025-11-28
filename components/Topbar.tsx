import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, User, Mic, LogOut, CheckCircle, AlertTriangle, X, Menu } from 'lucide-react';
import { ViewState } from '../types';
import { GLASS_STYLES } from '../constants';
import { documentsService } from '../api/services/documents';

interface TopbarProps {
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  onOpenCommandPalette: () => void;
  onToggleMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onNavigate, onLogout, onOpenCommandPalette, onToggleMobileMenu }) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // Search handler
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // API search returns { answer, documents, total } format
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/documents/search?query=${encodeURIComponent(query)}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setSearchResults(result.documents || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('library');
      // Можно добавить параметр поиска в URL или состояние
    }
  };

  return (
    <header className={`mx-4 mt-4 mb-0 rounded-2xl flex items-center justify-between px-6 py-2 sticky top-4 z-30 transition-all duration-300 ${GLASS_STYLES.panel} border-white/20`}>
      {/* Mobile Menu Button */}
      <button 
        onClick={onToggleMobileMenu}
        className="md:hidden p-2 -ml-2 mr-2 text-slate-600 hover:bg-white/40 rounded-xl"
      >
        <Menu size={24} />
      </button>

      {/* Logo Area */}
      <div className="flex items-center gap-3 w-auto md:w-64 cursor-pointer group" onClick={() => onNavigate('dashboard')}>
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform shrink-0">
          S
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-800 hidden sm:block">Sirius DMS</span>
      </div>

      {/* Intelligent Search */}
      <div className="flex-1 max-w-2xl relative mx-4">
        <form onSubmit={handleSearchSubmit} className={`flex items-center rounded-xl px-4 transition-all duration-200 border ${isSearchFocused ? 'bg-white/80 shadow-lg ring-2 ring-indigo-500/20 border-indigo-200' : 'bg-black/5 border-transparent hover:bg-white/40 hover:border-white/40 shadow-inner'}`}>
          <Search size={18} className="text-slate-500" />
          <input 
            type="text"
            placeholder="Найти документы, контрагентов, суммы..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 text-sm py-3 px-3 text-slate-800 placeholder:text-slate-500"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />
          <button className="p-1.5 hover:bg-white/50 rounded-lg text-slate-500 transition-colors">
            <Mic size={16} />
          </button>
          <div 
            onClick={onOpenCommandPalette}
            className="text-xs text-slate-500 font-mono border border-slate-300/50 bg-white/30 rounded px-2 py-0.5 ml-2 hidden md:block cursor-pointer hover:bg-white/60 transition-colors"
            title="Open Command Palette (Cmd+K)"
          >
            ⌘K
          </div>
        </form>

        {/* Search Dropdown / Suggestions */}
        {isSearchFocused && (
          <div className={`absolute top-full left-0 right-0 mt-3 py-3 animate-in fade-in slide-in-from-top-2 duration-200 z-50 rounded-2xl ${GLASS_STYLES.modal}`}>
            {isSearching ? (
              <div className="px-4 py-8 text-center text-slate-400">
                Поиск...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="px-4 py-2">
                <span className="text-xs font-bold text-indigo-900/50 uppercase tracking-widest">Результаты поиска</span>
                <ul className="mt-2 space-y-1">
                  {searchResults.map((doc) => (
                    <li 
                      key={doc.id}
                      onClick={() => {
                        onNavigate('library');
                        setSearchQuery('');
                        setIsSearchFocused(false);
                      }}
                      className="text-sm text-slate-700 hover:bg-indigo-50/50 px-3 py-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors"
                    >
                      <div className="p-1.5 bg-white rounded-md shadow-sm text-indigo-500"><Search size={14} /></div>
                      {doc.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : searchQuery ? (
              <div className="px-4 py-2">
                <span className="text-xs font-bold text-indigo-900/50 uppercase tracking-widest">Быстрые фильтры</span>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['Договоры', 'Счета', 'За месяц', '> 1 млн ₽', 'На проверке'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => {
                        setSearchQuery(tag);
                        onNavigate('library');
                      }}
                      className="px-2.5 py-1 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-700 text-xs rounded-lg text-slate-600 transition-colors font-medium"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-2">
                <span className="text-xs font-bold text-indigo-900/50 uppercase tracking-widest">Быстрые фильтры</span>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['Договоры', 'Счета', 'За месяц', '> 1 млн ₽', 'На проверке'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => {
                        setSearchQuery(tag);
                        onNavigate('library');
                      }}
                      className="px-2.5 py-1 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-700 text-xs rounded-lg text-slate-600 transition-colors font-medium"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 w-64 justify-end">
        
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2.5 rounded-xl transition-all duration-200 ${showNotifications ? 'bg-white shadow-md text-indigo-600' : 'text-slate-600 hover:bg-white/50 hover:text-indigo-600'}`}
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
          </button>
          
          {showNotifications && (
            <div className={`absolute right-0 top-full mt-4 w-80 rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-200 ${GLASS_STYLES.modal}`}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100/50">
                <span className="font-bold text-sm text-slate-800">Уведомления</span>
                <span className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-800 font-medium">Очистить</span>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                <div className="p-3 rounded-xl hover:bg-white/50 transition-colors cursor-pointer mb-1">
                  <div className="flex items-start gap-3">
                    <div className="text-amber-500 mt-0.5 bg-amber-50 p-1.5 rounded-lg"><AlertTriangle size={16} /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Обнаружены дубликаты</p>
                      <p className="text-xs text-slate-600 mt-0.5">Система нашла 3 похожих документа в загрузке от 15.01</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">10 минут назад</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-xl hover:bg-white/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="text-emerald-500 mt-0.5 bg-emerald-50 p-1.5 rounded-lg"><CheckCircle size={16} /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Импорт завершен</p>
                      <p className="text-xs text-slate-600 mt-0.5">Обработано 12 документов из Email</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">1 час назад</p>
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
          className="text-slate-600 hover:text-indigo-600 p-2.5 rounded-xl hover:bg-white/50 transition-all duration-200"
        >
          <Settings size={20} />
        </button>

        <div className="h-8 w-[1px] bg-indigo-900/10 mx-1"></div>

        {/* User Profile */}
        <div className="relative" ref={userRef}>
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-white/50 p-1 pr-3 rounded-full transition-all duration-200 border border-transparent hover:border-white/40 hover:shadow-sm"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white/50">
              AA
            </div>
          </button>

          {showUserMenu && (
            <div className={`absolute right-0 top-full mt-4 w-60 rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden ${GLASS_STYLES.modal}`}>
               <div className="px-5 py-4 border-b border-slate-100/50 bg-indigo-50/30">
                 <p className="text-sm font-bold text-slate-800">Алексей Алексеев</p>
                 <p className="text-xs text-slate-500 truncate font-medium">alex@sirius-dms.com</p>
               </div>
               <div className="p-2">
                 <button 
                   onClick={() => { setShowUserMenu(false); onNavigate('settings'); }}
                   className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-white/60 rounded-xl flex items-center gap-3 transition-colors font-medium"
                 >
                   <User size={16} className="text-indigo-500" /> Профиль
                 </button>
                 <button 
                   onClick={() => { setShowUserMenu(false); onNavigate('settings'); }}
                   className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-white/60 rounded-xl flex items-center gap-3 transition-colors font-medium"
                 >
                   <Settings size={16} className="text-indigo-500" /> Настройки
                 </button>
                 <div className="my-2 border-t border-slate-100/50"></div>
                 <button 
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50/50 rounded-xl flex items-center gap-3 transition-colors font-medium"
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