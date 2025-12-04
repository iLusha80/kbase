import React from 'react';
import { ViewState } from '../types';
import { Users, CheckSquare, BookOpen, ArrowRight, BarChart3 } from 'lucide-react';

interface DashboardProps {
  onChangeView: (view: ViewState) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onChangeView }) => {
  const quickLinks = [
    {
      id: 'contacts' as ViewState,
      title: 'Контакты',
      description: 'Доступ к базе данных партнеров и сотрудников банка.',
      icon: <Users className="w-6 h-6 text-white" />,
      color: 'bg-blue-600'
    },
    {
      id: 'tasks' as ViewState,
      title: 'Мои Задачи',
      description: 'Приоритетные задачи по BI-отчетности на эту неделю.',
      icon: <CheckSquare className="w-6 h-6 text-white" />,
      color: 'bg-emerald-600'
    },
    {
      id: 'kb' as ViewState,
      title: 'База Знаний',
      description: 'Архив технической документации и SQL-схем.',
      icon: <BookOpen className="w-6 h-6 text-white" />,
      color: 'bg-purple-600'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-10 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Добро пожаловать в KBase
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Ваш центр управления аналитикой. Управляйте контактами, отслеживайте задачи и систематизируйте знания в едином защищенном пространстве.
          </p>
          <div className="mt-6 flex items-center space-x-2 text-sm text-slate-400">
            <BarChart3 className="w-4 h-4" />
            <span>Система работает в штатном режиме. Последняя синхронизация: сегодня, 09:41.</span>
          </div>
        </div>
        
        {/* Decorative Background Element */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent opacity-50 pointer-events-none" />
      </section>

      {/* Quick Navigation Cards */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 px-1">Быстрый переход</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onChangeView(link.id)}
              className="group flex flex-col items-start text-left bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-primary-200 transition-all duration-200"
            >
              <div className={`${link.color} p-3 rounded-lg shadow-sm mb-4 group-hover:scale-110 transition-transform duration-200`}>
                {link.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors">
                {link.title}
              </h3>
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                {link.description}
              </p>
              <div className="mt-auto flex items-center text-primary-600 font-medium text-sm">
                Перейти <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};