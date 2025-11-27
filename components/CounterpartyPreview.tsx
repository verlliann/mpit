import React, { useMemo } from 'react';
import { X, Building2, Phone, Mail, MapPin, FileText, ArrowUpRight, ShieldCheck, Clock } from 'lucide-react';
import { Counterparty, Document, DocumentType } from '../types';
import { MOCK_DOCUMENTS, DOC_ICONS, STATUS_COLORS, STATUS_LABELS, PRIORITY_STYLES, PRIORITY_LABELS } from '../constants';

interface CounterpartyPreviewProps {
  counterparty: Counterparty | null;
  onClose: () => void;
  onSelectDocument: (doc: Document) => void;
}

export const CounterpartyPreview: React.FC<CounterpartyPreviewProps> = ({ counterparty, onClose, onSelectDocument }) => {
  if (!counterparty) return null;

  // Filter documents related to this counterparty
  const relatedDocs = useMemo(() => {
    return MOCK_DOCUMENTS.filter(doc => doc.counterparty === counterparty.name);
  }, [counterparty]);

  return (
    <div className="w-[400px] bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-30 absolute right-0 top-0 bottom-0 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-primary shadow-sm">
             <Building2 size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">{counterparty.name}</h3>
            <p className="text-xs text-slate-500 mt-1 font-mono">ИНН {counterparty.inn}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-slate-200 rounded-full">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-200">
            <div className="bg-white p-4">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><ShieldCheck size={12}/> Рейтинг доверия</div>
                <div className={`text-lg font-bold ${counterparty.trustScore > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {counterparty.trustScore}/100
                </div>
            </div>
             <div className="bg-white p-4">
                <div className="text-xs text-slate-500 mb-1">Активные договоры</div>
                <div className="text-lg font-bold text-slate-800">
                    {counterparty.activeContracts}
                </div>
            </div>
        </div>

        <div className="p-6 space-y-8">
            {/* Contact Info */}
            <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Контакты</h4>
                <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                        <MapPin size={16} className="text-slate-400 mt-0.5" />
                        <span className="text-slate-700">{counterparty.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Mail size={16} className="text-slate-400" />
                        <a href={`mailto:${counterparty.email}`} className="text-primary hover:underline">{counterparty.email}</a>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Phone size={16} className="text-slate-400" />
                        <span className="text-slate-700">{counterparty.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Clock size={16} className="text-slate-400" />
                        <span className="text-slate-500 text-xs">Последний контакт: {new Date(counterparty.lastInteraction).toLocaleDateString()}</span>
                    </div>
                </div>
            </section>

            {/* Related Documents */}
            <section>
                 <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">История документов</h4>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{relatedDocs.length}</span>
                 </div>
                 
                 <div className="space-y-2">
                    {relatedDocs.length > 0 ? (
                        relatedDocs.map(doc => {
                            const IconComp = DOC_ICONS[doc.type as DocumentType] || DOC_ICONS.contract;
                            return (
                                <div 
                                    key={doc.id} 
                                    onClick={() => onSelectDocument(doc)}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all group"
                                >
                                    <div className="p-2 bg-white rounded border border-slate-100 text-slate-500 group-hover:text-primary">
                                        <IconComp size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-800 truncate">{doc.title}</div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            <span>{new Date(doc.date).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className={`font-medium ${STATUS_COLORS[doc.status].split(' ')[0]}`}>{STATUS_LABELS[doc.status]}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs">
                                        <span className={`px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[doc.priority]}`}>
                                            {PRIORITY_LABELS[doc.priority]}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                            Нет связанных документов
                        </div>
                    )}
                 </div>
            </section>

            {/* Actions */}
            <section>
                 <button className="w-full py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-sm">
                    <FileText size={16} /> Создать новый договор
                 </button>
                 <button className="w-full mt-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                    <ArrowUpRight size={16} /> Открыть карточку в 1С
                 </button>
            </section>
        </div>
      </div>
    </div>
  );
};