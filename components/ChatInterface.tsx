
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, FileText } from 'lucide-react';
import { chatService } from '../api/services/chat';
import { GLASS_STYLES } from '../constants';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  documents?: Array<{
    document_id: string;
    title: string;
    type: string;
    path?: string;
    available: boolean;
  }>;
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Здравствуйте! Я ваш AI-ассистент Sirius. Я имею доступ к индексу ваших документов и могу помочь с поиском, аналитикой или ответами на вопросы. Чем могу помочь?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{
    id: string;
    title: string;
    type: string;
    path: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
          const modelMessageId = (Date.now() + 1).toString();
          
          // Add placeholder message
          setMessages(prev => [...prev, {
              id: modelMessageId,
              role: 'model',
              text: '',
              timestamp: new Date()
          }]);

      // Use streaming API
      let documents: Array<any> = [];
      
      await chatService.streamMessage(
        messageText,
        (chunk: string) => {
          setMessages(prev => prev.map(msg => {
            if (msg.id === modelMessageId) {
              return { ...msg, text: (msg.text || '') + chunk };
            }
            return msg;
          }));
        },
        (docs: Array<any>) => {
          documents = docs;
          // Обновляем сообщение с документами
          setMessages(prev => prev.map(msg => {
            if (msg.id === modelMessageId) {
              return { ...msg, documents: docs };
            }
            return msg;
          }));
        }
      );

    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'model' && lastMessage.text === '') {
          return prev.map(msg => 
            msg.id === lastMessage.id 
              ? { ...msg, text: error.message || "Извините, произошла ошибка при обработке вашего запроса." }
              : msg
          );
        }
        return [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: error.message || "Извините, произошла ошибка при обработке вашего запроса.",
        timestamp: new Date()
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Header */}
      <div className={`mx-6 mt-4 mb-2 px-6 py-4 flex items-center justify-between z-10 rounded-2xl ${GLASS_STYLES.panel}`}>
         <div className="flex items-center gap-4">
           <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
             <Sparkles size={24} />
           </div>
           <div>
             <h2 className="text-lg font-bold text-slate-800">AI Ассистент</h2>
             <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
               Система онлайн
             </p>
           </div>
         </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {!isUser && (
                <div className="w-10 h-10 rounded-full bg-white/80 border border-white/50 flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0 mt-1 backdrop-blur-sm">
                  <Bot size={20} />
                </div>
              )}
              
              <div 
                className={`max-w-[75%] px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-md whitespace-pre-wrap backdrop-blur-md ${
                  isUser 
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm shadow-indigo-500/20' 
                    : 'bg-white/60 border border-white/50 text-slate-700 rounded-tl-sm'
                }`}
              >
                {msg.text}
                
                {/* Отображаем документы, если они есть */}
                {!isUser && msg.documents && msg.documents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200/50">
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText size={14} />
                      Найдено документов: {msg.documents.length}
                    </p>
                    <div className="space-y-2">
                      {msg.documents.map((doc: any, idx: number) => (
                        <button
                          key={doc.document_id || idx}
                          onClick={() => setPreviewDocument({
                            id: doc.document_id,
                            title: doc.title,
                            type: doc.type,
                            path: doc.path || ''
                          })}
                          className="w-full text-left text-xs bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 hover:bg-indigo-100/50 hover:border-indigo-300 transition-all cursor-pointer"
                        >
                          <div className="font-semibold text-indigo-900 flex items-center gap-2">
                            <FileText size={14} />
                            {doc.title}
                          </div>
                          <div className="text-indigo-600 mt-0.5 ml-5">
                            {doc.type} {doc.available ? '• Нажмите для предпросмотра' : '• Недоступен'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-10 h-10 rounded-full bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-1 backdrop-blur-sm">
                  <User size={20} />
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-4 justify-start animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white/80 border border-white/50 flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0 mt-1 backdrop-blur-sm">
               <Bot size={20} />
            </div>
            <div className="bg-white/60 border border-white/50 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3 backdrop-blur-md">
               <Loader2 size={18} className="animate-spin text-indigo-500" />
               <span className="text-sm text-slate-600 font-medium">Анализирую документы...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 pb-8">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите о документах, например: 'Найди все срочные счета от ИП Иванов'..."
            className={`w-full pl-6 pr-14 py-4 rounded-full focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none h-[60px] max-h-32 text-sm shadow-xl ${GLASS_STYLES.input}`}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 top-2 p-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
        <div className="text-center mt-3">
           <p className="text-[10px] text-slate-500 font-medium opacity-70">
             AI может ошибаться. Пожалуйста, проверяйте важную информацию в документах.
           </p>
        </div>
      </div>

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
