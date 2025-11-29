
import React, { useState, useEffect } from 'react';
import { X, Download, Edit, Trash2, Eye, Calendar, User, FileText, HardDrive, History, Save, RotateCcw, Tag, Plus, Zap, Layers, Share2, CheckCircle, XCircle, Clock, Building, AlignLeft } from 'lucide-react';
import { Document, DocumentType, DocumentStatus, PriorityLevel, DocumentHistory } from '../types';
import { DOC_ICONS, STATUS_COLORS, STATUS_LABELS, getTagColor, PRIORITY_LABELS, PRIORITY_STYLES, GLASS_STYLES } from '../constants';
import { documentsService } from '../api/services/documents';
import { useMutation } from '../hooks/useApi';
import { useNotifications } from '../hooks/useNotifications';

interface DocumentPreviewProps {
  document: Document | null;
  onClose: () => void;
  onUpdate?: (updatedDoc: Document) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editedDoc, setEditedDoc] = useState<Document | null>(null);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const { success, error: notifyError } = useNotifications();

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => documentsService.updateDocument(id, data),
    {
      onSuccess: (updatedDoc) => {
        if (onUpdate) {
          onUpdate(updatedDoc);
        }
        setIsEditing(false);
      }
    }
  );

  useEffect(() => {
    setEditedDoc(document);
    setIsEditing(false);
    setIsAddingTag(false);
    setNewTag('');
    setActiveTab('info');
  }, [document]);

  if (!document || !editedDoc) return null;

  const IconComp = DOC_ICONS[document.type as DocumentType] || DOC_ICONS.contract;

  const handleSave = async () => {
    if (!editedDoc || !document) return;
    
    const updateData: any = {};
    if (editedDoc.title !== document.title) updateData.title = editedDoc.title;
    if (editedDoc.description !== document.description) updateData.description = editedDoc.description;
    if (editedDoc.priority !== document.priority) updateData.priority = editedDoc.priority;
    if (editedDoc.status !== document.status) updateData.status = editedDoc.status;
    if (editedDoc.tags !== document.tags) updateData.tags = editedDoc.tags;
    if (editedDoc.isFavorite !== document.isFavorite) updateData.is_favorite = editedDoc.isFavorite;
    
    if (Object.keys(updateData).length > 0) {
      await updateMutation.mutate({ id: document.id, data: updateData });
    } else {
    setIsEditing(false);
    }
  };

  const handleWorkflowAction = async (action: 'approve' | 'reject') => {
    if (!document) return;
    
    const newStatus = action === 'approve' ? 'processed' : 'error';
    await updateMutation.mutate({ 
      id: document.id, 
      data: { status: newStatus } 
    });
  };

  const handleCancel = () => {
    setEditedDoc(document);
    setIsEditing(false);
    setIsAddingTag(false);
  };

  const handleChange = (field: keyof Document, value: any) => {
    setEditedDoc(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const addTag = () => {
    if (newTag.trim() && editedDoc) {
      const currentTags = editedDoc.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        handleChange('tags', [...currentTags, newTag.trim()]);
      }
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (editedDoc && editedDoc.tags) {
       handleChange('tags', editedDoc.tags.filter(t => t !== tagToRemove));
    }
  };

  const copyLink = () => {
    if (document) {
      const url = `${window.location.origin}/documents/${document.id}`;
      navigator.clipboard.writeText(url).then(() => {
        success('Ссылка скопирована', 'Ссылка на документ скопирована в буфер обмена');
      }).catch(() => {
        notifyError('Ошибка', 'Не удалось скопировать ссылку');
      });
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    try {
      const blob = await documentsService.downloadDocument(document.id);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      success('Документ скачан', 'Файл успешно загружен');
    } catch (error: any) {
      notifyError('Ошибка скачивания', error.message || 'Не удалось скачать документ');
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    if (!confirm(`Удалить документ "${document.title}"?`)) return;
    
    try {
      await documentsService.deleteDocument(document.id);
      success('Документ удален', 'Документ перемещен в корзину');
      if (onUpdate) {
        onUpdate({ ...document, isDeleted: true });
      }
      onClose();
    } catch (error: any) {
      notifyError('Ошибка удаления', error.message || 'Не удалось удалить документ');
    }
  };

  return (
    <>
      <div className="absolute inset-0 bg-indigo-900/20 backdrop-blur-sm z-10 transition-opacity duration-300" onClick={onClose}></div>
      <div className={`w-[450px] flex flex-col shadow-2xl z-20 absolute right-0 top-2 bottom-2 m-2 rounded-2xl animate-in slide-in-from-right duration-300 border-l border-white/20 ${GLASS_STYLES.modal}`}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/20 bg-white/30 backdrop-blur-md rounded-t-2xl">
          <div className="flex items-start justify-between mb-4">
             <div className="flex items-start gap-4 flex-1 pr-4">
                <div className="p-3 bg-white/60 border border-white/40 rounded-xl shadow-sm mt-0.5 text-indigo-600 backdrop-blur-sm">
                   <IconComp size={28} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editedDoc.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className={`w-full text-sm font-bold text-slate-800 border-none rounded-lg px-2 py-1 mb-1 ${GLASS_STYLES.input}`}
                    />
                  ) : (
                     <h3 className="font-bold text-slate-800 text-lg leading-snug break-words">{document.title}</h3>
                  )}
                  <p className="text-xs text-slate-500 capitalize font-medium flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-white/40 rounded-md border border-white/20">{document.type}</span> 
                    <span>{document.size}</span>
                  </p>
                </div>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 hover:bg-white/40 rounded-xl">
               <X size={20} />
             </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-8 text-sm border-b border-indigo-900/10 -mb-5 mt-4">
             <button 
               onClick={() => setActiveTab('info')}
               className={`pb-3 font-bold transition-colors relative ${activeTab === 'info' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}
             >
               Информация
               {activeTab === 'info' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full shadow-[0_0_10px_rgba(79,70,229,0.6)]"></span>}
             </button>
             <button 
               onClick={() => setActiveTab('history')}
               className={`pb-3 font-bold transition-colors relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}
             >
               История
               {activeTab === 'history' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full shadow-[0_0_10px_rgba(79,70,229,0.6)]"></span>}
             </button>
          </div>
        </div>

        {/* Main Actions Bar */}
        {!isEditing && (
          <div className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-white/20 bg-white/20">
            <button 
              onClick={handleDownload}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-slate-600 transition-all group ${GLASS_STYLES.interactive}`} 
              title="Скачать"
            >
              <Download size={20} className="group-hover:text-indigo-600 transition-colors" /> <span className="text-[10px] font-medium">Скачать</span>
            </button>
             <button 
              onClick={copyLink} 
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-slate-600 transition-all group ${GLASS_STYLES.interactive}`} 
              title="Поделиться"
            >
              <Share2 size={20} className="group-hover:text-indigo-600 transition-colors" /> <span className="text-[10px] font-medium">Ссылка</span>
            </button>
            <button 
              onClick={() => setIsEditing(true)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-slate-600 transition-all group ${GLASS_STYLES.interactive}`}
               title="Редактировать"
            >
              <Edit size={20} className="group-hover:text-indigo-600 transition-colors" /> <span className="text-[10px] font-medium">Правка</span>
            </button>
            <button 
              onClick={handleDelete}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-rose-600 transition-all hover:bg-rose-50 border border-transparent hover:border-rose-100`} 
              title="Удалить"
            >
              <Trash2 size={20} /> <span className="text-[10px] font-medium">Удалить</span>
            </button>
          </div>
        )}

        {/* Edit Mode Save/Cancel */}
        {isEditing && (
           <div className="flex gap-3 px-6 py-4 border-b border-white/20 bg-indigo-50/30">
              <button 
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
              >
                <Save size={16} /> Сохранить
              </button>
              <button 
                onClick={handleCancel}
                className={`px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-white/60 transition-colors shadow-sm bg-white/40`}
              >
                <RotateCcw size={16} />
              </button>
           </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white/40 rounded-b-2xl scroll-smooth">
          
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Status Workflow Action */}
              {editedDoc.status === 'review' && !isEditing && (
                <div className="p-5 bg-amber-50/80 border border-amber-100 rounded-2xl shadow-sm">
                   <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                     <Clock size={18} className="text-amber-600" /> Требуется согласование
                   </h4>
                   <div className="flex gap-3">
                     <button 
                       onClick={() => handleWorkflowAction('approve')}
                       className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
                     >
                       <CheckCircle size={16} /> Согласовать
                     </button>
                     <button 
                       onClick={() => handleWorkflowAction('reject')}
                       className="flex-1 bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                     >
                       <XCircle size={16} /> Отклонить
                     </button>
                   </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-indigo-900/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlignLeft size={14} /> Описание / Заметки
                </label>
                {isEditing ? (
                  <textarea
                    value={editedDoc.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className={`w-full text-sm rounded-xl min-h-[100px] p-3 ${GLASS_STYLES.input}`}
                    placeholder="Добавьте описание документа..."
                  />
                ) : (
                  <div className="text-sm text-slate-700 bg-white/60 p-4 rounded-xl border border-white/50 leading-relaxed shadow-sm backdrop-blur-sm break-words overflow-wrap-anywhere">
                    {editedDoc.description || <span className="text-slate-400 italic">Описание отсутствует</span>}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-indigo-900/50 uppercase tracking-widest flex items-center gap-2">
                    <Tag size={14} /> Теги
                  </label>
                  {(isEditing || isAddingTag) && !isAddingTag && (
                    <button 
                      onClick={() => setIsAddingTag(true)} 
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Plus size={12} /> Добавить
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {editedDoc.tags && editedDoc.tags.map(tag => (
                    <div key={tag} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-sm ${getTagColor(tag)} bg-opacity-80 backdrop-blur-sm`}>
                      {tag}
                      {isEditing && (
                        <button onClick={() => removeTag(tag)} className="hover:text-red-600 transition-colors ml-1">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {isAddingTag && (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200 bg-white/80 p-1 rounded-lg border border-indigo-200 shadow-sm">
                      <input 
                        type="text" 
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                        autoFocus
                        placeholder="Тег..."
                        className="w-24 text-xs px-2 py-1 border-none bg-transparent focus:outline-none font-medium"
                      />
                      <button onClick={addTag} className="text-emerald-600 hover:bg-emerald-50 rounded p-0.5"><Plus size={14} /></button>
                      <button onClick={() => setIsAddingTag(false)} className="text-slate-400 hover:bg-slate-100 rounded p-0.5"><X size={14} /></button>
                    </div>
                  )}
                  
                  {(!editedDoc.tags || editedDoc.tags.length === 0) && !isAddingTag && (
                    <span className="text-xs text-slate-400 italic bg-slate-50/50 px-3 py-1 rounded-lg">Нет тегов</span>
                  )}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-indigo-900/10 to-transparent"></div>

              {/* Metadata Fields */}
              <div className="space-y-5">
                 {/* Department */}
                 <div className="group">
                    <label className="text-xs text-slate-500 mb-1.5 block flex items-center gap-1.5 font-medium"><Building size={14} /> Департамент</label>
                    {isEditing ? (
                       <select 
                         value={editedDoc.department} 
                         onChange={(e) => handleChange('department', e.target.value)}
                         className={`w-full text-sm py-2 rounded-xl ${GLASS_STYLES.input}`}
                       >
                          <option>Юридический</option>
                          <option>Бухгалтерия</option>
                          <option>HR</option>
                          <option>Продажи</option>
                          <option>Администрация</option>
                          <option>Архив</option>
                       </select>
                    ) : (
                       <div className="text-sm font-semibold text-slate-800 bg-white/40 px-3 py-2 rounded-lg border border-white/30 inline-block">{editedDoc.department}</div>
                    )}
                 </div>

                 {/* Priority */}
                 <div className="group">
                    <label className="text-xs text-slate-500 mb-1.5 block flex items-center gap-1.5 font-medium"><Zap size={14} /> Приоритет</label>
                    {isEditing ? (
                      <div className="flex gap-2">
                         {(['high', 'medium', 'low'] as PriorityLevel[]).map(p => (
                            <button 
                              key={p}
                              onClick={() => handleChange('priority', p)}
                              className={`flex-1 text-xs py-2 rounded-xl border font-medium transition-all ${editedDoc.priority === p ? PRIORITY_STYLES[p] + ' ring-2 ring-offset-1 shadow-sm' : 'border-slate-200 text-slate-500 bg-slate-50/50 hover:bg-white'}`}
                            >
                              {PRIORITY_LABELS[p]}
                            </button>
                         ))}
                      </div>
                    ) : (
                       <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border shadow-sm ${PRIORITY_STYLES[document.priority]}`}>
                          {PRIORITY_LABELS[document.priority]}
                       </span>
                    )}
                 </div>

                  {/* Status */}
                 <div className="group">
                    <label className="text-xs text-slate-500 mb-1.5 block font-medium">Статус</label>
                    {isEditing ? (
                      <select 
                        value={editedDoc.status}
                        onChange={(e) => handleChange('status', e.target.value as DocumentStatus)}
                        className={`w-full text-sm rounded-xl py-2 ${GLASS_STYLES.input}`}
                      >
                        <option value="processed">Обработан</option>
                        <option value="processing">В обработке</option>
                        <option value="review">На проверке</option>
                        <option value="error">Ошибка</option>
                      </select>
                    ) : (
                       <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${STATUS_COLORS[document.status]}`}>
                          {STATUS_LABELS[document.status]}
                       </span>
                    )}
                  </div>

                 <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block flex items-center gap-1.5 font-medium"><Calendar size={14} /> Дата</label>
                      {isEditing ? (
                        <input 
                          type="date" 
                          value={editedDoc.date}
                          onChange={(e) => handleChange('date', e.target.value)}
                          className={`w-full text-sm rounded-xl py-2 ${GLASS_STYLES.input}`}
                        />
                      ) : (
                         <div className="text-sm font-semibold text-slate-800 bg-white/40 px-3 py-2 rounded-lg border border-white/30">{new Date(document.date).toLocaleDateString()}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block flex items-center gap-1.5 font-medium"><FileText size={14} /> Страниц</label>
                      <div className="text-sm font-semibold text-slate-800 bg-white/40 px-3 py-2 rounded-lg border border-white/30">{document.pages}</div>
                    </div>
                 </div>

                 <div>
                   <label className="text-xs text-slate-500 mb-1.5 block flex items-center gap-1.5 font-medium"><User size={14} /> Загрузил</label>
                   <div className="flex items-center gap-3 bg-white/40 p-2 rounded-xl border border-white/30">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs text-white font-bold shadow-sm">
                         {document.uploadedBy.charAt(0)}
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{document.uploadedBy}</div>
                   </div>
                 </div>

                 <div>
                   <label className="text-xs text-slate-500 mb-1.5 block flex items-center gap-1.5 font-medium"><HardDrive size={14} /> Путь (S3)</label>
                   <div className="text-[10px] font-mono text-slate-600 truncate bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 select-all shadow-inner">
                     {document.path}
                   </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-in fade-in duration-300">
               <div className="relative pl-4 border-l-2 border-indigo-100 space-y-8 ml-2">
                  {(editedDoc.history || []).map((item, idx) => (
                     <div key={item.id} className="relative group">
                        <div className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${
                          item.type === 'success' ? 'bg-emerald-500' : 
                          item.type === 'warning' ? 'bg-amber-500' :
                          item.type === 'danger' ? 'bg-rose-500' : 'bg-indigo-500'
                        }`}></div>
                        
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-800">{item.action}</span>
                           <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                              <Clock size={10} /> {new Date(item.date).toLocaleString()} • <User size={10} /> {item.user}
                           </span>
                           {item.details && (
                             <div className="mt-2 text-xs text-slate-600 bg-white/60 p-3 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm">
                               {item.details}
                             </div>
                           )}
                        </div>
                     </div>
                  ))}

                  {(editedDoc.history || []).length === 0 && (
                     <div className="text-center text-sm text-slate-400 py-8 italic">
                       История изменений пуста
                     </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
