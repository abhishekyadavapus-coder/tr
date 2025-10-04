import React, { useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { AppContext } from '../App';
import { Expense, Role, ExpenseStatus } from '../types';
import Card from './common/Card';
import Modal from './common/Modal';
import { ICONS, CATEGORIES } from '../constants';
import { getExchangeRate, APPROVAL_WORKFLOW } from '../services/apiService';

const CATEGORY_COLORS: { [key: string]: string } = {
  'Travel': 'bg-indigo-500',
  'Meals & Entertainment': 'bg-emerald-500',
  'Office Supplies': 'bg-amber-500',
  'Software': 'bg-sky-500',
  'Hardware': 'bg-purple-500',
  'Utilities': 'bg-pink-500',
  'Other': 'bg-gray-400',
};

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
    <div className={`relative p-6 rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}>
        <div className={`absolute top-0 left-0 h-full w-1 ${color}`}></div>
        <div className="flex justify-between items-center">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-700/50`}>
                <div className={`w-6 h-6 ${color.replace('bg-', 'text-')}`}>
                    {icon}
                </div>
            </div>
        </div>
    </div>
);

const ExpenseDetailModal: React.FC<{ expense: Expense; onClose: () => void; showActions: boolean; }> = ({ expense, onClose, showActions }) => {
    const { users, currentUser, updateExpenseStatus } = useContext(AppContext)!;
    const [comment, setComment] = useState('');
    const employee = users.find(u => u.id === expense.userId);

    const handleConfirmAction = (action: 'Approved' | 'Rejected') => {
        updateExpenseStatus(expense.id, action, comment, currentUser!.id);
        onClose();
    };

    const getApproverName = (approverId: string) => users.find(u => u.id === approverId)?.name || 'Unknown User';
    
    return (
        <Modal onClose={onClose} title={`Expense Details: ${expense.id}`}>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <div className="grid grid-cols-2 gap-4 border-b pb-4 dark:border-gray-600">
                    <p><strong>Employee:</strong> {employee?.name}</p>
                    <p><strong>Date:</strong> {new Date(expense.date).toLocaleDateString()}</p>
                    <p><strong>Category:</strong> {expense.category}</p>
                    <p><strong>Amount:</strong> {new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)}</p>
                    <p className="col-span-2"><strong>Description:</strong> {expense.description}</p>
                </div>
                
                <div>
                    <h4 className="font-semibold mb-2">Approval History</h4>
                    <ul className="space-y-3">
                        {expense.approvalHistory.length > 0 ? expense.approvalHistory.map((entry, index) => (
                            <li key={index} className="flex items-start space-x-3">
                                <span className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full ${entry.status === 'Approved' ? 'bg-green-500' : 'bg-red-500'}`}>
                                    <div className="w-3.5 h-3.5 text-white">{entry.status === 'Approved' ? ICONS.check : ICONS.x}</div>
                                </span>
                                <div className="flex-1">
                                    <p className="font-medium">{getApproverName(entry.approverId)} <span className="font-normal text-gray-500 dark:text-gray-400">{entry.status} on {new Date(entry.date).toLocaleDateString()}</span></p>
                                    {entry.comment && <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-1.5"><span className="w-4 h-4">{ICONS['message-square']}</span><span>{entry.comment}</span></p>}
                                </div>
                            </li>
                        )) : <p className="text-sm text-gray-500">No approval history yet.</p>}
                    </ul>
                </div>

                {showActions && (
                    <div className="pt-4 border-t dark:border-gray-600">
                         <textarea 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add comments (optional)..."
                            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                            rows={2}
                        />
                        <div className="mt-4 flex justify-end space-x-2">
                            <button onClick={() => handleConfirmAction('Rejected')} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2 font-medium transition-colors"><span>Reject</span></button>
                            <button onClick={() => handleConfirmAction('Approved')} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2 font-medium transition-colors"><span>Approve</span></button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};


const ExpenseRow: React.FC<{ expense: Expense; isManagerView?: boolean }> = ({ expense, isManagerView = false }) => {
    const { users, company, currentUser } = useContext(AppContext)!;
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
    const [conversionError, setConversionError] = useState<boolean>(false);
    const employee = users.find(u => u.id === expense.userId);
    
    const canTakeAction = useMemo(() => {
        if (!isManagerView || expense.status !== 'Pending') {
            return false;
        }

        const lastApproval = expense.approvalHistory.slice().reverse().find(h => h.status === 'Approved');
        let nextApproverRole: Role | null = null;

        if (!lastApproval) {
            nextApproverRole = APPROVAL_WORKFLOW[0];
        } else {
            const lastApprover = users.find(u => u.id === lastApproval.approverId);
            if (!lastApprover) return false;

            const lastApproverIndex = APPROVAL_WORKFLOW.indexOf(lastApprover.role);
            if (lastApproverIndex > -1 && lastApproverIndex < APPROVAL_WORKFLOW.length - 1) {
                nextApproverRole = APPROVAL_WORKFLOW[lastApproverIndex + 1];
            } else {
                return false; 
            }
        }
        
        if (currentUser!.role !== nextApproverRole) {
            return false;
        }

        if (currentUser!.role === Role.Manager) {
            return employee?.managerId === currentUser!.id;
        }

        return true;

    }, [currentUser, expense, users, isManagerView, employee]);
    
    const getConvertedAmount = useCallback(async () => {
        if (expense.currency === company.baseCurrency) {
            setConvertedAmount(expense.amount);
            setConversionError(false);
            return;
        }
        setConversionError(false);
        const rate = await getExchangeRate(expense.currency, company.baseCurrency);
        
        if (rate) {
            setConvertedAmount(expense.amount * rate);
        } else {
            setConversionError(true);
            setConvertedAmount(null);
        }
    }, [expense.amount, expense.currency, company.baseCurrency]);

    useEffect(() => {
        if (isManagerView) getConvertedAmount();
    }, [isManagerView, getConvertedAmount]);

    const statusInfo = useMemo(() => {
        const statusDisplayConfig: { [key: string]: { text: string; className: string } } = {
            Pending: {
                text: 'Pending',
                className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
            },
            Approved: {
                text: 'Approved',
                className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
            },
            Rejected: {
                text: 'Rejected',
                className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
            },
            PendingNextLevel: {
                text: 'Pending Next Level',
                className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
            }
        };
        
        if (expense.status === 'Pending' && expense.approvalHistory.length > 0 && expense.approvalHistory.some(h => h.status === 'Approved')) {
            return statusDisplayConfig.PendingNextLevel;
        }
    
        return statusDisplayConfig[expense.status];
    }, [expense.status, expense.approvalHistory]);


    return (
        <>
            <tr className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                {isManagerView && <td className="px-6 py-4">{employee?.name}</td>}
                <td className="px-6 py-4">{expense.category}</td>
                <td className="px-6 py-4 truncate max-w-xs">{expense.description}</td>
                <td className="px-6 py-4 text-right font-medium">
                    {isManagerView ? (
                         conversionError ? (
                            <>
                                <span className="text-xs text-red-500">Rate N/A</span>
                                <span className="text-xs text-gray-500 block">
                                    ({new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)})
                                </span>
                            </>
                        ) : convertedAmount !== null ? (
                            <>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: company.baseCurrency }).format(convertedAmount)}</span>
                                <span className="text-xs text-gray-500 block font-normal">({new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)})</span>
                            </>
                        ) : (
                            <span className="text-xs text-gray-400">loading...</span>
                        )
                    ) : (
                        new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)
                    )}
                </td>
                <td className="px-6 py-4">
                     <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusInfo.className}`}>
                        {statusInfo.text}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <button onClick={() => setIsDetailModalOpen(true)} className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {ICONS.eye}
                    </button>
                </td>
            </tr>
            {isDetailModalOpen && (
                <ExpenseDetailModal 
                    expense={expense} 
                    onClose={() => setIsDetailModalOpen(false)}
                    showActions={canTakeAction}
                />
            )}
        </>
    );
}

const ExpenseCategoryChart: React.FC<{ expenses: Expense[], title: string }> = ({ expenses, title }) => {
    const data = useMemo(() => {
        const categoryTotals = expenses.reduce((acc: { [key: string]: number }, exp) => {
            if(exp.status === 'Approved') {
                acc[exp.category] = (acc[exp.category] || 0) + exp.amount; // Note: simplified, not converting currency for chart
            }
            return acc;
        }, {});
        
        const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

        return Object.entries(categoryTotals).map(([category, amount]) => ({
            category,
            amount,
            percentage: total > 0 ? (amount / total) * 100 : 0,
        })).sort((a,b) => b.amount - a.amount);

    }, [expenses]);
    
    if (data.length === 0) return (
         <Card title={title}>
            <p className="text-gray-500 dark:text-gray-400">No approved expense data available to display.</p>
        </Card>
    );

    return (
        <Card title={title}>
            <div className="space-y-4">
                {data.map(({ category, amount, percentage }) => (
                    <div key={category}>
                        <div className="flex justify-between mb-1 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{category}</span>
                            <span className="text-gray-500 dark:text-gray-400">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className={`${CATEGORY_COLORS[category] || 'bg-gray-500'} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

const FilterControls: React.FC<{
    filters: { status?: string, category?: string, employee?: string };
    setFilters: (filters: { status?: string, category?: string, employee?: string }) => void;
    availableOptions: { statuses?: boolean, categories?: boolean, employees?: {id: string, name: string}[] }
}> = ({ filters, setFilters, availableOptions }) => {
    return (
        <div className="mb-4 flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg border dark:border-gray-700">
            {availableOptions.statuses && (
                <div>
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <select
                        id="status-filter"
                        value={filters.status}
                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-900 dark:border-gray-600"
                    >
                        <option value="All">All</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            )}
            {availableOptions.categories && (
                <div>
                    <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <select
                        id="category-filter"
                        value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-900 dark:border-gray-600"
                    >
                        <option value="All">All</option>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            )}
             {availableOptions.employees && (
                <div>
                    <label htmlFor="employee-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee</label>
                    <select
                        id="employee-filter"
                        value={filters.employee}
                        onChange={e => setFilters({ ...filters, employee: e.target.value })}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-900 dark:border-gray-600"
                    >
                        <option value="All">All</option>
                        {availableOptions.employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
};

const EmployeeDashboard = () => {
    const { currentUser, expenses } = useContext(AppContext)!;
    const [filters, setFilters] = useState<{ status?: string, category?: string, employee?: string }>({ status: 'All', category: 'All' });
    const myExpenses = useMemo(() => expenses.filter(e => e.userId === currentUser!.id), [expenses, currentUser]);
    
    const filteredExpenses = useMemo(() => {
        return myExpenses.filter(exp => {
            const statusMatch = !filters.status || filters.status === 'All' || exp.status === filters.status;
            const categoryMatch = !filters.category || filters.category === 'All' || exp.category === filters.category;
            return statusMatch && categoryMatch;
        });
    }, [myExpenses, filters]);

    const pendingCount = useMemo(() => myExpenses.filter(e => e.status === 'Pending').length, [myExpenses]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Pending Expenses" value={pendingCount} icon={ICONS.statPending} color="bg-amber-500" />
                <StatCard title="Approved Expenses" value={myExpenses.filter(e => e.status === 'Approved').length} icon={ICONS.statApproved} color="bg-emerald-500" />
            </div>

            <ExpenseCategoryChart expenses={myExpenses} title="My Spending by Category"/>
            
            <Card title="My Expense History">
                <FilterControls 
                    filters={filters}
                    setFilters={setFilters}
                    availableOptions={{ statuses: true, categories: true }}
                />
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-300 font-semibold">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3 text-right">Amount</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map(exp => <ExpenseRow key={exp.id} expense={exp} />)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const ManagerDashboard = () => {
    const { currentUser, expenses, users } = useContext(AppContext)!;
    const [filters, setFilters] = useState<{ status?: string, category?: string, employee?: string }>({ employee: 'All', status: 'Pending', category: 'All' });
    
    const teamMembers = useMemo(() => users.filter(u => u.managerId === currentUser!.id), [users, currentUser]);
    const teamMemberIds = useMemo(() => teamMembers.map(u => u.id), [teamMembers]);
    const teamExpenses = useMemo(() => expenses.filter(e => teamMemberIds.includes(e.userId)), [expenses, teamMemberIds]);
    
    const filteredExpenses = useMemo(() => {
        return teamExpenses.filter(exp => {
            const employeeMatch = !filters.employee || filters.employee === 'All' || exp.userId === filters.employee;
            const statusMatch = !filters.status || filters.status === 'All' || exp.status === filters.status;
            const categoryMatch = !filters.category || filters.category === 'All' || exp.category === filters.category;
            return employeeMatch && statusMatch && categoryMatch;
        });
    }, [teamExpenses, filters]);

    return (
         <div className="space-y-8">
            <StatCard title="Pending Team Approvals" value={teamExpenses.filter(e => e.status === 'Pending').length} icon={ICONS.statPending} color="bg-amber-500" />
            
            <ExpenseCategoryChart expenses={teamExpenses} title="Team Spending by Category"/>
            
            <Card title="Team Expenses">
                 <FilterControls 
                    filters={filters}
                    setFilters={setFilters}
                    availableOptions={{ employees: teamMembers, statuses: true, categories: true }}
                />
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-300 font-semibold">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Employee</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3 text-right">Amount</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map(exp => <ExpenseRow key={exp.id} expense={exp} isManagerView />)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const AdminDashboard = () => {
    const { expenses, users } = useContext(AppContext)!;
    const [filters, setFilters] = useState<{ status?: string, category?: string, employee?: string }>({ employee: 'All', status: 'All', category: 'All' });

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const employeeMatch = !filters.employee || filters.employee === 'All' || exp.userId === filters.employee;
            const statusMatch = !filters.status || filters.status === 'All' || exp.status === filters.status;
            const categoryMatch = !filters.category || filters.category === 'All' || exp.category === filters.category;
            return employeeMatch && statusMatch && categoryMatch;
        });
    }, [expenses, filters]);

    const stats = {
        totalExpenses: expenses.length,
        pending: expenses.filter(e => e.status === 'Pending').length,
        approved: expenses.filter(e => e.status === 'Approved').length,
        rejected: expenses.filter(e => e.status === 'Rejected').length,
    };
    
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Expenses" value={stats.totalExpenses} icon={ICONS.statTotal} color="bg-indigo-500" />
                <StatCard title="Pending" value={stats.pending} icon={ICONS.statPending} color="bg-amber-500" />
                <StatCard title="Approved" value={stats.approved} icon={ICONS.statApproved} color="bg-emerald-500" />
                <StatCard title="Rejected" value={stats.rejected} icon={ICONS.statRejected} color="bg-red-500" />
            </div>
            
            <ExpenseCategoryChart expenses={expenses} title="Company-wide Spending by Category" />
            
            <Card title="All Company Expenses">
                 <FilterControls 
                    filters={filters}
                    setFilters={setFilters}
                    availableOptions={{ employees: users, statuses: true, categories: true }}
                />
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-300 font-semibold">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Employee</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3 text-right">Amount</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map(exp => <ExpenseRow key={exp.id} expense={exp} isManagerView />)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const Dashboard = () => {
  const { currentUser } = useContext(AppContext)!;

  switch (currentUser!.role) {
    case Role.Employee:
      return <EmployeeDashboard />;
    case Role.Manager:
      return <ManagerDashboard />;
    case Role.Admin:
      return <AdminDashboard />;
    default:
      return <div>Invalid Role</div>;
  }
};

export default Dashboard;