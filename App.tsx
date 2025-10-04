import React, { useState, createContext, useMemo } from 'react';
import { User, Expense, AppContextType, Role, ExpenseStatus, Company, View } from './types';
import { USERS, EXPENSES, COMPANY, APPROVAL_WORKFLOW } from './services/apiService';
import Layout from './components/Layout';
import Login from './components/Login';

// Create the context with a default value of null, to be provided in the App component.
export const AppContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
    const [users, setUsers] = useState<User[]>(USERS);
    const [expenses, setExpenses] = useState<Expense[]>(EXPENSES);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<View>('dashboard');


    const login = (email: string, password: string): boolean => {
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        // For demo purposes, use a generic password.
        // In a real application, this would be a secure API call.
        if (user && password === 'password123') {
            setCurrentUser(user);
            setCurrentView('dashboard'); // Reset to dashboard on login
            return true;
        }
        return false;
    };

    const logout = () => {
        setCurrentUser(null);
    };
    
    const addExpense = (expenseData: Omit<Expense, 'id' | 'userId' | 'status' | 'approvalHistory'>) => {
        if (!currentUser) return;
        const newExpense: Expense = {
            ...expenseData,
            id: `exp-${Date.now()}`,
            userId: currentUser.id,
            status: ExpenseStatus.Pending,
            approvalHistory: [],
        };
        // Add new expense to the top of the list for immediate visibility
        setExpenses(prev => [newExpense, ...prev]);
    };

    const updateUser = (updatedUser: User) => {
        // Fix for stale state closure
        setUsers(prevUsers => prevUsers.map(user => user.id === updatedUser.id ? updatedUser : user));
    };

    const addUser = (userData: Omit<User, 'id'>) => {
        const newUser: User = {
            ...userData,
            id: `user-${Date.now()}`
        };
        setUsers(prev => [...prev, newUser]);
    };

    const updateExpenseStatus = (expenseId: string, status: 'Approved' | 'Rejected', comment: string, approverId: string) => {
        setExpenses(prevExpenses => prevExpenses.map(expense => {
            if (expense.id !== expenseId) {
                return expense;
            }

            const newHistoryEntry = {
                approverId,
                status,
                comment,
                date: new Date().toISOString(),
            };
            
            const newHistory = [...expense.approvalHistory, newHistoryEntry];
            let newStatus = expense.status;

            if (status === 'Rejected') {
                newStatus = ExpenseStatus.Rejected;
            } else if (status === 'Approved') {
                const approver = users.find(u => u.id === approverId);
                if (!approver) return expense; // Should not happen

                const approverWorkflowIndex = APPROVAL_WORKFLOW.indexOf(approver.role);
                const isFinalApproval = approverWorkflowIndex === APPROVAL_WORKFLOW.length - 1;

                if (isFinalApproval) {
                    newStatus = ExpenseStatus.Approved;
                } else {
                    newStatus = ExpenseStatus.Pending; // Stays pending for next level
                }
            }

            return {
                ...expense,
                status: newStatus,
                approvalHistory: newHistory,
            };
        }));
    };

    const contextValue: AppContextType = useMemo(() => ({
        users,
        expenses,
        currentUser,
        company: COMPANY,
        login,
        logout,
        addExpense,
        updateExpenseStatus,
        addUser,
        updateUser,
        currentView,
        setCurrentView,
    }), [users, expenses, currentUser, currentView]);

    return (
        <AppContext.Provider value={contextValue}>
            <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
                {currentUser ? <Layout /> : <Login />}
            </div>
        </AppContext.Provider>
    );
};

export default App;