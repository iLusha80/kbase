import React from 'react';
import { ViewState } from '../types';
import { Database, Layout, Users, CheckSquare, BookOpen } from 'lucide-react';

interface HeaderProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onChangeView }) => {
  const navItems = [
    { id: 'dashboard' as ViewState, label: 'Главная', icon: <Layout className="w-4 h-4 mr-2" /> },
    { id: 'contacts' as ViewState, label: 'Контакты', icon: <Users className="w-4 h-4 mr-2" /> },
    { id: 'tasks' as ViewState, label: 'Задачи', icon: <CheckSquare className="w-4 h-4 mr-2" /> },
    { id: 'kb' as ViewState, label: 'База знаний', icon: <BookOpen className="w-4 h-4 mr-2" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo Area */}
        <div 
          className="flex items-center cursor-pointer group"
          onClick={() => onChangeView('dashboard')}
        >
          <div className="bg-slate-900 p-1.5 rounded-lg mr-3 group-hover:bg-primary-600 transition-colors">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">KBase</span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`
                  flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }
                `}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile Menu Placeholder (Not implemented but shown for layout balance) */}
        <div className="flex md:hidden">
          <button className="text-slate-500 hover:text-slate-700">
             <span className="sr-only">Open menu</span>
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
             </svg>
          </button>
        </div>
      </div>
    </header>
  );
};