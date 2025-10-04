
import { User, Role, Expense, Company, Country, ExchangeRates, ExpenseStatus } from '../types';

// --- MOCK DATA ---
export const COMPANY: Company = {
    id: 'comp-1',
    name: 'Innovate Corp',
    baseCurrency: 'USD'
};

export const USERS: User[] = [
  { id: 'user-1', name: 'Alice Admin', email: 'admin@innovate.com', role: Role.Admin },
  { id: 'user-2', name: 'Mark Manager', email: 'manager@innovate.com', role: Role.Manager, managerId: 'user-1' },
  { id: 'user-3', name: 'Erin Employee', email: 'employee@innovate.com', role: Role.Employee, managerId: 'user-2' },
  { id: 'user-4', name: 'Sam Employee', email: 'sam@innovate.com', role: Role.Employee, managerId: 'user-2' },
];

export const EXPENSES: Expense[] = [
  { 
    id: 'exp-1', 
    userId: 'user-3', 
    amount: 75.50, 
    currency: 'USD', 
    category: 'Meals & Entertainment', 
    description: 'Team Lunch at The Corner Bistro', 
    date: '2023-10-26', 
    // FIX: Use ExpenseStatus enum member instead of string literal.
    status: ExpenseStatus.Approved,
    approvalHistory: [
        { approverId: 'user-2', status: 'Approved', comment: 'Looks good', date: '2023-10-27' },
        { approverId: 'user-1', status: 'Approved', comment: 'OK', date: '2023-10-28' }
    ]
  },
  { 
    id: 'exp-2', 
    userId: 'user-4', 
    amount: 1200, 
    currency: 'EUR', 
    category: 'Travel', 
    description: 'Flight to Berlin for conference', 
    date: '2023-11-15', 
    // FIX: Use ExpenseStatus enum member instead of string literal.
    status: ExpenseStatus.Pending,
    approvalHistory: []
  },
  { 
    id: 'exp-3', 
    userId: 'user-3', 
    amount: 45.00, 
    currency: 'GBP', 
    category: 'Office Supplies', 
    description: 'New keyboards and mice', 
    date: '2023-10-20', 
    // FIX: Use ExpenseStatus enum member instead of string literal.
    status: ExpenseStatus.Rejected,
    approvalHistory: [
        { approverId: 'user-2', status: 'Rejected', comment: 'This was not pre-approved.', date: '2023-10-21' }
    ]
  },
];

// Simplified Approval Workflow: Employee -> Manager -> Admin
export const APPROVAL_WORKFLOW = [Role.Manager, Role.Admin];


// --- REAL API SERVICES ---

const COUNTRY_API_URL = 'https://restcountries.com/v3.1/all?fields=name,currencies';
const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/';

let countryCache: Country[] | null = null;
const exchangeRateCache: { [key: string]: { rates: { [key: string]: number }, timestamp: number } } = {};


export const getCountries = async (): Promise<Country[] | null> => {
    if (countryCache) return countryCache;
    try {
        const response = await fetch(COUNTRY_API_URL);
        if (!response.ok) throw new Error('Failed to fetch countries');
        const data: any[] = await response.json();
        countryCache = data as Country[];
        return countryCache;
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const getCurrenciesFromCountries = (countries: Country[]): Set<string> => {
    const currencies = new Set<string>();
    countries.forEach(country => {
        if (country.currencies) {
            Object.keys(country.currencies).forEach(currencyCode => {
                currencies.add(currencyCode);
            });
        }
    });
    return currencies;
};


export const getExchangeRate = async (from: string, to: string): Promise<number | null> => {
    try {
        const now = Date.now();
        const cached = exchangeRateCache[from];
        if (cached && (now - cached.timestamp < 1000 * 60 * 60)) { // 1 hour cache
             return cached.rates[to] || null;
        }

        const response = await fetch(`${EXCHANGE_RATE_API_URL}${from}`);
        if (!response.ok) throw new Error(`Failed to fetch exchange rates for ${from}`);
        const data: ExchangeRates = await response.json();
        
        exchangeRateCache[from] = { rates: data.rates, timestamp: now };
        
        return data.rates[to] || null;
    } catch (error) {
        console.error(error);
        return null;
    }
};