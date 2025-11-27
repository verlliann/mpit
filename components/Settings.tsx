import React, { useState } from 'react';
import { User, Shield, HardDrive, Bell, Key, Database, Globe, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'storage' | 'security'>('general');

  const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id 
          ? 'bg-blue-50 text-primary' 
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="flex h-full bg-slate-50">
      {/* Settings Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 p-6 flex-shrink-0">
        <h2 className="text-lg font-bold text-slate-800 mb-6 px-2">Настройки</h2>
        <div className="space-y-1">
          <TabButton id="general" icon={User} label="Профиль и Общие" />
          <TabButton id="storage" icon={HardDrive} label="Хранилище и S3" />
          <TabButton id="security" icon={Shield} label="Безопасность" />
          <div className="pt-4 mt-4 border-t border-slate-100">
             <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
               <Bell size={18} /> Уведомления
             </button>
             <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
               <Database size={18} /> Интеграции
             </button>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Личные данные</h3>
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                    AA
                  </div>
                  <div>
                    <button className="text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                      Изменить фото
                    </button>
                    <p className="text-xs text-slate-400 mt-2">JPG, GIF или PNG. Макс 1MB.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Имя</label>
                    <input type="text" defaultValue="Алексей" className="w-full rounded-lg border-slate-200 text-sm focus:ring-primary focus:border-primary" />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Фамилия</label>
                    <input type="text" defaultValue="Алексеев" className="w-full rounded-lg border-slate-200 text-sm focus:ring-primary focus:border-primary" />
                  </div>
                   <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" defaultValue="alex@sirius-dms.com" className="w-full rounded-lg border-slate-200 text-sm focus:ring-primary focus:border-primary" />
                  </div>
                </div>
              </div>

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Настройки интерфейса</h3>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Тёмная тема</p>
                    <p className="text-xs text-slate-500">Переключить интерфейс в темный режим</p>
                  </div>
                  <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer translate-x-1" checked={false} readOnly />
                    <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-slate-300 cursor-pointer"></label>
                  </div>
                </div>
                 <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Плотный список</p>
                    <p className="text-xs text-slate-500">Уменьшить отступы в таблице документов</p>
                  </div>
                   <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer translate-x-5" checked readOnly />
                     <div className="block overflow-hidden h-6 rounded-full bg-primary cursor-pointer"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Storage Tab */}
          {activeTab === 'storage' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                   <Globe size={20} className="text-slate-400" /> Статистика S3 Bucket
                 </h3>
                 
                 <div className="mb-8">
                   <div className="flex justify-between text-sm mb-2">
                     <span className="font-medium text-slate-700">Всего использовано</span>
                     <span className="font-bold text-slate-900">247.3 GB / 1 TB</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                     <div className="bg-primary h-3 rounded-full" style={{ width: '24.7%' }}></div>
                   </div>
                   <p className="text-xs text-slate-400 mt-2">Amazon S3 • eu-central-1 • sirius-docs-bucket</p>
                 </div>

                 <div className="space-y-4">
                   <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">По типам файлов</h4>
                   
                   <div>
                     <div className="flex justify-between text-xs mb-1">
                       <span>Счета и Акты</span>
                       <span>89.2 GB (36%)</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-2">
                       <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '36%' }}></div>
                     </div>
                   </div>

                    <div>
                     <div className="flex justify-between text-xs mb-1">
                       <span>Договоры</span>
                       <span>67.4 GB (27%)</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-2">
                       <div className="bg-blue-500 h-2 rounded-full" style={{ width: '27%' }}></div>
                     </div>
                   </div>

                    <div>
                     <div className="flex justify-between text-xs mb-1">
                       <span>Сканы (Изображения)</span>
                       <span>28.6 GB (12%)</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-2">
                       <div className="bg-orange-400 h-2 rounded-full" style={{ width: '12%' }}></div>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="text-lg font-semibold text-slate-800 mb-4">Lifecycle Policy</h3>
                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 mb-4">
                   Настроена автоматическая архивация документов старше 2 лет в класс хранения Glacier Deep Archive.
                 </div>
                 <div className="flex items-center gap-2">
                   <input type="checkbox" checked className="rounded border-slate-300 text-primary h-4 w-4" readOnly />
                   <span className="text-sm text-slate-700">Удалять файлы из корзины через 30 дней</span>
                 </div>
               </div>
            </div>
          )}

           {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Доступ и ключи</h3>
                
                <div className="space-y-4">
                  <div className="p-4 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-slate-800 flex items-center gap-2">
                        <Key size={16} className="text-slate-400" /> API Access Token
                      </h5>
                      <p className="text-xs text-slate-500 mt-1">Используется для интеграции с внешними системами</p>
                    </div>
                    <button className="text-sm text-primary font-medium hover:underline">Пересоздать</button>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-lg flex items-center justify-between">
                     <div>
                      <h5 className="font-medium text-slate-800">Двухфакторная аутентификация</h5>
                      <p className="text-xs text-slate-500 mt-1">Google Authenticator или SMS</p>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">ВКЛЮЧЕНО</div>
                  </div>
                </div>
              </div>

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="text-lg font-semibold text-slate-800 mb-4 text-red-600">Опасная зона</h3>
                 <p className="text-sm text-slate-600 mb-4">Удаление организации приведет к безвозвратной потере всех документов и данных.</p>
                 <button className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors">
                   Удалить организацию
                 </button>
               </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="absolute bottom-6 right-8">
        <button className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95 font-medium">
          <Save size={18} /> Сохранить изменения
        </button>
      </div>
    </div>
  );
};