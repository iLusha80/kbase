import React, { useState } from 'react';
import { ViewState } from './types';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ContactList } from './components/ContactList';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onChangeView={setCurrentView} />;
      case 'contacts':
        return <ContactList />;
      case 'tasks':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-600">Раздел Задач в разработке</h2>
            <p className="mt-2 text-slate-500">Функциональность будет доступна в следующем релизе.</p>
          </div>
        );
      case 'kb':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-600">База Знаний наполняется</h2>
            <p className="mt-2 text-slate-500">Модуль wiki-документации находится в стадии проектирования.</p>
          </div>
        );
      default:
        return <Dashboard onChangeView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary-600 selection:text-white">
      <Header currentView={currentView} onChangeView={setCurrentView} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      
      {/* Optional: Simple Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400">
        &copy; 2024 KBase Enterprise System. Internal Use Only.
      </footer>
    </div>
  );
}

export default App;