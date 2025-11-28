import React, { useState, useRef } from 'react';
import { UploadCloud, File, X, Check, FileText, Image, FileSpreadsheet, AlertCircle, Eye, Trash2 } from 'lucide-react';
import { documentsService } from '../api/services/documents';
import { useDocumentUpload } from '../hooks/useDocuments';
import { GLASS_STYLES } from '../constants';

interface FileUpload {
  id: string;
  file: File;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

export const UploadScreen: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, loading } = useDocumentUpload();

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return Image;
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return FileSpreadsheet;
    return FileText;
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newFiles: FileUpload[] = Array.from(fileList).map(file => ({
      id: Date.now().toString() + Math.random(),
      file,
      status: 'uploading' as const,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (const fileUpload of newFiles) {
      try {
        const result = await documentsService.uploadDocument(fileUpload.file);
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: 'done' as const, progress: 100, documentId: result.document.id }
            : f
        ));
      } catch (error: any) {
        // Extract error message safely
        let errorMessage = 'Ошибка загрузки';
        if (error?.message) {
          errorMessage = typeof error.message === 'string' 
            ? error.message 
            : JSON.stringify(error.message);
        } else if (error?.details) {
          errorMessage = typeof error.details === 'string'
            ? error.details
            : JSON.stringify(error.details);
        }
        
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        ));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Загрузка документов</h2>
      </div>
      
      {/* Drag Zone */}
      <div 
        className={`flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-12 transition-all duration-300 backdrop-blur-sm ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50/40 scale-[0.99]' 
            : 'border-white/40 bg-white/30 hover:bg-white/40 hover:border-white/60'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className={`p-8 rounded-full bg-gradient-to-br from-white to-white/50 shadow-lg mb-8 transition-transform duration-300 ${isDragging ? 'scale-110 text-indigo-600' : 'text-slate-400'}`}>
          <UploadCloud size={64} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-3">Перетащите файлы сюда</h3>
        <p className="text-slate-500 text-base mb-8 text-center max-w-md leading-relaxed font-medium">
          Мы поддерживаем PDF, DOCX, XLSX, JPEG, PNG. <br/>
          Максимальный размер одного файла — 50 МБ.
        </p>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 font-bold transition-all active:scale-95 flex items-center gap-2"
        >
          <UploadCloud size={20} />
          Выбрать файлы на компьютере
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.txt,.md,.py,.json,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Queue */}
      {files.length > 0 && (
        <div className={`mt-8 rounded-2xl overflow-hidden ${GLASS_STYLES.panel}`}>
          <div className="px-6 py-5 border-b border-white/20 font-bold text-slate-800 bg-white/30 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-3">
               <span>Очередь обработки</span>
               <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg">{files.length}</span>
            </div>
            <button 
               onClick={() => setFiles([])} 
               className="text-xs text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1 transition-colors"
            >
               <Trash2 size={14} /> Очистить список
            </button>
          </div>
          <div className="divide-y divide-white/20 max-h-[300px] overflow-y-auto">
            {files.map((fileUpload) => {
              const FileIcon = getFileIcon(fileUpload.file.name);
              return (
              <div key={fileUpload.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${fileUpload.status === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-white/60 text-indigo-500'} shadow-sm`}>
                    <FileIcon size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 mb-0.5">{fileUpload.file.name}</div>
                    <div className="text-xs text-slate-500 font-medium">{formatFileSize(fileUpload.file.size)}</div>
                    {fileUpload.error && (
                      <div className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                        <AlertCircle size={12} />
                        {fileUpload.error}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {fileUpload.status === 'uploading' ? (
                     <div className="flex items-center gap-3 w-48">
                       <div className="flex-1 h-2 bg-slate-200/50 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                           style={{ width: `${fileUpload.progress}%` }}
                         ></div>
                       </div>
                       <span className="text-xs font-bold text-indigo-600 w-8 text-right">{fileUpload.progress.toFixed(0)}%</span>
                     </div>
                  ) : fileUpload.status === 'error' ? (
                    <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg">
                      <X size={16} />
                      <span className="text-xs font-bold">Ошибка</span>
                     </div>
                  ) : (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                            <Check size={16} />
                            <span className="text-xs font-bold">Готово</span>
                        </div>
                        {fileUpload.documentId && (
                            <button 
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Просмотреть"
                            >
                                <Eye size={18} />
                            </button>
                        )}
                    </div>
                  )}
                  <button 
                    onClick={() => removeFile(fileUpload.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
    </div>
  );
};
