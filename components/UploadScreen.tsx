import React, { useState, useRef } from 'react';
import { UploadCloud, File, X, Check } from 'lucide-react';
import { documentsService } from '../api/services/documents';
import { useDocumentUpload } from '../hooks/useDocuments';

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
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: 'error' as const, error: error.message || 'Ошибка загрузки' }
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
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Загрузка документов</h2>
      
      {/* Drag Zone */}
      <div 
        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 transition-all duration-200 ${
          isDragging 
            ? 'border-primary bg-blue-50' 
            : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className={`p-6 rounded-full bg-white shadow-sm mb-6 ${isDragging ? 'text-primary' : 'text-slate-400'}`}>
          <UploadCloud size={48} />
        </div>
        <h3 className="text-lg font-medium text-slate-700 mb-2">Перетащите файлы сюда</h3>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-md">
          Поддерживаются PDF, DOCX, XLSX, JPEG, PNG. Максимальный размер файла 50 МБ.
        </p>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-transform active:scale-95"
        >
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
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-medium text-slate-700">
            Очередь обработки ({files.length})
          </div>
          <div className="divide-y divide-slate-100">
            {files.map((fileUpload) => (
              <div key={fileUpload.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded text-slate-500">
                    <File size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{fileUpload.file.name}</div>
                    <div className="text-xs text-slate-400">{formatFileSize(fileUpload.file.size)}</div>
                    {fileUpload.error && (
                      <div className="text-xs text-red-500 mt-1">{fileUpload.error}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {fileUpload.status === 'uploading' ? (
                     <div className="flex items-center gap-3">
                       <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-primary transition-all duration-300"
                           style={{ width: `${fileUpload.progress}%` }}
                         ></div>
                       </div>
                       <span className="text-xs text-slate-500">Загрузка...</span>
                     </div>
                  ) : fileUpload.status === 'error' ? (
                    <div className="flex items-center gap-2 text-red-500">
                      <X size={16} />
                      <span className="text-xs font-medium">Ошибка</span>
                     </div>
                  ) : (
                    <div className="flex items-center gap-2 text-success">
                      <Check size={16} />
                      <span className="text-xs font-medium">Готово</span>
                    </div>
                  )}
                  <button 
                    onClick={() => removeFile(fileUpload.id)}
                    className="text-slate-400 hover:text-danger transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
