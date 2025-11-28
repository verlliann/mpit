import React, { useState } from 'react';
import { Building2, Phone, Mail, ShieldCheck, AlertTriangle, Plus, X } from 'lucide-react';
import { Counterparty } from '../types';
import { counterpartiesService } from '../api/services/counterparties';
import { useApi, useMutation } from '../hooks/useApi';
import { useNotifications } from '../hooks/useNotifications';

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
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 py-4 border-b border-slate-200">
         <div className="flex items-center justify-between mb-3">
           <h2 className="text-lg font-bold text-slate-800">Контрагенты</h2>
           <button
             onClick={() => setIsCreateModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
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
           className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-primary focus:border-primary"
         />
      </div>
      
      <div className="overflow-auto p-6">
        {loading ? (
          <div className="text-center text-slate-400 py-12">Загрузка контрагентов...</div>
        ) : error ? (
          <div className="text-center text-red-400 py-12">Ошибка загрузки: {error}</div>
        ) : counterparties.length === 0 ? (
          <div className="text-center text-slate-400 py-12">Контрагенты не найдены</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {counterparties.map(cp => (
            <div 
              key={cp.id} 
              onClick={() => onSelectCounterparty(cp)}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-all hover:border-blue-200 group cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button className="text-xs bg-blue-50 text-primary px-2 py-1 rounded">Подробнее</button>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Building2 size={24} />
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 mb-1">Рейтинг доверия</div>
                  <div className={`inline-flex items-center gap-1 font-medium text-sm px-2 py-0.5 rounded-full ${cp.trustScore >= 80 ? 'bg-emerald-50 text-emerald-700' : cp.trustScore >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                    {cp.trustScore >= 80 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                    {cp.trustScore}%
                  </div>
                </div>
              </div>
              
              <h3 className="font-bold text-slate-800 text-lg mb-1">{cp.name}</h3>
              <div className="text-xs text-slate-500 font-mono mb-4">ИНН {cp.inn}</div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                   <Mail size={14} className="text-slate-400" /> {cp.email}
                </div>
                 <div className="flex items-center gap-2">
                   <Phone size={14} className="text-slate-400" /> {cp.phone}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="text-slate-500">Документов: <span className="text-slate-800 font-medium">{cp.docCount || 0}</span></div>
                <div className="flex gap-1">
                   {(cp.type || []).map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 uppercase">{t}</span>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Добавить контрагента</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="ООО «Компания»"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ИНН <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.inn}
                    onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="1234567890"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    КПП
                  </label>
                  <input
                    type="text"
                    value={formData.kpp}
                    onChange={(e) => setFormData({ ...formData, kpp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="123456789"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Адрес
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="г. Москва, ул. Примерная, д. 1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="info@company.ru"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Создание...' : 'Создать контрагента'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
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