import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { ArrowUpRight, TrendingUp, Users, FileCheck, Layers, Clock } from 'lucide-react';
import { analyticsService } from '../api/services/analytics';
import { useApi } from '../hooks/useApi';

const MetricCard = ({ title, value, trend, isPositive, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          <ArrowUpRight size={12} className={isPositive ? '' : 'rotate-180'} />
          {trend}%
        </div>
      )}
    </div>
    <div className="text-slate-500 text-sm font-medium mb-1">{title}</div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
  </div>
);

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#64748B'];

export const Analytics: React.FC = () => {
  const [period, setPeriod] = useState('week');
  
  const { data: metrics, loading: metricsLoading } = useApi(
    () => analyticsService.getMetrics({ period }),
    { immediate: true }
  );

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
  };

  const dashboard = metrics?.dashboard;
  const workflow = metrics?.workflow || [];
  const types = metrics?.types || [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Операционная аналитика</h2>
        <div className="flex gap-2">
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border-slate-200 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
            >
               <option value="week">Эта неделя</option>
               <option value="month">Прошлый месяц</option>
            </select>
            <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Экспорт отчета
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Всего документов" 
          value={metricsLoading ? "..." : (dashboard?.total_documents || 0).toLocaleString()} 
          trend={undefined}
          isPositive={true} 
          icon={Layers} 
          color="bg-blue-50 text-blue-600" 
        />
        <MetricCard 
          title="Ср. время обработки" 
          value={metricsLoading ? "..." : formatTime(dashboard?.avg_processing_time_minutes || 0)} 
          trend={undefined}
          isPositive={true} 
          icon={Clock} 
          color="bg-purple-50 text-purple-600" 
        />
        <MetricCard 
          title="Обработано страниц" 
          value={metricsLoading ? "..." : (dashboard?.processed_pages || 0).toLocaleString()} 
          trend={undefined}
          isPositive={true} 
          icon={FileCheck} 
          color="bg-emerald-50 text-emerald-600" 
        />
        <MetricCard 
          title="Высокий приоритет" 
          value={metricsLoading ? "..." : (dashboard?.high_priority_count || 0).toString()} 
          trend={undefined}
          isPositive={true} 
          icon={Users} 
          color="bg-indigo-50 text-indigo-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workflow Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
             <TrendingUp size={20} className="text-slate-400" />
             Пропускная способность
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workflow.length > 0 ? workflow : [{ name: 'Нет данных', incoming: 0, processed: 0 }]}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="incoming" name="Поступило" fill="#64748B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="processed" name="Обработано" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Document Types Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Распределение по типам</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={types.length > 0 ? types : [{ name: 'Нет данных', value: 0 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(types.length > 0 ? types : [{ name: 'Нет данных', value: 0 }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};