
import React, { useEffect, useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, HardDrive, Clock, FileText, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DOC_ICONS, STATUS_COLORS, STATUS_LABELS, PRIORITY_STYLES, PRIORITY_LABELS, GLASS_STYLES } from '../constants';
import { DocumentType } from '../types';
import { analyticsService } from '../api/services/analytics';
import { documentsService } from '../api/services/documents';
import { useApi } from '../hooks/useApi';
import { ViewState } from '../types';

interface DashboardProps {
  onNavigate?: (view: ViewState) => void;
}

const MetricCard = ({ title, value, subtext, icon: IconComponent, colorClass }: any) => (
  <div className={`p-5 rounded-2xl transition-all duration-300 hover:scale-105 group ${GLASS_STYLES.card}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 tracking-tight group-hover:text-indigo-900 transition-colors">{value}</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">{subtext}</p>
      </div>
      <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20 backdrop-blur-sm`}>
        <IconComponent className={colorClass.replace('bg-', 'text-')} size={24} />
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  // Check if token exists before making requests
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
  
  const { data: metrics, loading: metricsLoading } = useApi(
    () => analyticsService.getDashboardMetrics(),
    { immediate: hasToken }
  );
  
  const { data: documentsData, loading: documentsLoading } = useApi(
    () => documentsService.getDocuments({ limit: 5, page: 1 }),
    { immediate: hasToken }
  );
  
  const { data: flowData, loading: flowLoading } = useApi(
    () => analyticsService.getDocumentsFlow({ days: 30 }),
    { immediate: hasToken }
  );

  const formatStorage = (gb: number) => {
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
    return `${gb.toFixed(0)} GB`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
  };

  const highPriorityCount = metrics?.high_priority_count || 0;
  const avgTime = metrics?.avg_processing_time_minutes || 0;
  const processedPages = metrics?.processed_pages || 0;
  const storageUsed = metrics?.storage_used_gb || 0;
  const storageTotal = metrics?.storage_total_gb || 10;
  const storagePercent = storageTotal > 0 ? Math.round((storageUsed / storageTotal) * 100) : 0;

  const chartData = flowData?.map(item => ({
    name: item.name,
    docs: item.docs
  })) || [];

  const recentDocuments = documentsData?.items || [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="ВСЕГО ДОКУМЕНТОВ" 
          value={metricsLoading ? "..." : (metrics?.total_documents || 0).toLocaleString()} 
          subtext="Всего документов в системе" 
          icon={FileText} 
          colorClass="bg-blue-500 text-blue-600" 
        />
        <MetricCard 
          title="Высокий приоритет" 
          value={metricsLoading ? "..." : highPriorityCount.toString()} 
          subtext="Требуют немедленной реакции" 
          icon={Zap} 
          colorClass="bg-rose-500 text-rose-600" 
        />
        <MetricCard 
          title="Ср. время обработки" 
          value={metricsLoading ? "..." : formatTime(avgTime)} 
          subtext="Среднее время обработки" 
          icon={Clock} 
          colorClass="bg-indigo-500 text-indigo-600" 
        />
        <MetricCard 
          title="Обработано страниц" 
          value={metricsLoading ? "..." : processedPages.toLocaleString()} 
          subtext="Автоматически распознано" 
          icon={FileText} 
          colorClass="bg-emerald-500 text-emerald-600" 
        />
      </div>
      
      {/* Storage Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Хранилище" 
          value={metricsLoading ? "..." : formatStorage(storageUsed)} 
          subtext={`${storagePercent}% использовано`} 
          icon={HardDrive} 
          colorClass="bg-slate-500 text-slate-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className={`lg:col-span-2 p-6 rounded-2xl ${GLASS_STYLES.panel}`}>
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-lg font-bold text-slate-800">Поток документов</h2>
             <select className={`text-sm border-none rounded-lg focus:ring-2 focus:ring-indigo-500 py-1 px-3 text-slate-600 font-medium outline-none ${GLASS_STYLES.input}`}>
               <option>За 30 дней</option>
               <option>За неделю</option>
             </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : [{ name: 'Нет данных', docs: 0 }]}>
                <defs>
                  <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.2)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'}}
                  itemStyle={{color: '#1e293b', fontWeight: 600}}
                  cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="docs" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorDocs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl ${GLASS_STYLES.panel}`}>
             <h2 className="text-lg font-bold text-slate-800 mb-4">Быстрые действия</h2>
             <div className="space-y-3">
               <button 
                 onClick={() => onNavigate?.('upload')}
                 className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 font-semibold active:scale-95"
               >
                 <UploadCloud size={20} /> Загрузить документы
               </button>
               <button 
                 onClick={() => onNavigate?.('library')}
                 className={`w-full py-3 px-4 rounded-xl text-slate-700 font-medium flex items-center justify-center gap-2 border border-white/40 ${GLASS_STYLES.interactive} bg-white/40`}
               >
                 <CheckCircle size={18} className="text-emerald-600" /> Массовая проверка
               </button>
               <button 
                 onClick={() => onNavigate?.('archive')}
                 className={`w-full py-3 px-4 rounded-xl text-slate-700 font-medium flex items-center justify-center gap-2 border border-white/40 ${GLASS_STYLES.interactive} bg-white/40`}
               >
                 <HardDrive size={18} className="text-slate-500" /> Отчет по архиву
               </button>
             </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-indigo-950 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-700 group-hover:bg-indigo-500/30"></div>
            <div className="relative z-10">
                <h3 className="font-bold mb-2 text-lg flex items-center gap-2"><Zap size={18} className="text-yellow-400" /> AI Ассистент</h3>
                <p className="text-sm text-slate-300 mb-5 leading-relaxed">3 документа отмечены как "Высокий приоритет" и требуют вашего внимания.</p>
                <button 
                  onClick={() => onNavigate?.('library')}
                  className="text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/10 backdrop-blur-md"
                >
                  Показать список
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className={`rounded-2xl overflow-hidden ${GLASS_STYLES.panel}`}>
        <div className="px-6 py-5 border-b border-slate-200/30 flex justify-between items-center bg-white/30">
          <h2 className="text-lg font-bold text-slate-800">Последние документы</h2>
          <button 
            onClick={() => onNavigate?.('library')}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Все документы
          </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2 px-4">
            <thead className="text-indigo-900/50 text-xs uppercase font-bold tracking-wider">
                <tr>
                <th className="px-6 py-3">Документ</th>
                <th className="px-6 py-3">Контрагент</th>
                <th className="px-6 py-3">Дата</th>
                <th className="px-6 py-3">Приоритет</th>
                <th className="px-6 py-3 text-right">Статус</th>
                </tr>
            </thead>
            <tbody className="text-slate-700">
                {documentsLoading ? (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Загрузка документов...
                    </td>
                </tr>
                ) : recentDocuments.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Нет документов
                    </td>
                </tr>
                ) : (
                recentDocuments.map((doc) => {
                const IconComp = DOC_ICONS[doc.type as DocumentType] || DOC_ICONS.contract;
                const statusColor = STATUS_COLORS[doc.status];
                const statusLabel = STATUS_LABELS[doc.status];
                const priorityStyle = PRIORITY_STYLES[doc.priority];
                const priorityLabel = PRIORITY_LABELS[doc.priority];

                return (
                    <tr key={doc.id} className={`transition-all duration-200 hover:scale-[1.01] ${GLASS_STYLES.interactive} bg-white/40 rounded-xl shadow-sm`}>
                    <td className="px-6 py-4 rounded-l-xl">
                        <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white rounded-lg text-indigo-500 shadow-sm">
                            <IconComp size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-800">{doc.title}</span>
                        </div>
                    </td>
                        <td className="px-6 py-4 text-sm font-medium">{doc.counterparty || '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium opacity-80">{new Date(doc.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wide ${priorityStyle}`}>
                            {priorityLabel}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right rounded-r-xl">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${statusColor}`}>
                        {statusLabel}
                        </span>
                    </td>
                    </tr>
                );
                })
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
