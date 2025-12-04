import React, { useState, useEffect } from 'react';
import { Contact } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { X, UserPlus, Pencil } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Omit<Contact, 'id'>) => void;
  initialData?: Contact | null;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    role: '',
    email: '',
    phone: '',
    notes: ''
  });

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          department: initialData.department,
          role: initialData.role,
          email: initialData.email,
          phone: initialData.phone,
          notes: initialData.notes || ''
        });
      } else {
        setFormData({
          name: '',
          department: '',
          role: '',
          email: '',
          phone: '',
          notes: ''
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-200">
          
          {/* Header */}
          <div className="bg-slate-50 px-4 py-3 sm:px-6 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-lg font-semibold leading-6 text-slate-900 flex items-center" id="modal-title">
              {initialData ? (
                <>
                  <Pencil className="w-5 h-5 mr-2 text-primary-600" />
                  Редактирование контакта
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2 text-primary-600" />
                  Новый контакт
                </>
              )}
            </h3>
            <button
              type="button"
              className="rounded-md bg-transparent text-slate-400 hover:text-slate-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Закрыть</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-6 sm:px-6 space-y-4">
              <Input
                label="ФИО"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Иванов Иван Иванович"
                required
                autoFocus
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Департамент"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="IT / Analytics"
                />
                <Input
                  label="Должность"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="Senior Analyst"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ivanov@bank.com"
                />
                <Input
                  label="Телефон"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+7 (999) 000-00-00"
                />
              </div>

              <TextArea
                label="Заметки"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Дополнительная информация..."
                rows={3}
              />
            </div>

            {/* Footer / Actions */}
            <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-slate-100">
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto sm:ml-3"
              >
                Сохранить
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full sm:mt-0 sm:w-auto"
                onClick={onClose}
              >
                Отмена
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};