import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { Document } from '../types';
import { documentsService } from '../api/services/documents';

interface DocumentPreviewModalProps {
  document?: Document | null;
  documentId?: string;
  documentTitle?: string;
  documentType?: string;
  documentPath?: string;
  isOpen?: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ 
  document, 
  documentId,
  documentTitle,
  documentType,
  documentPath,
  isOpen = true,
  onClose 
}) => {
  // Поддерживаем оба варианта: объект document или отдельные пропсы
  const doc: Document | null = document || (documentId ? {
    id: documentId,
    title: documentTitle || 'Документ',
    type: documentType || 'document',
    path: documentPath || '',
    // Остальные поля по умолчанию
    uploaded_by: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
    is_archived: false,
    is_favorite: false,
    pages: 0,
    size: '0 B',
    size_bytes: 0,
    status: 'processed',
    priority: 'medium',
    department: '',
    description: '',
    tags: [],
    version: 1,
    date: null,
    counterparty_id: null
  } as Document : null);

  const [content, setContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<Array<{ page: number; image: string; width: number; height: number }> | null>(null);
  const [isLoadingPdfPages, setIsLoadingPdfPages] = useState(false);

  useEffect(() => {
    if (isOpen && doc?.id) {
      // Определяем, поддерживается ли предпросмотр страниц для этого типа файла
      const fileName = doc.title?.toLowerCase() || doc.path?.toLowerCase() || '';
      const supportedPreviewFormats = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'];
      const hasPreviewSupport = supportedPreviewFormats.some(ext => fileName.endsWith(ext));
      
      if (hasPreviewSupport) {
        // Загружаем страницы как изображения (приоритет над текстовым контентом)
        loadPdfPages();
        // Не загружаем текстовый контент для поддерживаемых форматов, только страницы
        setContent(null);
      } else {
        // Для неподдерживаемых форматов загружаем текстовый контент
        loadContent();
        setPdfPages(null);
      }
    } else {
      setContent(null);
      setContentError(null);
      setPdfPages(null);
    }
  }, [isOpen, doc?.id, doc?.title, doc?.path]);

  const loadContent = async () => {
    if (!doc?.id) return;
    
    setIsLoadingContent(true);
    setContentError(null);
    try {
      const data = await documentsService.getDocumentContent(doc.id);
      setContent(data.content);
    } catch (error: any) {
      console.error("Failed to load document content:", error);
      setContentError(error.message || "Не удалось загрузить содержимое документа");
    } finally {
      setIsLoadingContent(false);
    }
  };

  const loadPdfPages = async () => {
    if (!doc?.id) return;
    
    setIsLoadingPdfPages(true);
    try {
      const data = await documentsService.getDocumentPreviewPages(doc.id, 5);
      console.log("PDF pages data:", data); // Debug log
      if (data && data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
        setPdfPages(data.pages);
      } else {
        console.warn("No PDF pages in response:", data);
        setPdfPages(null);
      }
    } catch (error: any) {
      console.error("Failed to load PDF pages:", error);
      // Показываем ошибку пользователю, если это не 404 или другая ожидаемая ошибка
      if (error.status !== 404 && error.status !== 400) {
        setContentError(`Не удалось загрузить предпросмотр: ${error.message || 'Неизвестная ошибка'}`);
      }
      setPdfPages(null);
    } finally {
      setIsLoadingPdfPages(false);
    }
  };

  if (!isOpen || !doc) return null;

  const handleDownload = async () => {
    if (!doc?.id) return;
    
      try {
      const blob = await documentsService.downloadDocument(doc.id);
      
      if (!blob || blob.size === 0) {
        throw new Error('Получен пустой файл');
      }
      
      // Создаем URL для blob
        const url = window.URL.createObjectURL(blob);
      
      // Создаем временную ссылку для скачивания
      const a = document.createElement('a');
        a.href = url;
      a.download = doc.title || 'document';
      a.style.display = 'none';
      
      // Добавляем в DOM, кликаем и удаляем
      document.body.appendChild(a);
        a.click();
      
      // Очищаем через небольшую задержку
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error: any) {
        console.error("Failed to download document:", error);
      const errorMessage = error.message || error.toString() || 'Неизвестная ошибка';
      alert(`Не удалось скачать документ: ${errorMessage}`);
    }
  };

  // Маппинг типов документов для отображения
  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'contract': 'Договор',
      'invoice': 'Счет',
      'act': 'Акт',
      'order': 'Приказ',
      'email': 'Письмо',
      'scan': 'Скан',
      'document': 'Документ',
      'presentation': 'Презентация',
      'report': 'Отчет'
    };
    return typeMap[type] || type;
  };

  const getPreviewContent = () => {
    // Приоритет: PDF страницы > текстовый контент
    if (isLoadingPdfPages || isLoadingContent) {
      return (
        <div className="flex-1 flex items-center justify-center p-12 bg-slate-50">
          <div className="text-center">
            <Loader2 size={48} className="mx-auto mb-4 text-indigo-500 animate-spin" />
            <p className="text-slate-600 font-medium">Загрузка содержимого документа...</p>
            <p className="text-sm text-slate-500 mt-2">Пожалуйста, подождите</p>
          </div>
        </div>
      );
    }

    // Если есть PDF страницы, показываем их
    if (pdfPages && pdfPages.length > 0) {
      return (
        <div className="flex flex-col h-full" style={{ height: '100%' }}>
          {/* Header - фиксированный */}
          <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <FileText size={24} className="text-indigo-600 flex-shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 whitespace-nowrap">
                    <span className="font-medium mr-1">Тип:</span> {getTypeLabel(doc.type)}
                  </span>
                  {doc.pages > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 whitespace-nowrap">
                      <span className="font-medium mr-1">Страниц:</span> {doc.pages}
                    </span>
                  )}
                  {doc.size && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 whitespace-nowrap">
                      <span className="font-medium mr-1">Размер:</span> {doc.size}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="ml-4 flex-shrink-0 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors text-sm"
              >
                <Download size={18} className="mr-2" /> Скачать
              </button>
            </div>
          </div>

          {/* PDF Pages - прокручиваемый с явным скроллом */}
          <div 
            className="flex-1 overflow-y-auto bg-slate-50"
            style={{ 
              minHeight: 0,
              maxHeight: '100%',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {pdfPages.map((page) => (
                <div key={page.page} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                  <div className="text-sm text-slate-500 mb-2 font-medium">Страница {page.page}</div>
                  <img 
                    src={page.image} 
                    alt={`Страница ${page.page}`}
                    className="w-full h-auto rounded border border-slate-200 shadow-sm"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (contentError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
          <div className="text-center max-w-md">
            <FileText size={64} className="mx-auto mb-4 text-slate-400" />
            <p className="text-lg font-semibold mb-2 text-slate-800">{doc.title}</p>
            <p className="mb-6 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
              {contentError}
            </p>
            <button
              onClick={loadContent}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      );
    }


    if (content) {
      // Очищаем и форматируем содержимое
      const formatContent = (text: string) => {
        if (!text || !text.trim()) return null;
        
        // Нормализуем переносы строк
        let cleaned = text
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n');
        
        // Разбиваем на строки
        const lines = cleaned.split('\n');
        const result: JSX.Element[] = [];
        let currentParagraph: string[] = [];
        let paragraphIndex = 0;
        
        const flushParagraph = () => {
          if (currentParagraph.length === 0) return;
          
          const paraText = currentParagraph.join(' ').trim();
          if (!paraText) return;
          
          // Убираем множественные пробелы
          const normalized = paraText.replace(/\s+/g, ' ');
          
          // Проверяем, является ли это заголовком
          const isHeading = normalized.length < 200 && 
                           /^[А-ЯA-ZЁ]/.test(normalized) && 
                           !normalized.includes('.') &&
                           normalized.split(' ').length < 10;
          
          // Проверяем, является ли это списком
          const isList = /^[-•*]\s/.test(normalized) || /^\d+[.)]\s/.test(normalized);
          
          if (isHeading) {
            result.push(
              <h3 key={`heading-${paragraphIndex}`} className="text-lg font-bold text-slate-800 mt-6 mb-3 first:mt-0">
                {normalized}
              </h3>
            );
          } else if (isList) {
            const items = normalized.split(/\s*(?=[-•*]\s|\d+[.)]\s)/).filter(i => i.trim());
            result.push(
              <ul key={`list-${paragraphIndex}`} className="list-disc list-inside space-y-2 my-3 text-slate-700">
                {items.map((item, itemIdx) => {
                  const cleanItem = item.replace(/^[-•*]\s|\d+[.)]\s/, '').trim();
                  return cleanItem ? (
                    <li key={itemIdx} className="ml-2">{cleanItem}</li>
                  ) : null;
                })}
              </ul>
            );
          } else {
            result.push(
              <p key={`para-${paragraphIndex}`} className="text-slate-700 leading-relaxed mb-4 text-base">
                {normalized}
              </p>
            );
          }
          
          currentParagraph = [];
          paragraphIndex++;
        };
        
        // Обрабатываем каждую строку
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Пустая строка - конец параграфа
          if (!line) {
            flushParagraph();
            continue;
          }
          
          // Если строка не пустая, добавляем в текущий параграф
          currentParagraph.push(line);
        }
        
        // Не забываем обработать последний параграф
        flushParagraph();
        
        return result.length > 0 ? result : (
          <p className="text-slate-700 leading-relaxed mb-4 text-base">
            {text.trim().replace(/\s+/g, ' ')}
          </p>
        );
      };

      return (
        <div className="flex flex-col h-full" style={{ height: '100%' }}>
          {/* Header - фиксированный */}
          <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <FileText size={24} className="text-indigo-600 flex-shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 whitespace-nowrap">
                    <span className="font-medium mr-1">Тип:</span> {getTypeLabel(doc.type)}
                  </span>
                  {doc.pages > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 whitespace-nowrap">
                      <span className="font-medium mr-1">Страниц:</span> {doc.pages}
                    </span>
                  )}
                  {doc.size && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 whitespace-nowrap">
                      <span className="font-medium mr-1">Размер:</span> {doc.size}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="ml-4 flex-shrink-0 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors text-sm"
              >
                <Download size={18} className="mr-2" /> Скачать
              </button>
            </div>
          </div>

          {/* Content - прокручиваемый с явным скроллом */}
          <div 
            className="flex-1 overflow-y-auto bg-slate-50"
            style={{ 
              minHeight: 0,
              maxHeight: '100%',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="max-w-4xl mx-auto p-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                <div className="prose prose-slate max-w-none break-words whitespace-normal">
                  {formatContent(content)}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fallback если контент не загружен
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center max-w-md">
        <FileText size={64} className="mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-semibold mb-4 text-slate-800">{doc.title}</p>
          <p className="mb-4 text-sm text-slate-600">Тип: <span className="font-medium">{getTypeLabel(doc.type)}</span></p>
        <p className="mb-6 text-sm text-slate-500">
            Содержимое документа загружается...
        </p>
        <button
          onClick={handleDownload}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <Download size={20} className="mr-2" /> Скачать файл
        </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200"
        style={{ 
          height: '90vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Top bar with close button */}
        <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-700">Предпросмотр документа</h3>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content area - должен быть flex-1 и overflow-hidden */}
        <div 
          className="flex-1 overflow-hidden"
          style={{ 
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {getPreviewContent()}
        </div>
      </div>
    </div>
  );
};

