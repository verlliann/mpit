
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MoreVertical, ArrowUpDown, Star, Archive, Trash2, Grid, List, Filter, FileText, Layers, Eye } from 'lucide-react';
import { DOC_ICONS, STATUS_COLORS, STATUS_LABELS, getTagColor, PRIORITY_STYLES, PRIORITY_LABELS, GLASS_STYLES } from '../constants';
import { Document, DocumentType, ViewState, ViewMode } from '../types';
import { useDocuments, useDocumentMutations } from '../hooks/useDocuments';
import { documentsService } from '../api/services/documents';
import { useNotifications } from '../hooks/useNotifications';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DocumentLibraryProps {
  onSelectDocument: (doc: Document | null) => void;
  selectedDocumentId: string | null;
  currentView: ViewState;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ onSelectDocument, selectedDocumentId, currentView }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  // Build params based on current view
  const params = useMemo(() => {
    const baseParams: any = {
      page: currentPage,
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
  }, [currentView, searchQuery, currentPage]);

  const [refreshKey, setRefreshKey] = useState(0);
  const paramsWithRefresh = useMemo(() => ({ ...params, _refresh: refreshKey }), [params, refreshKey]);
  
  const { data: documentsData, loading, error } = useDocuments(paramsWithRefresh);
  const { bulkDelete, bulkArchive, toggleFavorite, isLoading: mutationsLoading } = useDocumentMutations({
    onSuccess: () => {
      setRefreshKey(prev => prev + 1);
      setSelectedIds(new Set());
    }
  });

  // Reset page when view or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentView, searchQuery]);
  const { success, error: notifyError } = useNotifications();

  const documents = documentsData?.items || [];

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(newSet());
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

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        const doc = documents.find(d => d.id === id);
        if (doc) {
          try {
            const blob = await documentsService.downloadDocument(id);
            const url = window.URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = doc.title || 'document';
            window.document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            window.document.body.removeChild(a);
            // Небольшая задержка между скачиваниями
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) {
            console.error(`Ошибка скачивания документа ${id}:`, err);
          }
        }
      }
      success('Документы скачаны', `Скачано ${ids.length} документ(ов)`);
    } catch (error: any) {
      notifyError('Ошибка скачивания', error.message || 'Не удалось скачать документы');
    }
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
    <div className="flex flex-col h-full bg-transparent">
      {/* Toolbar */}
      <div className={`mx-6 mt-2 mb-4 px-6 py-4 flex items-center justify-between sticky top-0 z-20 rounded-2xl ${GLASS_STYLES.panel}`}>
        <div className="flex items-center gap-4">
           <h2 className="text-xl font-bold text-slate-800 mr-2 tracking-tight">{getPageTitle()}</h2>
           <div className="h-6 w-[1px] bg-indigo-900/10"></div>

          <div className="flex items-center gap-2.5">
             <input 
               type="checkbox" 
               checked={selectedIds.size === documents.length && documents.length > 0}
               onChange={toggleAll}
               className="rounded border-indigo-200 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer bg-white/50" 
             />
             <span className="text-sm text-slate-600 font-medium">
               {selectedIds.size > 0 ? `Выбрано: ${selectedIds.size}` : 'Выбрать все'}
             </span>
          </div>
          {selectedIds.size > 0 && (
             <div className="flex items-center gap-2 animate-in fade-in duration-200 ml-2">
               <button 
                 onClick={handleBulkDownload}
                 disabled={mutationsLoading}
                 className={`px-3 py-1.5 rounded-lg text-sm text-slate-700 font-medium ${GLASS_STYLES.interactive} bg-white/40 border border-white/40 disabled:opacity-50`}
               >
                 Скачать
               </button>
               {currentView !== 'trash' && (
                  <button 
                    onClick={handleBulkArchive}
                    disabled={mutationsLoading}
                    className={`px-3 py-1.5 rounded-lg text-sm text-slate-700 font-medium ${GLASS_STYLES.interactive} bg-white/40 border border-white/40 disabled:opacity-50`}
                  >
                    В архив
                  </button>
               )}
               <button 
                 onClick={handleBulkDelete}
                 disabled={mutationsLoading}
                 className={`px-3 py-1.5 rounded-lg text-sm text-rose-600 font-medium hover:bg-rose-50 border border-rose-100 bg-white/40 disabled:opacity-50 transition-colors`}
               >
                  {currentView === 'trash' ? 'Удалить навсегда' : 'Удалить'}
               </button>
             </div>
          )}
        </div>

        <div className="flex items-center gap-2">
           <div className="flex bg-white/30 p-0.5 rounded-xl border border-white/40 backdrop-blur-sm">
             <button 
               onClick={() => setViewMode('list')}
               className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <List size={18} />
             </button>
             <button 
               onClick={() => setViewMode('grid')}
               className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Grid size={18} />
             </button>
           </div>
           <input
             type="text"
             placeholder="Поиск..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className={`px-4 py-2 text-sm rounded-xl outline-none w-64 ${GLASS_STYLES.input}`}
           />
           <button className={`p-2 text-slate-600 rounded-xl border border-white/40 ${GLASS_STYLES.interactive} bg-white/40`}>
             <Filter size={18} />
           </button>
        </div>
      </div>

      {currentView === 'trash' && (
        <div className="mx-6 mb-4 bg-rose-50/80 backdrop-blur-sm px-6 py-2.5 text-xs text-rose-700 border border-rose-100 rounded-xl flex items-center gap-2 font-medium">
          <Trash2 size={14} /> Объекты в корзине будут автоматически удалены через 30 дней.
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-20">
            <div className="p-6 bg-white/40 border border-white/50 shadow-sm rounded-full mb-4 animate-pulse backdrop-blur-sm">
              <FileText size={40} className="text-indigo-300" />
            </div>
            <p className="text-lg font-medium text-slate-600">Загрузка документов...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-rose-400 pb-20">
            <div className="p-6 bg-white/40 border border-rose-100 shadow-sm rounded-full mb-4 backdrop-blur-sm">
              <FileText size={40} className="text-rose-300" />
            </div>
            <p className="text-lg font-medium text-rose-600">Ошибка загрузки</p>
            <p className="text-sm text-rose-400 mt-1">{error}</p>
          </div>
        ) : documents.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-20">
               <div className="p-6 bg-white/40 border border-white/50 shadow-sm rounded-full mb-4 backdrop-blur-sm">
                 {currentView === 'favorites' ? <Star size={40} className="text-slate-300" /> : currentView === 'trash' ? <Trash2 size={40} className="text-slate-300" /> : <Archive size={40} className="text-slate-300" />}
               </div>
               <p className="text-lg font-medium text-slate-600">В этом разделе нет документов</p>
               <p className="text-sm text-slate-400 mt-1">Попробуйте изменить фильтры или загрузить новые</p>
           </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="w-12 px-4 py-2"></th>
                    <th className="w-12 px-4 py-2"></th>
                    <th className="px-4 py-2 text-xs font-bold text-indigo-900/50 uppercase tracking-wider cursor-pointer group">
                      <div className="flex items-center gap-1">Название <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div>
                    </th>
                    <th className="px-4 py-2 text-xs font-bold text-indigo-900/50 uppercase tracking-wider">Тип</th>
                    <th className="px-4 py-2 text-xs font-bold text-indigo-900/50 uppercase tracking-wider">Контрагент</th>
                    <th className="px-4 py-2 text-xs font-bold text-indigo-900/50 uppercase tracking-wider">Приоритет</th>
                    <th className="px-4 py-2 text-xs font-bold text-indigo-900/50 uppercase tracking-wider text-center">Дата</th>
                    <th className="px-4 py-2 text-xs font-bold text-indigo-900/50 uppercase tracking-wider">Статус</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {documents.map((doc) => {
                    const IconComp = DOC_ICONS[doc.type as DocumentType] || DOC_ICONS.contract;
                    const isSelected = selectedIds.has(doc.id);
                    const isActive = selectedDocumentId === doc.id;
                    const priorityStyle = PRIORITY_STYLES[doc.priority];
                    const priorityLabel = PRIORITY_LABELS[doc.priority];
                    
                    return (
                      <tr 
                        key={doc.id} 
                        className={`group transition-all duration-200 cursor-pointer hover:scale-[1.01] ${isActive ? 'bg-indigo-50/60 shadow-md ring-1 ring-indigo-200' : 'bg-white/40 hover:bg-white/60 shadow-sm hover:shadow-md'} ${isSelected ? 'bg-indigo-50/40' : ''} rounded-xl backdrop-blur-sm`}
                        onClick={() => onSelectDocument(doc)}
                      >
                        <td className="px-4 py-4 rounded-l-xl" onClick={(e) => { e.stopPropagation(); toggleSelection(doc.id); }}>
                           <input 
                             type="checkbox" 
                             checked={isSelected}
                             readOnly
                             className="rounded border-indigo-200 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer bg-white/50" 
                           />
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          <div className="p-2 bg-white/60 rounded-lg shadow-sm">
                             <IconComp size={20} strokeWidth={1.5} className="text-indigo-600" />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm leading-none">{doc.title}</span>
                                {doc.isFavorite && <Star size={12} className="text-amber-400 fill-amber-400" />}
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="text-xs text-slate-500">{doc.size}</span>
                               {doc.tags && doc.tags.map(tag => (
                                  <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getTagColor(tag)} bg-opacity-50`}>
                                    {tag}
                                  </span>
                               ))}
                             </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 capitalize font-medium">
                          {doc.type}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 font-medium">
                          {doc.counterparty || '—'}
                        </td>
                        <td className="px-4 py-4 text-sm">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${priorityStyle}`}>
                              {priorityLabel}
                           </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 text-center font-mono opacity-80">
                          {new Date(doc.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${STATUS_COLORS[doc.status]}`}>
                            {STATUS_LABELS[doc.status]}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right relative rounded-r-xl" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDocument(doc);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50/50 transition-colors"
                              title="Предпросмотр"
                            >
                              <Eye size={16} />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white/50 transition-all">
                              <MoreVertical size={16} />
                            </button>
                          </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {documents.map((doc) => {
                  const IconComp = DOC_ICONS[doc.type as DocumentType] || DOC_ICONS.contract;
                  const isSelected = selectedIds.has(doc.id);
                  const isActive = selectedDocumentId === doc.id;
                  const priorityStyle = PRIORITY_STYLES[doc.priority];

                  return (
                    <div 
                      key={doc.id}
                      onClick={() => onSelectDocument(doc)}
                      className={`group relative flex flex-col overflow-hidden transition-all duration-300 cursor-pointer rounded-2xl ${isActive ? 'ring-2 ring-indigo-500 shadow-xl scale-[1.02] bg-white/80' : 'hover:scale-105 hover:shadow-xl bg-white/60 hover:bg-white/80'} ${GLASS_STYLES.card}`}
                    >
                      {/* Grid Item Header */}
                      <div className="p-5 flex items-start justify-between border-b border-white/20 bg-white/20">
                         <div className={`p-3 rounded-xl shadow-sm ${isActive ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-500 group-hover:text-indigo-600 transition-colors'}`}>
                           <IconComp size={28} strokeWidth={1.5} />
                         </div>
                         <input 
                             type="checkbox" 
                             checked={isSelected}
                             onClick={(e) => { e.stopPropagation(); toggleSelection(doc.id); }}
                             className={`rounded border-indigo-200 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer bg-white/50 ${isSelected || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} 
                             readOnly
                           />
                      </div>

                      {/* Grid Item Body */}
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-800 text-base mb-1 line-clamp-2 leading-snug" title={doc.title}>
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4 font-medium">{doc.counterparty || '—'}</p>
                        
                        <div className="mt-auto flex items-center justify-between">
                           <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wide ${priorityStyle}`}>
                              {PRIORITY_LABELS[doc.priority]}
                           </span>
                           <span className={`inline-block w-2.5 h-2.5 rounded-full ring-2 ring-white ${STATUS_COLORS[doc.status].replace('bg-', 'bg-').split(' ')[1].replace('text-', 'bg-')}`}></span>
                        </div>
                      </div>

                      {/* Grid Item Footer */}
                      <div className="px-5 py-3 bg-white/30 border-t border-white/20 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                         <span className="flex items-center gap-1"><FileText size={12} /> {doc.pages || 0} стр.</span>
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
        <div className={`mx-6 mb-4 rounded-xl px-6 py-3 flex items-center justify-between text-sm text-slate-600 shrink-0 ${GLASS_STYLES.panel}`}>
          <div>Показано 1-{documents.length} из {documentsData.total}</div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className={`px-3 py-1 rounded border border-white/40 hover:bg-white/50 disabled:opacity-50 transition-colors ${GLASS_STYLES.interactive}`} 
              disabled={documentsData.page <= 1}
            >
              Пред
            </button>
            <div className="px-2 font-bold text-indigo-900">{documentsData.page} / {documentsData.pages}</div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(documentsData.pages, prev + 1))}
              className={`px-3 py-1 rounded border border-white/40 hover:bg-white/50 disabled:opacity-50 transition-colors ${GLASS_STYLES.interactive}`} 
              disabled={documentsData.page >= documentsData.pages}
            >
              След
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDocument && (
        <DocumentPreviewModal
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          documentId={previewDocument.id}
          documentTitle={previewDocument.title}
          documentType={previewDocument.type}
          documentPath={previewDocument.path}
        />
      )}
    </div>
  );
};
