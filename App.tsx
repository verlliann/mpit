
import React, { useState } from 'react';
import { Topbar } from './components/Topbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DocumentLibrary } from './components/DocumentLibrary';
import { UploadScreen } from './components/UploadScreen';
import { Counterparties } from './components/Counterparties';
import { DocumentPreview } from './components/DocumentPreview';
import { CounterpartyPreview } from './components/CounterpartyPreview';
import { ChatInterface } from './components/ChatInterface';
import { Settings } from './components/Settings';
import { AuthScreen } from './components/AuthScreen';
import { CommandPalette } from './components/CommandPalette';
import { Analytics } from './components/Analytics';
import { ViewState, Document, Counterparty } from './types';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useAuth, useNotifications } from './hooks';

export default function App() {
  const { isAuthenticated, login, logout, user } = useAuth();
  const { notifications, success, error: notifyError, removeNotification } = useNotifications();
  
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Command Palette Handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      await login({ email, password });
      success('Добро пожаловать!', 'Вы успешно вошли в систему');
    } catch (err: any) {
      notifyError('Ошибка входа', err.message || 'Не удалось войти в систему');
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setActiveView('dashboard');
      setSelectedDocument(null);
      setSelectedCounterparty(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDocumentUpdate = (updatedDoc: Document) => {
    setSelectedDocument(updatedDoc);
    success('Документ обновлен', `Изменения в "${updatedDoc.title}" успешно сохранены.`);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'library':
      case 'favorites':
      case 'archive':
      case 'trash':
        return (
          <DocumentLibrary 
            onSelectDocument={setSelectedDocument} 
            selectedDocumentId={selectedDocument?.id || null} 
            currentView={activeView}
          />
        );
      case 'analytics':
        return <Analytics />;
      case 'upload':
        return <UploadScreen />;
      case 'counterparties':
        return (
          <Counterparties 
            onSelectCounterparty={setSelectedCounterparty}
          />
        );
      case 'chat':
        return <ChatInterface />;
      case 'settings':
        return <Settings />;
      default:
        return <div className="p-8">В разработке</div>;
    }
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-bgMain text-slate-900 font-sans">
      <Topbar 
        onNavigate={setActiveView} 
        onLogout={handleLogout}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar activeView={activeView} onChangeView={(view) => {
          setActiveView(view);
          if (view !== 'library' && view !== 'favorites' && view !== 'archive' && view !== 'trash') {
            setSelectedDocument(null);
          }
          if (view !== 'counterparties') {
            setSelectedCounterparty(null);
          }
        }} />
        
        <main className="flex-1 overflow-y-auto relative bg-bgMain scroll-smooth">
          {renderContent()}
        </main>

        {/* Slide-over Panels */}
        {selectedDocument && (['library', 'favorites', 'archive', 'trash', 'analytics'].includes(activeView)) && (
           <DocumentPreview 
             document={selectedDocument} 
             onClose={() => setSelectedDocument(null)} 
             onUpdate={handleDocumentUpdate}
           />
        )}

        {selectedCounterparty && activeView === 'counterparties' && (
           <CounterpartyPreview 
             counterparty={selectedCounterparty}
             onClose={() => setSelectedCounterparty(null)}
             onSelectDocument={(doc) => {
                setActiveView('library');
                setSelectedDocument(doc);
                setSelectedCounterparty(null);
             }}
           />
        )}
      </div>

      {/* Overlays */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        onNavigate={setActiveView}
      />

      <div className="absolute top-20 right-6 z-50 space-y-3 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/60 p-4 w-80 pointer-events-auto animate-in slide-in-from-right fade-in duration-300 flex items-start gap-3">
             <div className={`mt-0.5 ${n.type === 'success' ? 'text-success' : n.type === 'warning' ? 'text-warning' : n.type === 'error' ? 'text-danger' : 'text-blue-500'}`}>
               {(n.type === 'success' || n.type === 'info') ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
             </div>
             <div className="flex-1">
               <h4 className="text-sm font-semibold text-slate-800">{n.title}</h4>
               <p className="text-xs text-slate-500 mt-1">{n.message}</p>
             </div>
             <button onClick={() => removeNotification(n.id)} className="text-slate-400 hover:text-slate-600">
               <X size={14} />
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}
