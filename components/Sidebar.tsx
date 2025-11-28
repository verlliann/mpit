
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
  PieChart,
  HardDrive,
  Cloud
} from 'lucide-react';
import { ViewState } from '../types';
import { GLASS_STYLES } from '../constants';
import { analyticsService } from '../api/services/analytics';
import { useApi } from '../hooks/useApi';

interface SidebarProps {
  activeView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onChangeView }) => {
  // Get document count from API
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
  const { data: metrics } = useApi(
    () => analyticsService.getDashboardMetrics(),
    { immediate: hasToken }
  );
  const documentCount = metrics?.total_documents || 0;
  const storageUsed = metrics?.storage_used_gb || 0;
  const storageTotal = metrics?.storage_total_gb || 10; // Default 10GB
  const storagePercent = Math.min(100, Math.round((storageUsed / storageTotal) * 100));

  const NavItem = ({ view, icon: Icon, label, count }: { view: ViewState, icon: any, label: string, count?: number }) => (
    <button 
      onClick={() => onChangeView(view)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm mb-1 transition-all duration-200 relative group overflow-hidden ${
        activeView === view 
          ? 'bg-white/50 shadow-inner text-indigo-950 font-semibold' 
          : 'text-slate-700 hover:bg-white/30 hover:text-indigo-900'
      }`}
    >
      {/* Glow Indicator for active item */}
      {activeView === view && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
      )}
      
      <div className="flex items-center gap-3 ml-2 z-10">
        <Icon size={20} className={`transition-colors duration-200 ${activeView === view ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-500'}`} />
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            activeView === view 
            ? 'bg-indigo-100/80 text-indigo-700 shadow-sm' 
            : 'bg-white/30 text-slate-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <aside className={`w-72 flex-shrink-0 flex flex-col overflow-y-auto rounded-3xl ${GLASS_STYLES.panel}`}>
      <div className="p-5 space-y-8">
        <div>
          <h3 className="text-xs font-bold text-indigo-900/50 uppercase tracking-widest mb-4 px-4">Меню</h3>
          <NavItem view="dashboard" icon={LayoutDashboard} label="Обзор" />
          <NavItem view="library" icon={Files} label="Документы" count={documentCount} />
          <NavItem view="analytics" icon={PieChart} label="Аналитика" />
          <NavItem view="upload" icon={Upload} label="Загрузка" />
          <NavItem view="counterparties" icon={Users} label="Контрагенты" />
          
          <div className="my-4 mx-4 border-t border-indigo-900/10"></div>
          
          <NavItem view="chat" icon={Sparkles} label="AI Помощник" />
        </div>

        <div>
          <h3 className="text-xs font-bold text-indigo-900/50 uppercase tracking-widest mb-4 px-4">Папки</h3>
          <NavItem view="favorites" icon={Star} label="Избранное" />
          <NavItem view="archive" icon={FolderOpen} label="Архив" />
          <NavItem view="trash" icon={Trash2} label="Корзина" />
        </div>

         <div>
          <h3 className="text-xs font-bold text-indigo-900/50 uppercase tracking-widest mb-4 px-4">Система</h3>
          <NavItem view="settings" icon={Settings} label="Настройки" />
        </div>

        {/* Storage Widget */}
        <div className="mt-auto mx-4 mb-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
              <Cloud size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-900">Хранилище</p>
              <p className="text-[10px] text-indigo-900/60 font-medium">{storageUsed.toFixed(1)} GB из {storageTotal} GB</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-indigo-200/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${storagePercent}%` }}
            ></div>
          </div>
          <button className="w-full mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50 py-1.5 rounded-lg transition-colors text-center">
            Увеличить объем
          </button>
        </div>

        {activeView === 'library' && (
          <div className="border-t border-indigo-900/10 pt-6 animate-in fade-in slide-in-from-left-2">
            <div className="flex items-center justify-between px-4 mb-4">
                <h3 className="text-xs font-bold text-indigo-900/50 uppercase tracking-widest">Фильтры</h3>
                <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">Сброс</button>
            </div>
            
            <div className="px-4 space-y-5">
              <div>
                <label className="text-xs font-semibold text-indigo-900/70 mb-2 block">Статус</label>
                <div className="space-y-2">
                  {['Обработан', 'На проверке', 'Ошибка'].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="rounded border-indigo-200 text-indigo-600 focus:ring-indigo-500 bg-white/50 h-4 w-4" />
                      <span className="text-sm text-slate-700 group-hover:text-indigo-900 transition-colors">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

               <div>
                <label className="text-xs font-semibold text-indigo-900/70 mb-2 block">Период</label>
                <select className={`w-full text-sm border-indigo-200 rounded-xl py-2.5 px-3 focus:border-indigo-400 focus:ring-indigo-400 outline-none transition-all ${GLASS_STYLES.input}`}>
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
