
import React, { useState, useEffect } from 'react';
import { X, Download, Edit, Trash2, Eye, Calendar, User, FileText, HardDrive, History, Save, RotateCcw, Tag, Plus, Zap, Layers } from 'lucide-react';
import { Document, DocumentType, DocumentStatus, PriorityLevel } from '../types';
import { DOC_ICONS, STATUS_COLORS, STATUS_LABELS, getTagColor, PRIORITY_LABELS, PRIORITY_STYLES } from '../constants';

interface DocumentPreviewProps {
  document: Document | null;
  onClose: () => void;
  onUpdate?: (updatedDoc: Document) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDoc, setEditedDoc] = useState<Document | null>(null);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  useEffect(() => {
    setEditedDoc(document);
    setIsEditing(false);
    setIsAddingTag(false);
    setNewTag('');
  }, [document]);

  if (!document || !editedDoc) return null;

  const IconComp = DOC_ICONS[document.type as DocumentType] || DOC_ICONS.contract;

  const handleSave = () => {
    if (onUpdate && editedDoc) {
      onUpdate(editedDoc);
    }
    setIsEditing(false);
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

  return (
    <div className="w-[380px] bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-20 absolute right-0 top-0 bottom-0 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80 backdrop-blur-sm">
        <div className="flex items-start gap-3 pr-4 flex-1">
          <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm mt-0.5">
             <IconComp size={24} className="text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            {isEditing ? (
              <input 
                type="text" 
                value={editedDoc.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full text-sm font-semibold text-slate-800 border-slate-300 rounded focus:ring-primary focus:border-primary px-2 py-1"
              />
            ) : (
               <h3 className="font-semibold text-slate-800 text-sm leading-snug break-words">{document.title}</h3>
            )}
            <p className="text-xs text-slate-500 mt-1 capitalize">{document.type} • {document.size}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-slate-200 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="grid grid-cols-4 gap-2 px-6 py-4 border-b border-slate-100">
          <button className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors group">
            <Eye size={18} className="group-hover:text-primary transition-colors" /> <span className="text-[10px] font-medium">Просмотр</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors group">
            <Download size={18} className="group-hover:text-primary transition-colors" /> <span className="text-[10px] font-medium">Скачать</span>
          </button>
          <button 
            onClick={() => setIsEditing(true)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors group"
          >
            <Edit size={18} className="group-hover:text-primary transition-colors" /> <span className="text-[10px] font-medium">Изменить</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
            <Trash2 size={18} /> <span className="text-[10px] font-medium">Удалить</span>
          </button>
        </div>
      )}

      {/* Edit Mode Actions */}
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

      {/* Details Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Tags Section */}
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
                  placeholder="Название..."
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

        {/* Status */}
        <div className="group">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Статус</label>
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
             <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[document.status]}`}>
                {STATUS_LABELS[document.status]}
             </span>
          )}
        </div>

        <div className="h-px bg-slate-100"></div>

        {/* Fields */}
