
import React from 'react';
import { 
  LayoutDashboard, 
  Files, 
  Upload, 
  Users, 
  FolderOpen, 
  Star, 
  Trash2,
  Sparkles,
  Settings,
  PieChart
} from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  activeView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onChangeView }) => {
  const NavItem = ({ view, icon: Icon, label, count }: { view: ViewState, icon: any, label: string, count?: number }) => (
    <button 
      onClick={() => onChangeView(view)}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 ${
        activeView === view 
          ? 'bg-blue-50 text-primary font-semibold shadow-sm ring-1 ring-blue-100' 
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={activeView === view ? 'text-primary' : 'text-slate-400'} />
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${activeView === view ? 'bg-white text-primary shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col h-[calc(100vh-64px)] overflow-y-auto">
      <div className="p-4 space-y-8">
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Меню</h3>
          <NavItem view="dashboard" icon={LayoutDashboard} label="Обзор" />
          <NavItem view="library" icon={Files} label="Документы" count={1247} />
          <NavItem view="analytics" icon={PieChart} label="Аналитика" />
          <NavItem view="upload" icon={Upload} label="Загрузка" />
          <NavItem view="counterparties" icon={Users} label="Контрагенты" />
          <div className="my-3 mx-3 border-t border-slate-100"></div>
          <NavItem view="chat" icon={Sparkles} label="AI Помощник" />
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Папки</h3>
          <NavItem view="favorites" icon={Star} label="Избранное" />
          <NavItem view="archive" icon={FolderOpen} label="Архив" />
          <NavItem view="trash" icon={Trash2} label="Корзина" />
        </div>

         <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Система</h3>
          <NavItem view="settings" icon={Settings} label="Настройки" />
        </div>

        {activeView === 'library' && (
          <div className="border-t border-slate-100 pt-6 animate-in fade-in slide-in-from-left-2">
            <div className="flex items-center justify-between px-3 mb-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Фильтры</h3>
                <button className="text-xs text-primary hover:underline font-medium">Сброс</button>
            </div>
            
            <div className="px-3 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-2 block">Статус</label>
                <div className="space-y-2">
                  {['Обработан', 'На проверке', 'Ошибка'].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" />
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

               <div>
                <label className="text-xs font-medium text-slate-700 mb-2 block">Период</label>
                <select className="w-full text-sm border-slate-200 rounded-lg py-2 focus:border-primary focus:ring-primary bg-slate-50">
                    <option>Все время</option>
                    <option>Этот месяц</option>
                    <option>Прошлый год</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
