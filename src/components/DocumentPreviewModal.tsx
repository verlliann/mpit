import React, { useState, useEffect } from 'react';
import { X, Download, FileText, File } from 'lucide-react';
import { documentsService } from '../api/services/documents';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  documentType: string;
  documentPath: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  documentType,
  documentPath
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      loadPreview();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, documentId]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await documentsService.downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить предпросмотр');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await documentsService.downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentTitle;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Не удалось скачать файл');
    }
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <FileText size={48} className="mb-4" />
          <p>{error}</p>
        </div>
      );
    }

    if (!previewUrl) {
      return null;
    }

    const ext = getFileExtension(documentTitle);

    // PDF
    if (ext === 'pdf') {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title={documentTitle}
        />
      );
    }

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <img
            src={previewUrl}
            alt={documentTitle}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    // Text files
    if (['txt', 'json', 'xml', 'csv', 'md'].includes(ext)) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0 bg-white"
          title={documentTitle}
        />
      );
    }

    // Office documents (Word, Excel, PowerPoint) - используем Google Docs Viewer
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      // Для офисных документов показываем кнопку скачивания
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
          <File size={64} className="text-gray-400" />
          <p className="text-lg">Предпросмотр офисных документов</p>
          <p className="text-sm">Скачайте файл для просмотра</p>
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download size={20} />
            Скачать {ext.toUpperCase()}
          </button>
        </div>
      );
    }

    // Unknown format
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
        <FileText size={64} className="text-gray-400" />
        <p className="text-lg">Предпросмотр недоступен</p>
        <p className="text-sm">Формат: {ext.toUpperCase()}</p>
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download size={20} />
          Скачать файл
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{documentTitle}</h2>
              <p className="text-sm text-gray-500">Тип: {documentType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Скачать"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

