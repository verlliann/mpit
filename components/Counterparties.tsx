import React, { useState } from 'react';
import { Building2, Phone, Mail, ShieldCheck, AlertTriangle, Plus, X } from 'lucide-react';
import { Counterparty } from '../types';
import { counterpartiesService } from '../api/services/counterparties';
import { useApi, useMutation } from '../hooks/useApi';
import { useNotifications } from '../hooks/useNotifications';
import { GLASS_STYLES } from '../constants';

interface CounterpartiesProps {
  onSelectCounterparty: (cp: Counterparty) => void;
}

export const Counterparties: React.FC<CounterpartiesProps> = ({ onSelectCounterparty }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    inn: '',
    kpp: '',
    address: '',
    email: '',
    phone: ''
  });
  const { success, error: notifyError } = useNotifications();
  
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
  
  const { data, loading, error, execute: refreshList } = useApi(
    () => counterpartiesService.getCounterparties({ search: searchQuery || undefined }),
    { immediate: hasToken }
  );

  const counterparties = data?.items || [];
  
  const { mutate: createCounterparty, loading: creating } = useMutation(
    (data: any) => counterpartiesService.createCounterparty(data),
    {
      onSuccess: () => {
        success('Контрагент создан', 'Контрагент успешно добавлен в систему');
        setIsCreateModalOpen(false);
        setFormData({ name: '', inn: '', kpp: '', address: '', email: '', phone: '' });
        refreshList();
      },
      onError: (err: string) => {
        notifyError('Ошибка создания', err);
      }
    }
  );
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.inn) {
      notifyError('Ошибка', 'Заполните обязательные поля: Название и ИНН');
      return;
    }
    createCounterparty({
      name: formData.name,
      inn: formData.inn,
      kpp: formData.kpp || undefined,
      address: formData.address || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined
    });
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className={`mx-6 mt-2 mb-4 px-6 py-4 rounded-2xl ${GLASS_STYLES.panel}`}>
         <div className="flex items-center justify-between mb-4">
           <h2 className="text-xl font-bold text-slate-800 tracking-tight">Контрагенты</h2>
           <button
             onClick={() => setIsCreateModalOpen(true)}
             className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all font-bold text-sm active:scale-95"
           >
             <Plus size={18} />
             Добавить контрагента
           </button>
         </div>
         <input
           type="text"
           placeholder="Поиск контрагентов..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className={`w-full px-4 py-3 text-sm rounded-xl outline-none transition-all ${GLASS_STYLES.input}`}
         />
      </div>
      
      <div className="overflow-auto px-6 pb-6">
        {loading ? (
          <div className="text-center text-slate-400 py-12 animate-pulse">Загрузка контрагентов...</div>
        ) : error ? (
          <div className="text-center text-rose-400 py-12">Ошибка загрузки: {error}</div>
        ) : counterparties.length === 0 ? (
          <div className="text-center text-slate-400 py-12">Контрагенты не найдены</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {counterparties.map(cp => (
            <div 
              key={cp.id} 
              onClick={() => onSelectCounterparty(cp)}
              className={`rounded-2xl p-6 transition-all cursor-pointer relative overflow-hidden group hover:scale-[1.02] ${GLASS_STYLES.card}`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold">Подробнее</button>
              </div>

              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 bg-white/60 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Building2 size={28} strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Рейтинг доверия</div>
                  <div className={`inline-flex items-center gap-1.5 font-bold text-sm px-3 py-1 rounded-full ${cp.trustScore >= 80 ? 'bg-emerald-50 text-emerald-700' : cp.trustScore >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                    {cp.trustScore >= 80 ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
                    {cp.trustScore}%
                  </div>
                </div>
              </div>
              
              <h3 className="font-bold text-slate-800 text-xl mb-1">{cp.name}</h3>
              <div className="text-xs text-slate-500 font-mono mb-5 bg-slate-50/50 px-2 py-1 rounded-md inline-block">ИНН {cp.inn}</div>

              <div className="space-y-2.5 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                   <div className="p-1.5 bg-white/50 rounded-lg text-slate-400"><Mail size={14} /></div> {cp.email}
                </div>
                 <div className="flex items-center gap-3">
                   <div className="p-1.5 bg-white/50 rounded-lg text-slate-400"><Phone size={14} /></div> {cp.phone}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/50 flex items-center justify-between text-xs">
                <div className="text-slate-500 font-medium">Документов: <span className="text-slate-800 font-bold text-sm ml-1">{cp.docCount || 0}</span></div>
                <div className="flex gap-1.5">
                   {(cp.type || []).map(t => (
                      <span key={t} className="px-2 py-1 bg-white/50 rounded-md text-[10px] text-slate-500 font-bold uppercase tracking-wide border border-slate-100">{t}</span>
                   ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
      
      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-indigo-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${GLASS_STYLES.modal}`}>
            <div className="sticky top-0 bg-white/50 backdrop-blur-md border-b border-white/20 px-8 py-5 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-slate-800">Добавить контрагента</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 hover:bg-white/50 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
              >
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white/40">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Название <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl outline-none ${GLASS_STYLES.input}`}
                  placeholder="ООО «Компания»"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    ИНН <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.inn}
                    onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl outline-none ${GLASS_STYLES.input}`}
                    placeholder="1234567890"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    КПП
                  </label>
                  <input
                    type="text"
                    value={formData.kpp}
                    onChange={(e) => setFormData({ ...formData, kpp: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl outline-none ${GLASS_STYLES.input}`}
                    placeholder="123456789"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl outline-none ${GLASS_STYLES.input}`}
                  placeholder="г. Москва, ул. Примерная, д. 1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl outline-none ${GLASS_STYLES.input}`}
                    placeholder="info@company.ru"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl outline-none ${GLASS_STYLES.input}`}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 pt-6 border-t border-slate-200/50 mt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {creating ? 'Создание...' : 'Создать контрагента'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`px-6 py-3.5 rounded-xl text-slate-700 font-bold transition-all ${GLASS_STYLES.interactive} bg-white/50`}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};