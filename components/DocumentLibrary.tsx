
import React, { useState, useMemo, useCallback } from 'react';
import { MoreVertical, ArrowUpDown, Star, Archive, Trash2, Grid, List, Filter, FileText, Layers } from 'lucide-react';
import { DOC_ICONS, STATUS_COLORS, STATUS_LABELS, getTagColor, PRIORITY_STYLES, PRIORITY_LABELS } from '../constants';
import { Document, DocumentType, ViewState, ViewMode } from '../types';
import { useDocuments, useDocumentMutations } from '../hooks/useDocuments';

interface DocumentLibraryProps {
  onSelectDocument: (doc: Document | null) => void;
  selectedDocumentId: string | null;
  currentView: ViewState;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ onSelectDocument, selectedDocumentId, currentView }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Build params based on current view
  const params = useMemo(() => {
    const baseParams: any = {
      page: 1,
      limit: 100,
    };
    
    if (currentView === 'favorites') {
      baseParams.is_favorite = true;
      baseParams.is_deleted = false;
    } else if (currentView === 'archive') {
      baseParams.is_archived = true;
      baseParams.is_deleted = false;
    } else if (currentView === 'trash') {
      baseParams.is_deleted = true;
    } else {
      baseParams.is_deleted = false;
      baseParams.is_archived = false;
    }
    
    if (searchQuery) {
      baseParams.search = searchQuery;
    }
    
    return baseParams;
  }, [currentView, searchQuery]);

  const [refreshKey, setRefreshKey] = useState(0);
  const paramsWithRefresh = useMemo(() => ({ ...params, _refresh: refreshKey }), [params, refreshKey]);
  
  const { data: documentsData, loading, error } = useDocuments(paramsWithRefresh);
  const { bulkDelete, bulkArchive, toggleFavorite, isLoading: mutationsLoading } = useDocumentMutations({
    onSuccess: () => {
      setRefreshKey(prev => prev + 1);
      setSelectedIds(new Set());
    }
  });

  const documents = documentsData?.items || [];

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Удалить ${selectedIds.size} документ(ов)?`)) {
      await bulkDelete(Array.from(selectedIds));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    await bulkArchive(Array.from(selectedIds));
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'favorites': return 'Избранное';
      case 'archive': return 'Архив документов';
      case 'trash': return 'Корзина';
      default: return 'Все документы';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10 backdrop-blur-xl bg-white/80">
        <div className="flex items-center gap-4">
           <h2 className="text-xl font-bold text-slate-800 mr-2 tracking-tight">{getPageTitle()}</h2>
           <div className="h-6 w-[1px] bg-slate-200"></div>

          <div className="flex items-center gap-2.5">
             <input 
               type="checkbox" 
               checked={selectedIds.size === documents.length && documents.length > 0}
               onChange={toggleAll}
               className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer" 
             />
             <span className="text-sm text-slate-500 font-medium">
               {selectedIds.size > 0 ? `Выбрано: ${selectedIds.size}` : 'Выбрать все'}
             </span>
          </div>
          {selectedIds.size > 0 && (
             <div className="flex items-center gap-2 animate-in fade-in duration-200 ml-2">
               <button className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors">Скачать</button>
               {currentView !== 'trash' && (
                  <button 
                    onClick={handleBulkArchive}
                    disabled={mutationsLoading}
                    className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
                  >
                    В архив
                  </button>
               )}
               <button 
                 onClick={handleBulkDelete}
                 disabled={mutationsLoading}
                 className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-sm hover:bg-red-50 text-red-600 hover:text-red-700 hover:border-red-200 font-medium transition-colors disabled:opacity-50"
               >
                  {currentView === 'trash' ? 'Удалить навсегда' : 'Удалить'}
               </button>
             </div>
          )}
        </div>

        <div className="flex items-center gap-2">
           <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
             <button 
               onClick={() => setViewMode('list')}
               className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <List size={16} />
             </button>
             <button 
               onClick={() => setViewMode('grid')}
               className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <Grid size={16} />
             </button>
           </div>
           <input
             type="text"
             placeholder="Поиск..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-primary focus:border-primary"
           />
           <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200">
             <Filter size={18} />
           </button>
        </div>
      </div>

      {currentView === 'trash' && (
        <div className="bg-red-50 px-6 py-2.5 text-xs text-red-600 border-b border-red-100 flex items-center gap-2 font-medium">
          <Trash2 size={14} /> Объекты в корзине будут автоматически удалены через 30 дней.
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-slate-50/50">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-20">
            <div className="p-6 bg-white border border-slate-100 shadow-sm rounded-full mb-4 animate-pulse">
              <FileText size={40} className="text-slate-300" />
            </div>
            <p className="text-lg font-medium text-slate-600">Загрузка документов...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-red-400 pb-20">
            <div className="p-6 bg-white border border-red-100 shadow-sm rounded-full mb-4">
              <FileText size={40} className="text-red-300" />
            </div>
            <p className="text-lg font-medium text-red-600">Ошибка загрузки</p>
            <p className="text-sm text-red-400 mt-1">{error}</p>
          </div>
        ) : documents.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-20">
               <div className="p-6 bg-white border border-slate-100 shadow-sm rounded-full mb-4">
                 {currentView === 'favorites' ? <Star size={40} className="text-slate-300" /> : currentView === 'trash' ? <Trash2 size={40} className="text-slate-300" /> : <Archive size={40} className="text-slate-300" />}
               </div>
               <p className="text-lg font-medium text-slate-600">В этом разделе нет документов</p>
               <p className="text-sm text-slate-400 mt-1">Попробуйте изменить фильтры или загрузить новые</p>
           </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <table className="w-full text-left border-collapse bg-white">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="w-12 px-4 py-3 border-b border-slate-200"></th>
                    <th className="w-12 px-4 py-3 border-b border-slate-200"></th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors group">
                      <div className="flex items-center gap-1">Название <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div>
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Тип</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Контрагент</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Приоритет</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Дата</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Статус</th>
                    <th className="px-4 py-3 border-b border-slate-200"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => {
                    const IconComp = DOC_ICONS[doc.type as DocumentType] || DOC_ICONS.contract;
                    const isSelected = selectedIds.has(doc.id);
                    const isActive = selectedDocumentId === doc.id;
                    const priorityStyle = PRIORITY_STYLES[doc.priority];
                    const priorityLabel = PRIORITY_LABELS[doc.priority];
                    
                    return (
                      <tr 
                        key={doc.id} 
                        className={`group transition-all duration-150 cursor-pointer ${isActive ? 'bg-blue-50/60' : 'hover:bg-slate-50'} ${isSelected ? 'bg-blue-50/40' : ''}`}
                        onClick={() => onSelectDocument(doc)}
                      >
                        <td className="px-4 py-3.5" onClick={(e) => { e.stopPropagation(); toggleSelection(doc.id); }}>
                           <input 
                             type="checkbox" 
                             checked={isSelected}
                             readOnly
                             className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer" 
                           />
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          <IconComp size={20} strokeWidth={1.5} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800 text-sm leading-none">{doc.title}</span>
                                {doc.isFavorite && <Star size={12} className="text-amber-400 fill-amber-400" />}
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="text-xs text-slate-400">{doc.size}</span>
                               {doc.tags && doc.tags.map(tag => (
                                  <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border ${getTagColor(tag)}`}>
                                    {tag}
                                  </span>
                               ))}
                             </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600 capitalize">
                          {doc.type}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">
                          {doc.counterparty || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${priorityStyle}`}>
                              {priorityLabel}
                           </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600 text-center font-mono">
                          {new Date(doc.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[doc.status]}`}>
                            {STATUS_LABELS[doc.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right relative">
                          <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 opacity-0 group-hover:opacity-100 transition-all">
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Visual padding rows */}
                   {documents.length > 0 && Array.from({ length: Math.max(0, 5 - documents.length) }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-16">
                         <td colSpan={9} className="border-b border-transparent"></td>
                      </tr>
                   ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {documents.map((doc) => {
                  const IconComp = DOC_ICONS[doc.type as DocumentType] || DOC_ICONS.contract;
                  const isSelected = selectedIds.has(doc.id);
                  const isActive = selectedDocumentId === doc.id;
                  const priorityStyle = PRIORITY_STYLES[doc.priority];

                  return (
                    <div 
                      key={doc.id}
                      onClick={() => onSelectDocument(doc)}
                      className={`group relative bg-white rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col ${isActive ? 'ring-2 ring-primary border-transparent shadow-md' : 'border-slate-200 hover:border-blue-300 hover:shadow-lg'}`}
                    >
                      {/* Grid Item Header */}
                      <div className="p-4 flex items-start justify-between border-b border-slate-50 bg-slate-50/30">
                         <div className={`p-2.5 rounded-lg ${isActive ? 'bg-primary text-white' : 'bg-white border border-slate-100 text-slate-500 group-hover:text-primary transition-colors'}`}>
                           <IconComp size={24} strokeWidth={1.5} />
                         </div>
                         <input 
                             type="checkbox" 
                             checked={isSelected}
                             onClick={(e) => { e.stopPropagation(); toggleSelection(doc.id); }}
                             className={`rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer ${isSelected || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} 
                             readOnly
                           />
                      </div>

                      {/* Grid Item Body */}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2 leading-snug" title={doc.title}>
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-500 mb-3">{doc.counterparty || '—'}</p>
                        
                        <div className="mt-auto flex items-center justify-between">
                           <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${priorityStyle}`}>
                              {PRIORITY_LABELS[doc.priority]}
                           </span>
                           <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[doc.status].replace('bg-', 'bg-').split(' ')[1].replace('text-', 'bg-')}`}></span>
                        </div>
                      </div>

                      {/* Grid Item Footer */}
                      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                         <span className="flex items-center gap-1"><FileText size={10} /> {doc.pages || 0} стр.</span>
                         <span>{doc.size || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Pagination Footer */}
      {documents.length > 0 && documentsData && (
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-white text-sm text-slate-500 shrink-0">
          <div>Показано 1-{documents.length} из {documentsData.total}</div>
          <div className="flex items-center gap-2">
            <button 
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors" 
              disabled={documentsData.page <= 1}
            >
              Пред
            </button>
            <div className="px-2 font-medium text-slate-700">{documentsData.page} / {documentsData.pages}</div>
            <button 
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors" 
              disabled={documentsData.page >= documentsData.pages}
            >
              След
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
