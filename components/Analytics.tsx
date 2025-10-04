import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import { Expense, Role, ExpenseStatus, User } from '../types';
import Card from './common/Card';
import { getExchangeRate } from '../services/apiService';
import { ICONS } from '../constants';

// Replicating from Dashboard for consistency
const CATEGORY_COLORS: { [key: string]: string } = {
  'Travel': 'bg-indigo-500',
  'Meals & Entertainment': 'bg-emerald-500',
  'Office Supplies': 'bg-amber-500',
  'Software': 'bg-sky-500',
  'Hardware': 'bg-purple-500',
  'Utilities': 'bg-pink-500',
  'Other': 'bg-gray-400',
};

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];

// StatCard component localized for Analytics
const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, isLoading: boolean }> = ({ title, value, icon, isLoading }) => (
    <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md">
        <div className="flex justify-between items-center">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                 {isLoading ? (
                    <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mt-1"></div>
                ) : (
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
                )}
            </div>
            <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500">
                {icon}
            </div>
        </div>
    </div>
);


const AnalyticsDashboard: React.FC<{ title: string, relevantExpenses: Expense[], relevantUsers: User[] }> = ({ title, relevantExpenses, relevantUsers }) => {
    const { company } = useContext(AppContext)!;
    const [targetCurrency, setTargetCurrency] = useState(company.baseCurrency);
    const [rates, setRates] = useState<{ [key: string]: number }>({});
    const [isLoading, setIsLoading] = useState(true);

    const approvedExpenses = useMemo(() => relevantExpenses.filter(e => e.status === ExpenseStatus.Approved), [relevantExpenses]);

    const fetchAllRates = useCallback(async () => {
        setIsLoading(true);
        const uniqueCurrencies = [...new Set(approvedExpenses.map(e => e.currency))];
        const newRates: { [key: string]: number } = { [targetCurrency]: 1 };

        const ratePromises = uniqueCurrencies
            .filter(currency => currency !== targetCurrency)
            .map(async currency => {
                const rate = await getExchangeRate(currency, targetCurrency);
                return { currency, rate };
            });

        const settledRates = await Promise.all(ratePromises);

        settledRates.forEach(({ currency, rate }) => {
            if (rate) {
                newRates[currency] = rate;
            }
        });

        setRates(newRates);
        setIsLoading(false);
    }, [approvedExpenses, targetCurrency]);

    useEffect(() => {
        fetchAllRates();
    }, [fetchAllRates]);
    
    const getConvertedAmount = useCallback((amount: number, currency: string) => {
        const rate = rates[currency];
        if (rate === undefined) return null; // A rate couldn't be fetched
        return amount * rate;
    }, [rates]);
    
    const formatCurrency = (value: number | null) => {
        if (value === null) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: targetCurrency }).format(value);
    };

    const analyticsData = useMemo(() => {
        let totalSpend = 0;
        const categorySpend: { [key: string]: number } = {};
        const monthlySpend: { [key: string]: number } = {};
        const userSpend: { [key: string]: { name: string, total: number } } = {};
        let validExpensesCount = 0;

        for (const expense of approvedExpenses) {
            const convertedAmount = getConvertedAmount(expense.amount, expense.currency);
            if (convertedAmount === null) continue; // Skip if conversion rate is not available
            
            validExpensesCount++;
            totalSpend += convertedAmount;

            // Category Spend
            categorySpend[expense.category] = (categorySpend[expense.category] || 0) + convertedAmount;
            
            // Monthly Spend (last 6 months)
            const expenseDate = new Date(expense.date);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            if(expenseDate > sixMonthsAgo) {
                 const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
                 monthlySpend[monthKey] = (monthlySpend[monthKey] || 0) + convertedAmount;
            }
           
            // User Spend
            const user = relevantUsers.find(u => u.id === expense.userId);
            if(user) {
                if(!userSpend[user.id]) userSpend[user.id] = { name: user.name, total: 0 };
                userSpend[user.id].total += convertedAmount;
            }
        }
        
        const sortedCategorySpend = Object.entries(categorySpend).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
        const sortedMonthlySpend = Object.entries(monthlySpend).sort((a,b) => a[0].localeCompare(b[0]));
        const topSpenders = Object.values(userSpend).sort((a,b) => b.total - a.total).slice(0, 5);
        
        return {
            totalSpend,
            averageSpend: validExpensesCount > 0 ? totalSpend / validExpensesCount : 0,
            totalExpenses: relevantExpenses.length,
            sortedCategorySpend,
            sortedMonthlySpend,
            topSpenders
        };
    }, [approvedExpenses, getConvertedAmount, relevantUsers, relevantExpenses.length]);

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{title}</h1>
                <div className="flex items-center space-x-2">
                    <label htmlFor="currency-select" className="text-sm font-medium text-gray-600 dark:text-gray-400">Currency:</label>
                    <select
                        id="currency-select"
                        value={targetCurrency}
                        onChange={e => setTargetCurrency(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"
                    >
                        {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Approved Spend" value={formatCurrency(analyticsData.totalSpend)} icon={ICONS.statTotal} isLoading={isLoading} />
                <StatCard title="Average Expense" value={formatCurrency(analyticsData.averageSpend)} icon={ICONS.statApproved} isLoading={isLoading} />
                <StatCard title="Total Submissions" value={analyticsData.totalExpenses} icon={ICONS['message-square']} isLoading={false} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card title="Spending by Category">
                    <div className="space-y-4">
                        {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>)
                        : analyticsData.sortedCategorySpend.length > 0 ? analyticsData.sortedCategorySpend.map(({ name, total }) => (
                            <div key={name}>
                                <div className="flex justify-between mb-1 text-sm font-medium">
                                    <span className="text-gray-700 dark:text-gray-300">{name}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(total)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div 
                                        className={`${CATEGORY_COLORS[name] || 'bg-gray-500'} h-2.5 rounded-full`}
                                        style={{ width: `${analyticsData.totalSpend > 0 ? (total / analyticsData.totalSpend) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-500 dark:text-gray-400 py-4">No approved expense data.</p>}
                    </div>
                </Card>

                <div className="lg:col-span-2 grid grid-cols-1 gap-8">
                     <Card title="Monthly Spend (Last 6 Months)">
                         <div className="h-64 flex items-end justify-around space-x-2 pt-4">
                            {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-full w-1/6 bg-gray-200 dark:bg-gray-700 rounded-t-md animate-pulse"></div>)
                             : analyticsData.sortedMonthlySpend.length > 0 ? (() => {
                                const maxVal = Math.max(...analyticsData.sortedMonthlySpend.map(d => d[1]), 1);
                                return analyticsData.sortedMonthlySpend.map(([month, total]) => (
                                    <div key={month} className="flex flex-col items-center flex-1">
                                        <div className="w-full bg-indigo-200 dark:bg-indigo-900/80 rounded-t-md flex items-end" style={{height: '100%'}}>
                                            <div className="bg-indigo-500 w-full rounded-t-md" style={{height: `${(total / maxVal) * 100}%`}}></div>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{new Date(month + '-02').toLocaleString('default', { month: 'short' })}</span>
                                    </div>
                                ));
                             })() : <p className="w-full text-center text-gray-500 dark:text-gray-400">No recent approved expense data.</p>}
                        </div>
                    </Card>

                    <Card title="Top Spenders">
                        <div className="overflow-x-auto">
                            {isLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-2"></div>)
                            : analyticsData.topSpenders.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <tbody>
                                    {analyticsData.topSpenders.map((spender, idx) => (
                                        <tr key={spender.name} className="border-b dark:border-gray-700">
                                            <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">
                                                <span className="inline-block w-6 text-center mr-2 text-gray-500">#{idx + 1}</span>
                                                {spender.name}
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(spender.total)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-center text-gray-500 dark:text-gray-400 py-4">No spender data available.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}


const Analytics: React.FC = () => {
    const { currentUser, expenses, users } = useContext(AppContext)!;

    const { relevantExpenses, relevantUsers, title } = useMemo(() => {
        if (currentUser?.role === Role.Admin) {
            return {
                relevantExpenses: expenses,
                relevantUsers: users,
                title: 'Company-wide Analytics'
            };
        }
        
        if (currentUser?.role === Role.Manager) {
            const teamMemberIds = users.filter(u => u.managerId === currentUser.id).map(u => u.id);
            return {
                relevantExpenses: expenses.filter(e => teamMemberIds.includes(e.userId)),
                relevantUsers: users.filter(u => teamMemberIds.includes(u.id)),
                title: 'Team Analytics'
            };
        }

        return { relevantExpenses: [], relevantUsers: [], title: 'Analytics' }; // Fallback
    }, [currentUser, expenses, users]);

    if (!currentUser || (currentUser.role !== Role.Admin && currentUser.role !== Role.Manager)) {
        return (
            <Card title="Analytics">
                <p>You do not have permission to view analytics.</p>
            </Card>
        );
    }
    
    return <AnalyticsDashboard title={title} relevantExpenses={relevantExpenses} relevantUsers={relevantUsers} />;
};

export default Analytics;
