import React, { useState } from 'react';
import { UploadCloud, File, X, Check } from 'lucide-react';

export const UploadScreen: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<{name: string, size: string, status: 'uploading' | 'done'}[]>([]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Mock file addition
    setFiles([
      ...files, 
      { name: 'new_contract_scan.pdf', size: '2.4 MB', status: 'uploading' },
      { name: 'invoice_january.pdf', size: '1.1 MB', status: 'uploading' }
    ]);
    
    // Simulate upload finish
    setTimeout(() => {
       setFiles(prev => prev.map(f => ({ ...f, status: 'done' })));
    }, 2000);
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
        <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-transform active:scale-95">
          Выбрать файлы на компьютере
        </button>
      </div>

      {/* Upload Queue */}
      {files.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-medium text-slate-700">
            Очередь обработки ({files.length})
          </div>
          <div className="divide-y divide-slate-100">
            {files.map((file, idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded text-slate-500">
                    <File size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{file.name}</div>
                    <div className="text-xs text-slate-400">{file.size}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {file.status === 'uploading' ? (
                     <div className="flex items-center gap-3">
                       <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-primary w-2/3 animate-pulse"></div>
                       </div>
                       <span className="text-xs text-slate-500">Загрузка...</span>
                     </div>
                  ) : (
                    <div className="flex items-center gap-2 text-success">
                      <Check size={16} />
                      <span className="text-xs font-medium">Готово</span>
                    </div>
                  )}
                  <button className="text-slate-400 hover:text-danger">
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
