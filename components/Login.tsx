import React, { useContext, useState } from 'react';
import { AppContext } from '../App';

const Login: React.FC = () => {
    const { login, users } = useContext(AppContext)!;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        const success = login(email, password);
        if (!success) {
            setError('Invalid email or password. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 font-sans">
             <div className="relative w-full max-w-4xl flex bg-white dark:bg-gray-800 shadow-2xl rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-1/2 hidden md:block bg-gradient-to-br from-indigo-600 to-purple-700 p-12 text-white flex flex-col justify-center">
                    <h1 className="text-4xl font-bold mb-4">Welcome to ExpenseApp</h1>
                    <p className="text-indigo-100">Streamline your expense reporting with an intuitive, automated system. Login to manage your expenses with ease.</p>
                </div>
                <div className="w-full md:w-1/2 p-8 md:p-12">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign in to your account</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Let's get you started.</p>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email Address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        
                        {error && (
                            <div className="text-red-500 text-sm font-medium">{error}</div>
                        )}
                        
                        <div className="pt-2">
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                Sign in
                            </button>
                        </div>
                    </form>
                     <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                    Demo Credentials
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 space-y-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p>You can use any of these emails with the password: <strong className="font-mono text-indigo-500 dark:text-indigo-400">password123</strong></p>
                            <ul className="text-xs space-y-1">
                                {users.map(user => (
                                    <li key={user.id}><strong className="font-semibold text-gray-800 dark:text-gray-200">{user.role}:</strong> <span className="font-mono">{user.email}</span></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;