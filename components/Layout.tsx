import React, { useContext } from 'react';
import Dashboard from './Dashboard';
import ExpenseForm from './ExpenseForm';
import UserManagement from './UserManagement';
import Analytics from './Analytics';
import { AppContext } from '../App';
import { Role, View } from '../types';


const Layout: React.FC = () => {
    const { currentUser, logout, currentView, setCurrentView } = useContext(AppContext)!;

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard />;
            case 'submit':
                return <ExpenseForm />;
            case 'users':
                return <UserManagement />;
            case 'analytics':
                return <Analytics />;
            default:
                return <Dashboard />;
        }
    };
    
    const NavLink: React.FC<{ view: View, label: string, children?: React.ReactNode }> = ({ view, label }) => (
         <button 
            onClick={() => setCurrentView(view)} 
            className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${currentView === view ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex h-screen">
            <aside className="w-64 bg-gray-800 dark:bg-gray-900/95 p-4 space-y-4 flex flex-col shadow-lg backdrop-blur-sm">
                <div className="flex-grow">
                    <h1 className="text-2xl font-bold text-white mb-8 px-2">ExpenseApp</h1>
                    <nav className="space-y-2">
                        <NavLink view="dashboard" label="Dashboard" />
                        <NavLink view="submit" label="Submit Expense" />
                        {currentUser?.role === Role.Admin && <NavLink view="users" label="User Management" />}
                        {(currentUser?.role === Role.Admin || currentUser?.role === Role.Manager) && <NavLink view="analytics" label="Analytics" />}
                    </nav>
                </div>
                <div className="border-t border-gray-700/50 pt-4 px-2">
                    <p className="font-semibold text-white">{currentUser?.name}</p>
                    <p className="text-sm text-gray-400">{currentUser?.role}</p>
                    <button onClick={logout} className="w-full mt-4 text-left px-4 py-2 rounded-md text-red-400 hover:bg-red-500/20 transition-colors duration-200 text-sm font-medium">
                        Logout
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-gray-100 dark:bg-gray-900">
                {renderView()}
            </main>
        </div>
    );
};

export default Layout;