
import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, ArrowRight, LayoutDashboard, Files, Users, PieChart, Settings } from 'lucide-react';
import { MOCK_DOCUMENTS } from '../constants';
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
    { label: 'Перейти в Дашборд', view: 'dashboard' as ViewState, icon: LayoutDashboard },
    { label: 'Все документы', view: 'library' as ViewState, icon: Files },
    { label: 'Аналитика', view: 'analytics' as ViewState, icon: PieChart },
    { label: 'Контрагенты', view: 'counterparties' as ViewState, icon: Users },
    { label: 'Настройки', view: 'settings' as ViewState, icon: Settings },
  ];

  const filteredNav = navigationItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDocs = MOCK_DOCUMENTS.filter(doc => 
    doc.title.toLowerCase().includes(query.toLowerCase()) || 
    doc.counterparty.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const allItems = [...filteredNav, ...filteredDocs];

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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 text-lg outline-none"
            placeholder="Что вы ищете? (Документы, разделы, настройки...)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="hidden sm:flex items-center gap-1">
             <kbd className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 font-mono">Esc</kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {allItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">
              Ничего не найдено
            </div>
          ) : (
            <>
              {filteredNav.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Навигация</div>
                  {filteredNav.map((item, idx) => {
                    const isActive = idx === selectedIndex;
                    return (
                      <div
                        key={item.label}
                        onClick={() => { onNavigate(item.view); onClose(); }}
                        className={`px-4 py-3 mx-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {isActive && <ArrowRight size={16} className="opacity-70" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredDocs.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Документы</div>
                  {filteredDocs.map((doc, idx) => {
                    const globalIdx = filteredNav.length + idx;
                    const isActive = globalIdx === selectedIndex;
                    return (
                      <div
                        key={doc.id}
                        className={`px-4 py-3 mx-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                         <div className="flex items-center gap-3">
                          <FileText size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                          <div>
                             <div className="font-medium">{doc.title}</div>
                             <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{doc.counterparty} • {new Date(doc.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        {isActive && <span className="text-xs bg-white/20 px-2 py-1 rounded text-white">Enter</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex gap-4">
             <span><span className="font-bold">↑↓</span> для навигации</span>
             <span><span className="font-bold">Enter</span> для выбора</span>
          </div>
          <div>
            Sirius Intelligent Search
          </div>
        </div>
      </div>
    </div>
  );
};
