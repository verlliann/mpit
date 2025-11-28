import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { ArrowUpRight, TrendingUp, Users, FileCheck, Layers, Clock } from 'lucide-react';
import { analyticsService } from '../api/services/analytics';
import { useApi } from '../hooks/useApi';
import { GLASS_STYLES } from '../constants';

const MetricCard = ({ title, value, trend, isPositive, icon: Icon, color }: any) => (
  <div className={`p-6 rounded-2xl transition-all hover:scale-105 ${GLASS_STYLES.card}`}>
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-20 backdrop-blur-sm`}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          <ArrowUpRight size={12} className={isPositive ? '' : 'rotate-180'} />
          {trend}%
        </div>
      )}
    </div>
    <div className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{title}</div>
    <div className="text-3xl font-bold text-slate-800 tracking-tight">{value}</div>
  </div>
);

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#64748b'];

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
        <div className="flex gap-3">
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={`text-sm rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500 border-none outline-none ${GLASS_STYLES.input}`}
            >
               <option value="week">Эта неделя</option>
               <option value="month">Прошлый месяц</option>
            </select>
            <button className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${GLASS_STYLES.interactive} bg-white/40 border border-white/40 text-slate-700`}>
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
          color="bg-blue-500 text-blue-600" 
        />
        <MetricCard 
          title="Ср. время обработки" 
          value={metricsLoading ? "..." : formatTime(dashboard?.avg_processing_time_minutes || 0)} 
          trend={undefined}
          isPositive={true} 
          icon={Clock} 
          color="bg-purple-500 text-purple-600" 
        />
        <MetricCard 
          title="Обработано страниц" 
          value={metricsLoading ? "..." : (dashboard?.processed_pages || 0).toLocaleString()} 
          trend={undefined}
          isPositive={true} 
          icon={FileCheck} 
          color="bg-emerald-500 text-emerald-600" 
        />
        <MetricCard 
          title="Высокий приоритет" 
          value={metricsLoading ? "..." : (dashboard?.high_priority_count || 0).toString()} 
          trend={undefined}
          isPositive={true} 
          icon={Users} 
          color="bg-indigo-500 text-indigo-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workflow Chart */}
        <div className={`lg:col-span-2 p-6 rounded-2xl ${GLASS_STYLES.panel}`}>
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
             <TrendingUp size={20} className="text-indigo-500" />
             Пропускная способность
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workflow.length > 0 ? workflow : [{ name: 'Нет данных', incoming: 0, processed: 0 }]}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.2)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.2)'}}
                  contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="incoming" name="Поступило" fill="#64748B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="processed" name="Обработано" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Document Types Distribution */}
        <div className={`p-6 rounded-2xl flex flex-col ${GLASS_STYLES.panel}`}>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)'}} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};