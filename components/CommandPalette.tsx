
import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, ArrowRight, LayoutDashboard, Files, Users, PieChart, Settings, Command, Moon, Sun, Upload, Plus } from 'lucide-react';
import { MOCK_DOCUMENTS, GLASS_STYLES } from '../constants';
import { ViewState } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const navigationItems = [
    { label: 'Перейти в Дашборд', view: 'dashboard' as ViewState, icon: LayoutDashboard, type: 'nav' },
    { label: 'Все документы', view: 'library' as ViewState, icon: Files, type: 'nav' },
    { label: 'Аналитика', view: 'analytics' as ViewState, icon: PieChart, type: 'nav' },
    { label: 'Контрагенты', view: 'counterparties' as ViewState, icon: Users, type: 'nav' },
    { label: 'Настройки', view: 'settings' as ViewState, icon: Settings, type: 'nav' },
  ];

  const actionItems = [
    { label: 'Загрузить документ', action: () => onNavigate('upload'), icon: Upload, type: 'action' },
    { label: 'Добавить контрагента', action: () => onNavigate('counterparties'), icon: Plus, type: 'action' },
    { label: 'Переключить тему', action: () => { 
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        onClose();
    }, icon: Moon, type: 'action' },
  ];

  const filteredNav = navigationItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredActions = actionItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDocs = MOCK_DOCUMENTS.filter(doc => 
    doc.title.toLowerCase().includes(query.toLowerCase()) || 
    doc.counterparty.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const allItems = [...filteredNav, ...filteredActions, ...filteredDocs];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allItems[selectedIndex];
      if (selected) {
        if ('view' in selected) {
          onNavigate(selected.view as ViewState);
        } else if ('action' in selected) {
            // @ts-ignore
            selected.action();
        } else {
          // Navigate to library and select logic would go here, 
          // for now just go to library
          onNavigate('library');
        }
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-indigo-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className={`relative w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 rounded-2xl shadow-2xl border border-white/40 ${GLASS_STYLES.modal}`}>
        <div className="flex items-center px-5 py-4 border-b border-white/20 bg-white/40 backdrop-blur-md">
          <Search className="w-5 h-5 text-slate-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-500 text-lg outline-none font-medium"
            placeholder="Что вы ищете? (Документы, разделы, настройки...)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="hidden sm:flex items-center gap-1">
             <kbd className="px-2 py-1 bg-white/50 border border-white/30 rounded-lg text-xs text-slate-500 font-mono shadow-sm">Esc</kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2 bg-white/60 backdrop-blur-md">
          {allItems.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <div className="p-3 bg-white/50 rounded-full"><Command size={24} className="text-slate-400" /></div>
              <p className="font-medium">Ничего не найдено</p>
            </div>
          ) : (
            <>
              {filteredNav.length > 0 && (
                <div className="mb-2">
                  <div className="px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Навигация</div>
                  {filteredNav.map((item, idx) => {
                    const isActive = idx === selectedIndex;
                    return (
                      <div
                        key={item.label}
                        onClick={() => { onNavigate(item.view as ViewState); onClose(); }}
                        className={`px-4 py-3 mx-2 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-700 hover:bg-white/50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} />
                          <span className="font-bold">{item.label}</span>
                        </div>
                        {isActive && <ArrowRight size={18} className="opacity-80" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredActions.length > 0 && (
                <div className="mb-2">
                  <div className="px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Действия</div>
                  {filteredActions.map((item, idx) => {
                    const globalIdx = filteredNav.length + idx;
                    const isActive = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.label}
                        onClick={() => { 
                            // @ts-ignore
                            item.action(); 
                            onClose(); 
                        }}
                        className={`px-4 py-3 mx-2 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-700 hover:bg-white/50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={20} className={isActive ? 'text-white' : 'text-emerald-600'} />
                          <span className="font-bold">{item.label}</span>
                        </div>
                        {isActive && <span className="text-xs bg-white/20 px-2 py-1 rounded-lg text-white font-bold">Enter</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredDocs.length > 0 && (
                <div>
                  <div className="px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Документы</div>
                  {filteredDocs.map((doc, idx) => {
                    const globalIdx = filteredNav.length + filteredActions.length + idx;
                    const isActive = globalIdx === selectedIndex;
                    return (
                      <div
                        key={doc.id}
                        className={`px-4 py-3 mx-2 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-700 hover:bg-white/50'}`}
                      >
                         <div className="flex items-center gap-3">
                          <FileText size={20} className={isActive ? 'text-white' : 'text-slate-500'} />
                          <div>
                             <div className="font-bold">{doc.title}</div>
                             <div className={`text-xs font-medium ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>{doc.counterparty} • {new Date(doc.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        {isActive && <span className="text-xs bg-white/20 px-2 py-1 rounded-lg text-white font-bold">Enter</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="px-5 py-3 bg-white/40 border-t border-white/20 flex items-center justify-between text-xs text-slate-500 font-medium backdrop-blur-md">
          <div className="flex gap-4">
             <span><span className="font-bold bg-white/50 px-1 rounded border border-white/30">↑↓</span> для навигации</span>
             <span><span className="font-bold bg-white/50 px-1 rounded border border-white/30">Enter</span> для выбора</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            Sirius Intelligent Search
          </div>
        </div>
      </div>
    </div>
  );
};
