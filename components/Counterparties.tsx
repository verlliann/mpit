import React from 'react';
import { MOCK_COUNTERPARTIES } from '../constants';
import { Building2, Phone, Mail, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Counterparty } from '../types';

interface CounterpartiesProps {
  onSelectCounterparty: (cp: Counterparty) => void;
}

export const Counterparties: React.FC<CounterpartiesProps> = ({ onSelectCounterparty }) => {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 py-4 border-b border-slate-200">
         <h2 className="text-lg font-bold text-slate-800">Контрагенты</h2>
      </div>
      
      <div className="overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {MOCK_COUNTERPARTIES.map(cp => (
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
                <div className="text-slate-500">Документов: <span className="text-slate-800 font-medium">{cp.docCount}</span></div>
                <div className="flex gap-1">
                   {cp.type.map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 uppercase">{t}</span>
                   ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};