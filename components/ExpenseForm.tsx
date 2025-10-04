import React, { useState, useContext, useEffect, ChangeEvent, useCallback } from 'react';
import { AppContext } from '../App';
import { CATEGORIES, ICONS } from '../constants';
import { ExtractedExpenseData } from '../types';
import { extractExpenseFromReceipt } from '../services/geminiService';
import { getCountries, getCurrenciesFromCountries } from '../services/apiService';
import Card from './common/Card';

// Define a type for the form data
interface FormData {
    amount: number;
    currency: string;
    category: string;
    description: string;
    date: string;
}

// Define a type for the validation errors
type FormErrors = Partial<Record<keyof FormData, string>>;

const DRAFT_STORAGE_KEY = 'expenseFormDraft';

const ExpenseForm: React.FC = () => {
    const { addExpense, setCurrentView } = useContext(AppContext)!;
    
    const initialFormState: FormData = {
        amount: 0,
        currency: 'USD',
        category: CATEGORIES[0],
        description: '',
        date: new Date().toISOString().split('T')[0],
    };

    const [formData, setFormData] = useState<FormData>(initialFormState);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrError, setOcrError] = useState('');
    const [currencyList, setCurrencyList] = useState<string[]>(['USD', 'EUR', 'GBP', 'JPY']);
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    // Load draft from local storage on initial render
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
            try {
                const draftData = JSON.parse(savedDraft);
                setFormData(draftData);
                setIsDraftLoaded(true);
            } catch (error) {
                console.error("Failed to parse draft data:", error);
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
        }
    }, []);

    // Auto-save draft to local storage with debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            // Don't save an empty/initial form as a draft
            if (JSON.stringify(formData) !== JSON.stringify(initialFormState)) {
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
            }
        }, 500); // 500ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [formData, initialFormState]);
    
    useEffect(() => {
        const fetchCurrencies = async () => {
            const countries = await getCountries();
            if (countries) {
                const currencies = getCurrenciesFromCountries(countries);
                setCurrencyList(Array.from(currencies).sort());
            }
        };
        fetchCurrencies();
    }, []);
    
    const validateForm = useCallback((data: FormData): FormErrors => {
        const errors: FormErrors = {};
        if (data.amount <= 0) {
            errors.amount = 'Amount must be greater than zero.';
        }
        if (!data.description.trim()) {
            errors.description = 'Description is required.';
        }
        if (!data.date) {
            errors.date = 'Date is required.';
        } else if (new Date(data.date) > new Date()) {
            errors.date = 'Date cannot be in the future.';
        }
        return errors;
    }, []);
    
    // Real-time validation
    useEffect(() => {
        setFormErrors(validateForm(formData));
    }, [formData, validateForm]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: id === 'amount' ? parseFloat(value) || 0 : value
        }));
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
            handleOcr(e.target.files[0]);
        }
    };
    
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleOcr = async (file: File) => {
        setIsProcessing(true);
        setOcrError('');
        try {
            const base64Image = await fileToBase64(file);
            const data: ExtractedExpenseData = await extractExpenseFromReceipt(base64Image);
            setFormData(prev => ({
                amount: data.amount || prev.amount,
                currency: data.currency || prev.currency,
                description: data.vendor ? `${data.vendor} - ${data.description || ''}`.trim() : data.description || prev.description,
                date: data.date || prev.date,
                category: data.category || prev.category,
            }));
        } catch (err) {
            setOcrError('Failed to process receipt. Please enter details manually.');
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const clearForm = () => {
        setFormData(initialFormState);
        setReceiptFile(null);
        setFormErrors({});
        setOcrError('');
        setIsDraftLoaded(false);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateForm(formData);
        setFormErrors(errors);

        if (Object.keys(errors).length === 0) {
            addExpense(formData);
            clearForm();
            setCurrentView('dashboard'); // Navigate back to dashboard on success
        }
    };
    
    const isFormValid = Object.keys(formErrors).length === 0 && formData.amount > 0 && formData.description.trim() !== '';

    return (
        <Card title="Submit New Expense">
            {isDraftLoaded && (
                <div className="mb-4 p-3 bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 rounded-md text-sm text-indigo-700 dark:text-indigo-200">
                    Your previous draft has been loaded.
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Receipt (Optional)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-indigo-500 transition-colors">
                        <div className="space-y-1 text-center">
                            {ICONS.upload}
                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            {receiptFile && <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">Selected: {receiptFile.name}</p>}
                        </div>
                    </div>
                </div>

                {isProcessing && (
                    <div className="flex items-center justify-center space-x-2 text-indigo-500">
                        {ICONS.spinner}
                        <span>Processing receipt... this may take a moment.</span>
                    </div>
                )}
                
                {ocrError && <p className="text-red-500 text-sm">{ocrError}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                        <input type="number" id="amount" value={formData.amount} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700/50 dark:border-gray-600" />
                         {formErrors.amount && <p className="mt-1 text-xs text-red-500">{formErrors.amount}</p>}
                    </div>
                    <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                        <select id="currency" value={formData.currency} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700/50 dark:border-gray-600">
                           {currencyList.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                        <input type="date" id="date" value={formData.date} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700/50 dark:border-gray-600" />
                        {formErrors.date && <p className="mt-1 text-xs text-red-500">{formErrors.date}</p>}
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                        <select id="category" value={formData.category} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700/50 dark:border-gray-600">
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea id="description" value={formData.description} onChange={handleInputChange} required rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700/50 dark:border-gray-600"></textarea>
                    {formErrors.description && <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>}
                </div>

                <div className="flex justify-between items-center pt-2">
                    <button type="button" onClick={clearForm} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                        Clear Form & Draft
                    </button>
                    <button type="submit" disabled={isProcessing || !isFormValid} className="inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-600 transition-colors">
                        {isProcessing ? 'Processing...' : 'Submit Expense'}
                    </button>
                </div>
            </form>
        </Card>
    );
};

export default ExpenseForm;