import React from 'react';

// Enum for user roles
export enum Role {
  Employee = 'Employee',
  Manager = 'Manager',
  Admin = 'Admin',
}

// Enum for expense statuses
export enum ExpenseStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

// Type for the different views in the app
export type View = 'dashboard' | 'submit' | 'users' | 'analytics';

// Interface for a user
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId?: string;
}

// Interface for an approval history entry
export interface ApprovalEntry {
  approverId: string;
  status: 'Approved' | 'Rejected';
  comment: string;
  date: string;
}

// Interface for an expense
export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  status: ExpenseStatus;
  approvalHistory: ApprovalEntry[];
}

// Interface for the company details
export interface Company {
  id: string;
  name: string;
  baseCurrency: string;
}

// Interface for data extracted from a receipt by Gemini
export interface ExtractedExpenseData {
  amount?: number;
  currency?: string;
  date?: string;
  vendor?: string;
  description?: string;
  category?: string;
}

// --- API Service Types ---

// Type for country data from REST Countries API
export interface Country {
  name: {
    common: string;
  };
  currencies: {
    [key: string]: {
      name: string;
      symbol: string;
    };
  };
}

// Type for exchange rate data from ExchangeRate-API
export interface ExchangeRates {
  base: string;
  date: string;
  rates: {
    [key: string]: number;
  };
}


// Type for the application's global context
export interface AppContextType {
  users: User[];
  expenses: Expense[];
  currentUser: User | null;
  company: Company;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addExpense: (expenseData: Omit<Expense, 'id' | 'userId' | 'status' | 'approvalHistory'>) => void;
  updateExpenseStatus: (expenseId: string, status: 'Approved' | 'Rejected', comment: string, approverId: string) => void;
  addUser: (userData: Omit<User, 'id'>) => void;
  updateUser: (userData: User) => void;
  currentView: View;
  setCurrentView: (view: View) => void;
}