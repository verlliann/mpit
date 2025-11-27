import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { MOCK_DOCUMENTS } from '../constants';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
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
    setInputValue('');
    setIsLoading(true);

    try {
      const apiKey = process.env.API_KEY;
      
      let ai;
      try {
          ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash-if-missing' });
      } catch (e) {
          console.error("Failed to init AI", e);
      }

      const systemInstruction = `
You are the AI assistant for Sirius DMS (Document Management System).
Your goal is to help users manage, search, and analyze their documents.

CONTEXT:
Here is the current database of documents in JSON format:
${JSON.stringify(MOCK_DOCUMENTS)}

CAPABILITIES:
1. SEARCH: Find documents by name, type, date, priority, or counterparty.
2. ANALYTICS: Count documents by type, status, or priority.
3. SUMMARIZATION: Summarize workflow status (e.g., "You have 3 high priority items pending").

RULES:
- Be concise, professional, and helpful.
- Dates are in YYYY-MM-DD format in data, but speak naturally (e.g. "15th of January").
- Focus on operational metrics: Priority (High/Medium/Low), Page Counts, Departments.
- Do NOT hallucinate financial data (amounts, prices) as they have been removed from the system.
- If asked to list documents, provide bullet points with Title, Date, and Priority.
`;

      if (ai && apiKey) {
          const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction },
            history: messages.filter(m => m.id !== 'welcome').map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
            }))
          });

          const result = await chat.sendMessageStream(userMessage.text);
          
          let fullResponse = "";
          const modelMessageId = (Date.now() + 1).toString();
          
          // Add placeholder message
          setMessages(prev => [...prev, {
              id: modelMessageId,
              role: 'model',
              text: '',
              timestamp: new Date()
          }]);

          for await (const chunk of result) {
            const text = chunk.text;
            if (text) {
                fullResponse += text;
                setMessages(prev => prev.map(msg => 
                  msg.id === modelMessageId ? { ...msg, text: fullResponse } : msg
                ));
            }
          }
      } else {
          // Fallback if no API key is present in environment (for demo purposes)
          await new Promise(r => setTimeout(r, 1000));
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "Для работы чата требуется API ключ Gemini. Пожалуйста, убедитесь, что переменная окружения API_KEY установлена.",
            timestamp: new Date()
          }]);
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Извините, произошла ошибка при обработке вашего запроса.",
        timestamp: new Date()
      }]);
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
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-sm">
             <Sparkles size={20} />
           </div>
           <div>
             <h2 className="text-lg font-bold text-slate-800">AI Ассистент</h2>
             <p className="text-xs text-slate-500 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               Система онлайн
             </p>
           </div>
         </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0 mt-1">
                  <Bot size={16} />
                </div>
              )}
              
              <div 
                className={`max-w-[80%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                  isUser 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                  <User size={16} />
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0 mt-1">
               <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
               <Loader2 size={16} className="animate-spin text-slate-400" />
               <span className="text-xs text-slate-500">Анализирую документы...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите о документах, например: 'Найди все срочные счета от ИП Иванов'..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-4 pr-12 py-3.5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all resize-none h-[52px] max-h-32 text-sm"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 top-2 p-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-primary transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-center mt-2">
           <p className="text-[10px] text-slate-400">
             AI может ошибаться. Пожалуйста, проверяйте важную информацию в документах.
           </p>
        </div>
      </div>
    </div>
  );
};