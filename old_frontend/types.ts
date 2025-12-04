import React from 'react';

export type ViewState = 'dashboard' | 'contacts' | 'tasks' | 'kb';

export interface Contact {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface NavItem {
  id: ViewState;
  label: string;
  icon?: React.ReactNode;
}