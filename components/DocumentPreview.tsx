
import React, { useState, useEffect } from 'react';
import { X, Download, Edit, Trash2, Eye, Calendar, User, FileText, HardDrive, History, Save, RotateCcw, Tag, Plus, Zap, Layers, Share2, CheckCircle, XCircle, Clock, Building, AlignLeft } from 'lucide-react';
import { Document, DocumentType, DocumentStatus, PriorityLevel, DocumentHistory } from '../types';
import { DOC_ICONS, STATUS_COLORS, STATUS_LABELS, getTagColor, PRIORITY_LABELS, PRIORITY_STYLES } from '../constants';
import { documentsService } from '../api/services/documents';
import { useMutation } from '../hooks/useApi';

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
    // Mock copy
    alert('Ссылка скопирована в буфер обмена');
  };

  return (
    <div className="w-[420px] bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-20 absolute right-0 top-0 bottom-0 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
           <div className="flex items-start gap-3 flex-1 pr-4">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm mt-0.5">
                 <IconComp size={24} className="text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editedDoc.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 border-slate-300 rounded focus:ring-primary focus:border-primary px-2 py-1 mb-1"
                  />
                ) : (
                   <h3 className="font-semibold text-slate-800 text-sm leading-snug break-words">{document.title}</h3>
                )}
                <p className="text-xs text-slate-500 capitalize">{document.type} • {document.size}</p>
              </div>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-slate-200 rounded-lg">
             <X size={20} />
           </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 text-sm border-b border-slate-200/50 -mb-5 mt-2">
           <button 
             onClick={() => setActiveTab('info')}
             className={`pb-3 font-medium transition-colors relative ${activeTab === 'info' ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
           >
             Информация
             {activeTab === 'info' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`pb-3 font-medium transition-colors relative ${activeTab === 'history' ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
           >
             История
             {activeTab === 'history' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
           </button>
        </div>
      </div>

      {/* Main Actions Bar */}
      {!isEditing && (
        <div className="grid grid-cols-5 gap-1 px-4 py-3 border-b border-slate-100 bg-white">
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors group" title="Просмотр">
            <Eye size={18} className="group-hover:text-primary transition-colors" /> <span className="text-[10px]">Взгляд</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors group" title="Скачать">
            <Download size={18} className="group-hover:text-primary transition-colors" /> <span className="text-[10px]">Скачать</span>
          </button>
           <button onClick={copyLink} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors group" title="Поделиться">
            <Share2 size={18} className="group-hover:text-primary transition-colors" /> <span className="text-[10px]">Ссылка</span>
          </button>
          <button 
            onClick={() => setIsEditing(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors group"
             title="Редактировать"
          >
            <Edit size={18} className="group-hover:text-primary transition-colors" /> <span className="text-[10px]">Правка</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Удалить">
            <Trash2 size={18} /> <span className="text-[10px]">Удалить</span>
          </button>
        </div>
      )}

      {/* Edit Mode Save/Cancel */}
      {isEditing && (
         <div className="flex gap-2 px-6 py-4 border-b border-slate-100 bg-blue-50/50">
            <button 
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Save size={14} /> Сохранить
            </button>
            <button 
              onClick={handleCancel}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RotateCcw size={14} />
            </button>
         </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
        
        {activeTab === 'info' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Status Workflow Action */}
            {editedDoc.status === 'review' && !isEditing && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                 <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                   <Clock size={16} /> Требуется согласование
                 </h4>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => handleWorkflowAction('approve')}
                     className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 shadow-sm"
                   >
                     <CheckCircle size={14} /> Согласовать
                   </button>
                   <button 
                     onClick={() => handleWorkflowAction('reject')}
                     className="flex-1 bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                   >
                     <XCircle size={14} /> Отклонить
                   </button>
                 </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlignLeft size={12} /> Описание / Заметки
              </label>
              {isEditing ? (
                <textarea
                  value={editedDoc.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-lg focus:ring-primary focus:border-primary min-h-[80px]"
                  placeholder="Добавьте описание документа..."
                />
              ) : (
                <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                  {editedDoc.description || <span className="text-slate-400 italic">Описание отсутствует</span>}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={12} /> Теги
                </label>
                {(isEditing || isAddingTag) && !isAddingTag && (
                  <button 
                    onClick={() => setIsAddingTag(true)} 
                    className="text-[10px] text-primary hover:underline font-medium flex items-center gap-1"
                  >
                    <Plus size={10} /> Добавить
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {editedDoc.tags && editedDoc.tags.map(tag => (
                  <div key={tag} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getTagColor(tag)}`}>
                    {tag}
                    {isEditing && (
                      <button onClick={() => removeTag(tag)} className="hover:text-red-600 transition-colors">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
                
                {isAddingTag && (
                  <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                    <input 
                      type="text" 
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                      autoFocus
                      placeholder="Тег..."
                      className="w-20 text-xs px-1.5 py-0.5 border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button onClick={addTag} className="text-success hover:text-emerald-600"><Plus size={14} /></button>
                    <button onClick={() => setIsAddingTag(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  </div>
                )}
                
                {(!editedDoc.tags || editedDoc.tags.length === 0) && !isAddingTag && (
                  <span className="text-xs text-slate-400 italic">Нет тегов</span>
                )}
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Metadata Fields */}
            <div className="space-y-4">
               {/* Department */}
               <div className="group">
                  <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Building size={12} /> Департамент</label>
                  {isEditing ? (
                     <select 
                       value={editedDoc.department} 
                       onChange={(e) => handleChange('department', e.target.value)}
                       className="w-full text-sm py-1.5 border-slate-300 rounded focus:ring-primary focus:border-primary"
                     >
                        <option>Юридический</option>
                        <option>Бухгалтерия</option>
                        <option>HR</option>
                        <option>Продажи</option>
                        <option>Администрация</option>
                        <option>Архив</option>
                     </select>
                  ) : (
                     <div className="text-sm font-medium text-slate-800">{editedDoc.department}</div>
                  )}
               </div>

               {/* Priority */}
               <div className="group">
                  <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Zap size={12} /> Приоритет</label>
                  {isEditing ? (
                    <div className="flex gap-2">
                       {(['high', 'medium', 'low'] as PriorityLevel[]).map(p => (
                          <button 
                            key={p}
                            onClick={() => handleChange('priority', p)}
                            className={`flex-1 text-xs py-1.5 rounded border ${editedDoc.priority === p ? PRIORITY_STYLES[p] + ' ring-1 ring-offset-1' : 'border-slate-200 text-slate-500 bg-slate-50'}`}
                          >
                            {PRIORITY_LABELS[p]}
                          </button>
                       ))}
                    </div>
                  ) : (
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_STYLES[document.priority]}`}>
                        {PRIORITY_LABELS[document.priority]}
                     </span>
                  )}
               </div>

                {/* Status */}
               <div className="group">
                  <label className="text-xs text-slate-500 mb-1 block">Статус</label>
                  {isEditing ? (
                    <select 
                      value={editedDoc.status}
                      onChange={(e) => handleChange('status', e.target.value as DocumentStatus)}
                      className="w-full text-sm rounded-lg border-slate-300 focus:ring-primary focus:border-primary py-2"
                    >
                      <option value="processed">Обработан</option>
                      <option value="processing">В обработке</option>
                      <option value="review">На проверке</option>
                      <option value="error">Ошибка</option>
                    </select>
                  ) : (
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[document.status]}`}>
                        {STATUS_LABELS[document.status]}
                     </span>
                  )}
                </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Calendar size={12} /> Дата</label>
                    {isEditing ? (
                      <input 
                        type="date" 
                        value={editedDoc.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        className="w-full text-sm border-slate-300 rounded focus:ring-primary focus:border-primary py-1.5"
                      />
                    ) : (
                       <div className="text-sm font-medium text-slate-800">{new Date(document.date).toLocaleDateString()}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><FileText size={12} /> Страниц</label>
                    <div className="text-sm font-medium text-slate-800">{document.pages}</div>
                  </div>
               </div>

               <div>
                 <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><User size={12} /> Загрузил</label>
                 <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                       {document.uploadedBy.charAt(0)}
                    </div>
                    <div className="text-sm font-medium text-slate-800">{document.uploadedBy}</div>
                 </div>
               </div>

               <div>
                 <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><HardDrive size={12} /> Путь (S3)</label>
                 <div className="text-xs font-mono text-slate-500 truncate bg-slate-50 p-1.5 rounded border border-slate-100 select-all">
                   {document.path}
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-300">
             <div className="relative pl-4 border-l border-slate-200 space-y-6">
                {(editedDoc.history || []).map((item, idx) => (
                   <div key={item.id} className="relative group">
                      <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                        item.type === 'success' ? 'bg-emerald-500' : 
                        item.type === 'warning' ? 'bg-amber-500' :
                        item.type === 'danger' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      
                      <div className="flex flex-col">
                         <span className="text-xs font-semibold text-slate-800">{item.action}</span>
                         <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            {new Date(item.date).toLocaleString()} • {item.user}
                         </span>
                         {item.details && (
                           <div className="mt-1 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                             {item.details}
                           </div>
                         )}
                      </div>
                   </div>
                ))}

                {(editedDoc.history || []).length === 0 && (
                   <div className="text-center text-sm text-slate-400 py-4">
                     История изменений пуста
                   </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
