import React, { useState, useEffect, useMemo } from 'react';
import { Contact } from '../types';
import { Button } from './ui/Button';
import { ContactModal } from './ContactModal';
import { Plus, Search, Mail, Phone, FileText, Pencil, ArrowUp, ArrowDown } from 'lucide-react';

export const ContactList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'Алексей Смирнов',
      department: 'Data Warehouse',
      role: 'Lead Data Engineer',
      email: 'a.smirnov@bank.com',
      phone: '+7 (900) 123-45-67',
      notes: 'Ключевой контакт по миграции DWH.'
    },
    {
      id: '2',
      name: 'Мария Ковалева',
      department: 'Risk Management',
      role: 'Senior Risk Analyst',
      email: 'm.kovaleva@bank.com',
      phone: '+7 (900) 987-65-43',
      notes: 'Запрос на новые дашборды по кредитным рискам.'
    },
    {
      id: '3',
      name: 'Дмитрий Волков',
      department: 'Corporate Business',
      role: 'Product Owner',
      email: 'd.volkov@bank.com',
      phone: '+7 (900) 555-01-02',
    },
    {
      id: '4',
      name: 'Елена Петрова',
      department: 'Marketing',
      role: 'Head of Analytics',
      email: 'e.petrova@bank.com',
      phone: '+7 (900) 333-22-11',
      notes: 'Согласовать KPI на Q4.'
    },
    {
      id: '5',
      name: 'Сергей Иванов',
      department: 'Security',
      role: 'SecOps Lead',
      email: 's.ivanov@bank.com',
      phone: '+7 (900) 777-88-99',
    },
  ]);

  // Debounce search term to avoid excessive filtering on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Memoize filtered and sorted results for performance
  const filteredContacts = useMemo(() => {
    let result = contacts;

    // 1. Filter
    if (debouncedSearchTerm) {
      const lowerTerm = debouncedSearchTerm.toLowerCase();
      result = result.filter((contact) => 
        contact.name.toLowerCase().includes(lowerTerm) ||
        contact.department.toLowerCase().includes(lowerTerm) ||
        contact.role.toLowerCase().includes(lowerTerm) ||
        contact.email.toLowerCase().includes(lowerTerm)
      );
    }

    // 2. Sort
    return [...result].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [contacts, debouncedSearchTerm, sortOrder]);

  const handleSaveContact = (contactData: Omit<Contact, 'id'>) => {
    if (editingContact) {
      // Update existing contact
      setContacts(prev => prev.map(c => 
        c.id === editingContact.id 
          ? { ...contactData, id: c.id } 
          : c
      ));
    } else {
      // Create new contact
      const newContact: Contact = {
        ...contactData,
        id: Math.random().toString(36).substr(2, 9),
      };
      setContacts(prev => [newContact, ...prev]);
    }
    
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const openNewContactModal = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const openEditContactModal = (contact: Contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Контакты</h2>
          <p className="text-slate-500 text-sm mt-1">Управление базой ключевых сотрудников и партнеров.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600 w-64"
                />
            </div>
            <Button onClick={openNewContactModal}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить контакт
            </Button>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                  onClick={toggleSort}
                >
                  <div className="flex items-center gap-1">
                    Имя
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-600" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-600" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Департамент / Роль
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Контакты
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Заметки
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact, index) => (
                  <tr 
                    key={contact.id} 
                    className={`
                      group hover:bg-blue-50/50 transition-colors
                      ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                    `}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-9 w-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{contact.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{contact.department}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{contact.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-sm text-slate-600">
                          <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {contact.email}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {contact.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {contact.notes ? (
                        <div className="flex items-start max-w-xs">
                           <FileText className="w-4 h-4 text-slate-300 mr-2 mt-0.5 flex-shrink-0" />
                           <span className="text-sm text-slate-500 truncate">{contact.notes}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Нет заметок</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => openEditContactModal(contact)}
                        className="text-slate-400 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-primary-50"
                        title="Редактировать"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 text-slate-300 mb-2" />
                      <p>Контакты не найдены</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-700">
                        Показано <span className="font-medium">{filteredContacts.length > 0 ? 1 : 0}</span> до <span className="font-medium">{filteredContacts.length}</span> из <span className="font-medium">{contacts.length}</span> результатов
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50" disabled>
                            Предыдущая
                        </button>
                        <button className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
                            1
                        </button>
                        <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50" disabled>
                            Следующая
                        </button>
                    </nav>
                </div>
            </div>
        </div>
      </div>

      <ContactModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        initialData={editingContact}
      />
    </div>
  );
};