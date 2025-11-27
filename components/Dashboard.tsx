
import React from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, HardDrive, Clock, FileText, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_DATA, MOCK_DOCUMENTS, DOC_ICONS, STATUS_COLORS, STATUS_LABELS, PRIORITY_STYLES, PRIORITY_LABELS } from '../constants';
import { DocumentType } from '../types';

const MetricCard = ({ title, value, subtext, icon: IconComponent, colorClass }: any) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
        <p className="text-xs text-slate-400 mt-2">{subtext}</p>
      </div>
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <IconComponent className={colorClass.replace('bg-', 'text-')} size={24} />
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Высокий приоритет" 
          value="7" 
          subtext="Требуют немедленной реакции" 
          icon={Zap} 
          colorClass="bg-red-500 text-red-500" 
        />
        <MetricCard 
          title="Ср. время обработки" 
          value="12 мин" 
          subtext="-15% от прошлого месяца" 
          icon={Clock} 
          colorClass="bg-blue-500 text-blue-500" 
        />
        <MetricCard 
          title="Обработано страниц" 
          value="4,890" 
          subtext="Автоматически распознано" 
          icon={FileText} 
          colorClass="bg-success text-success" 
        />
        <MetricCard 
          title="Хранилище" 
          value="247 GB" 
          subtext="24% использовано" 
          icon={HardDrive} 
          colorClass="bg-slate-600 text-slate-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-lg font-semibold text-slate-800">Поток документов</h2>
             <select className="text-sm border-slate-200 rounded-md focus:ring-primary focus:border-primary">
               <option>За 30 дней</option>
               <option>За неделю</option>
             </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{color: '#1e293b'}}
                />
                <Area type="monotone" dataKey="docs" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorDocs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h2 className="text-lg font-semibold text-slate-800 mb-4">Быстрые действия</h2>
             <div className="space-y-3">
               <button className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md">
                 <UploadCloud size={18} /> Загрузить документы
               </button>
               <button className="w-full py-3 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 font-medium">
                 <CheckCircle size={18} /> Массовая проверка
               </button>
               <button className="w-full py-3 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 font-medium">
                 <HardDrive size={18} /> Отчет по архиву
               </button>
             </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-md text-white">
            <h3 className="font-semibold mb-2">AI Ассистент</h3>
            <p className="text-sm text-slate-300 mb-4">3 документа отмечены как "Высокий приоритет" и требуют утверждения сегодня.</p>
            <button className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors border border-white/20">
              Показать список
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Последние документы</h2>
          <button className="text-sm text-primary hover:underline">Все документы</button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3 font-medium">Документ</th>
              <th className="px-6 py-3 font-medium">Контрагент</th>
              <th className="px-6 py-3 font-medium">Дата</th>
              <th className="px-6 py-3 font-medium">Приоритет</th>
              <th className="px-6 py-3 font-medium text-right">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_DOCUMENTS.slice(0, 5).map((doc) => {
              const IconComp = DOC_ICONS[doc.type as DocumentType] || DOC_ICONS.contract;
              const statusColor = STATUS_COLORS[doc.status];
              const statusLabel = STATUS_LABELS[doc.status];
              const priorityStyle = PRIORITY_STYLES[doc.priority];
              const priorityLabel = PRIORITY_LABELS[doc.priority];

              return (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded text-slate-500">
                        <IconComp size={16} />
                      </div>
                      <span className="text-sm font-medium text-slate-800">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">{doc.counterparty}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{new Date(doc.date).toLocaleDateString()}</td>
                  <td className="px-6 py-3">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${priorityStyle}`}>
                        {priorityLabel}
                     </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
