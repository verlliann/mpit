import React, { useState, useEffect } from 'react';
import { User, Shield, HardDrive, Bell, Key, Database, Globe, Save, Check, Moon, Sun } from 'lucide-react';
import { settingsService } from '../api/services/settings';
import { storageService } from '../api/services/storage';
import { useApi, useMutation } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { GLASS_STYLES } from '../constants';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'storage' | 'security'>('general');
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDenseMode, setIsDenseMode] = useState(false);

  useEffect(() => {
    // Mock initialization
    const savedTheme = localStorage.getItem('theme');
    setIsDarkMode(savedTheme === 'dark');
    const savedDensity = localStorage.getItem('denseMode');
    setIsDenseMode(savedDensity === 'true');
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    // Actual theme switching would happen in a context or layout wrapper
    if (newMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  };

  const toggleDenseMode = () => {
      const newMode = !isDenseMode;
      setIsDenseMode(newMode);
      localStorage.setItem('denseMode', String(newMode));
  };
  
  const { data: settings, loading: settingsLoading } = useApi(
    () => settingsService.getSettings(),
    { immediate: true }
  );
  
  const { data: storageInfo, loading: storageLoading } = useApi(
    () => storageService.getStorageInfo(),
    { immediate: true }
  );
  
  const { data: storageStats } = useApi(
    () => storageService.getStorageStats(),
    { immediate: true }
  );

  const updateSettingsMutation = useMutation(
    (data: any) => settingsService.updateSettings(data),
    {
      onSuccess: () => {
        alert('Настройки сохранены');
      }
    }
  );

  const updateProfileMutation = useMutation(
    (data: any) => settingsService.updateProfile(data),
    {
      onSuccess: () => {
        alert('Профиль обновлен');
      }
    }
  );

  const formatStorage = (gb: number) => {
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
    return `${gb.toFixed(1)} GB`;
  };

  const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
        activeTab === id 
          ? 'bg-white/80 text-indigo-600 shadow-md shadow-indigo-500/10' 
          : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="flex h-full p-6 gap-6">
      {/* Settings Sidebar */}
      <div className={`w-72 flex-shrink-0 p-6 rounded-3xl flex flex-col ${GLASS_STYLES.panel}`}>
        <h2 className="text-xl font-bold text-slate-800 mb-8 px-2 tracking-tight">Настройки</h2>
        <div className="space-y-2 flex-1">
          <div className="space-y-1">
            <TabButton id="general" icon={User} label="Профиль и Общие" />
            <TabButton id="storage" icon={HardDrive} label="Хранилище и S3" />
            <TabButton id="security" icon={Shield} label="Безопасность" />
          </div>
          
          <div className="pt-6 mt-6 border-t border-indigo-900/10 space-y-1">
             <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-white/40 transition-colors">
               <Bell size={18} /> Уведомления
             </button>
             <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-white/40 transition-colors">
               <Database size={18} /> Интеграции
             </button>
          </div>
        </div>
        
        <div className="mt-auto bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
           <div className="flex items-center gap-2 mb-2 text-indigo-900 font-bold text-sm">
             <Globe size={14} />
             <span>Sirius Cloud</span>
           </div>
           <p className="text-xs text-indigo-900/60">Версия 1.0.0 (Beta)</p>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto rounded-3xl relative">
        <div className="max-w-4xl mx-auto pb-24">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`p-8 rounded-3xl ${GLASS_STYLES.card}`}>
                <h3 className="text-lg font-bold text-slate-800 mb-6">Личные данные</h3>
                <div className="flex items-center gap-8 mb-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-indigo-500/30 ring-4 ring-white/50">
                    AA
                  </div>
                  <div>
                    <button className={`text-sm px-5 py-2.5 rounded-xl font-bold transition-all ${GLASS_STYLES.interactive} bg-white/50 border border-white/60 text-slate-700 shadow-sm`}>
                      Изменить фото
                    </button>
                    <p className="text-xs text-slate-400 mt-2 font-medium">JPG, GIF или PNG. Макс 1MB.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Имя</label>
                    <input 
                      type="text" 
                      defaultValue={user?.first_name || ''} 
                      className={`w-full rounded-xl py-2.5 px-4 outline-none transition-all ${GLASS_STYLES.input}`} 
                    />
                  </div>
                   <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Фамилия</label>
                    <input 
                      type="text" 
                      defaultValue={user?.last_name || ''} 
                      className={`w-full rounded-xl py-2.5 px-4 outline-none transition-all ${GLASS_STYLES.input}`} 
                    />
                  </div>
                   <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                    <input 
                      type="email" 
                      defaultValue={user?.email || ''} 
                      className={`w-full rounded-xl py-2.5 px-4 outline-none transition-all ${GLASS_STYLES.input}`} 
                    />
                  </div>
                </div>
              </div>

               <div className={`p-8 rounded-3xl ${GLASS_STYLES.card}`}>
                <h3 className="text-lg font-bold text-slate-800 mb-6">Настройки интерфейса</h3>
                <div className="flex items-center justify-between py-4 border-b border-indigo-900/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                        {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">Тёмная тема</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Переключить интерфейс в темный режим</p>
                    </div>
                  </div>
                  <div className="relative inline-block w-12 h-7 align-middle select-none transition duration-200 ease-in">
                    <input 
                        type="checkbox" 
                        name="toggle" 
                        id="toggle" 
                        className={`toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 top-1 left-1 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} 
                        checked={isDarkMode} 
                        onChange={toggleTheme}
                    />
                    <label 
                        htmlFor="toggle" 
                        className={`toggle-label block overflow-hidden h-7 rounded-full cursor-pointer transition-colors duration-200 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    ></label>
                  </div>
                </div>
                 <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Плотный список</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Уменьшить отступы в таблице документов</p>
                  </div>
                   <div className="relative inline-block w-12 h-7 align-middle select-none transition duration-200 ease-in">
                    <input 
                        type="checkbox" 
                        id="toggle-dense"
                        className={`toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 top-1 left-1 ${isDenseMode ? 'translate-x-5' : 'translate-x-0'}`} 
                        checked={isDenseMode} 
                        onChange={toggleDenseMode}
                    />
                     <label 
                        htmlFor="toggle-dense"
                        className={`block overflow-hidden h-7 rounded-full cursor-pointer transition-colors duration-200 ${isDenseMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                     ></label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Storage Tab */}
          {activeTab === 'storage' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className={`p-8 rounded-3xl ${GLASS_STYLES.card}`}>
                 <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
                   <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Globe size={20} /></div>
                   Статистика S3 Bucket
                 </h3>
                 
                 <div className="mb-10">
                   {storageLoading ? (
                     <div className="text-center text-slate-400 py-4">Загрузка данных хранилища...</div>
                   ) : storageInfo ? (
                     <>
                   <div className="flex justify-between text-sm mb-3">
                     <span className="font-bold text-slate-500">Всего использовано</span>
                         <span className="font-bold text-slate-900 bg-white/50 px-3 py-1 rounded-lg border border-white/50 shadow-sm">
                           {formatStorage(storageInfo.used_gb)} / {formatStorage(storageInfo.total_gb)}
                         </span>
                   </div>
                   <div className="w-full bg-slate-200/50 rounded-full h-4 overflow-hidden shadow-inner">
                         <div 
                           className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                           style={{ width: `${storageInfo.usage_percentage}%` }}
                         ></div>
                   </div>
                       <p className="text-xs text-slate-400 mt-3 font-mono bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">
                         {storageInfo.region} :: {storageInfo.bucket_name}
                       </p>
                     </>
                   ) : (
                     <div className="text-center text-slate-400 py-4">Нет данных</div>
                   )}
                 </div>

                 <div className="space-y-5">
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">По типам файлов</h4>
                   
                   {storageStats?.by_type && storageStats.by_type.length > 0 ? (
                     storageStats.by_type.map((item, index) => {
                       const totalSize = storageInfo?.used_gb || 1;
                       const percentage = (item.size_gb / totalSize) * 100;
                       const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500'];
                       
                       return (
                         <div key={item.type}>
                     <div className="flex justify-between text-xs mb-2 font-medium text-slate-600">
                             <span>{item.type}</span>
                             <span>{formatStorage(item.size_gb)} ({percentage.toFixed(1)}%)</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                             <div 
                               className={`${colors[index % colors.length]} h-2.5 rounded-full shadow-sm`} 
                               style={{ width: `${Math.min(percentage, 100)}%` }}
                             ></div>
                     </div>
                   </div>
                       );
                     })
                   ) : (
                     <div className="text-sm text-slate-400">Нет данных по типам файлов</div>
                   )}
                 </div>
               </div>

               <div className={`p-8 rounded-3xl ${GLASS_STYLES.card}`}>
                 <h3 className="text-lg font-bold text-slate-800 mb-4">Lifecycle Policy</h3>
                 <div className="p-5 bg-blue-50/60 border border-blue-100 rounded-2xl text-sm text-blue-900 mb-6 font-medium leading-relaxed">
                   Настроена автоматическая архивация документов старше 2 лет в класс хранения Glacier Deep Archive.
                 </div>
                 <div className="flex items-center gap-3 bg-white/40 p-4 rounded-xl border border-white/40">
                   <div className="bg-indigo-500 p-1 rounded-md text-white shadow-sm"><Check size={14} strokeWidth={3} /></div>
                   <span className="text-sm font-bold text-slate-700">Удалять файлы из корзины через 30 дней</span>
                 </div>
               </div>
            </div>
          )}

           {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`p-8 rounded-3xl ${GLASS_STYLES.card}`}>
                <h3 className="text-lg font-bold text-slate-800 mb-6">Доступ и ключи</h3>
                
                <div className="space-y-4">
                  <div className="p-5 bg-white/40 border border-white/50 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-sm">
                    <div>
                      <h5 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
                        <Key size={18} className="text-indigo-500" /> API Access Token
                      </h5>
                      <p className="text-xs text-slate-500 font-medium">Используется для интеграции с внешними системами</p>
                    </div>
                    <button className="text-sm text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">Пересоздать</button>
                  </div>

                  <div className="p-5 bg-white/40 border border-white/50 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-sm">
                     <div>
                      <h5 className="font-bold text-slate-800 mb-1">Двухфакторная аутентификация</h5>
                      <p className="text-xs text-slate-500 font-medium">Google Authenticator или SMS</p>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold shadow-sm border border-emerald-200">ВКЛЮЧЕНО</div>
                  </div>
                </div>
              </div>

               <div className={`p-8 rounded-3xl border border-rose-100 bg-rose-50/30 backdrop-blur-md`}>
                 <h3 className="text-lg font-bold text-rose-700 mb-4">Опасная зона</h3>
                 <p className="text-sm text-slate-600 mb-6 font-medium">Удаление организации приведет к безвозвратной потере всех документов и данных.</p>
                 <button className="px-6 py-3 bg-white text-rose-600 border border-rose-200 rounded-xl font-bold hover:bg-rose-50 transition-colors shadow-sm hover:shadow-md">
                   Удалить организацию
                 </button>
               </div>
            </div>
          )}

        </div>
        
        {/* Footer Actions */}
        <div className={`absolute bottom-6 right-8 px-2 py-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 transition-all transform duration-300 ${activeTab ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <button 
            onClick={() => {
              if (activeTab === 'general') {
                // Update profile logic
              } else if (activeTab === 'storage') {
                if (settings) {
                  updateSettingsMutation.mutate(settings);
                }
              }
            }}
            disabled={updateSettingsMutation.loading || updateProfileMutation.loading}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-3.5 rounded-xl shadow-lg hover:shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 font-bold disabled:opacity-50"
          >
            <Save size={18} /> Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
};