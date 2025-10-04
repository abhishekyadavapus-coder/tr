import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { User, Role } from '../types';
import Card from './common/Card';
import Modal from './common/Modal';

const UserForm: React.FC<{ user?: User; onSave: (user: Omit<User, 'id'> | User) => void; onCancel: () => void }> = ({ user, onSave, onCancel }) => {
    // FIX: Use non-null assertion `!` because this component is rendered within the AppContext.Provider
    const { users } = useContext(AppContext)!;
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState<Role>(user?.role || Role.Employee);
    const [managerId, setManagerId] = useState(user?.managerId || '');

    const managers = users.filter(u => u.role === Role.Manager || u.role === Role.Admin);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userData = { name, email, role, managerId: role === Role.Employee ? managerId : undefined };
        if(user) {
            onSave({ ...user, ...userData });
        } else {
            onSave(userData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label className="block text-sm font-medium">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label className="block text-sm font-medium">Role</label>
                <select value={role} onChange={e => setRole(e.target.value as Role)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500">
                    {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            {role === Role.Employee && (
                 <div>
                    <label className="block text-sm font-medium">Manager</label>
                    <select value={managerId} onChange={e => setManagerId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="">Select Manager</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium transition-colors">Save</button>
            </div>
        </form>
    );
};

const UserManagement: React.FC = () => {
    // FIX: Use non-null assertion `!` because this component is rendered within the AppContext.Provider
    const { users, addUser, updateUser } = useContext(AppContext)!;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
    
    const handleSaveUser = (user: Omit<User, 'id'> | User) => {
        if('id' in user) {
            updateUser(user);
        } else {
            addUser(user);
        }
        setIsModalOpen(false);
        setEditingUser(undefined);
    };

    const openAddModal = () => {
        setEditingUser(undefined);
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    return (
        <>
            <Card title="User Management">
                 <div className="flex justify-end mb-4">
                    <button onClick={openAddModal} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium transition-colors">Add User</button>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Manager</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                 const manager = users.find(u => u.id === user.managerId);
                                 return (
                                    <tr key={user.id} className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 odd:bg-gray-50 dark:odd:bg-gray-800/50">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{user.name}</td>
                                        <td className="px-6 py-4">{user.email}</td>
                                        <td className="px-6 py-4">{user.role}</td>
                                        <td className="px-6 py-4">{manager?.name || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => openEditModal(user)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline">Edit</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
            {isModalOpen && (
                <Modal onClose={() => setIsModalOpen(false)} title={editingUser ? 'Edit User' : 'Add User'}>
                    <UserForm user={editingUser} onSave={handleSaveUser} onCancel={() => setIsModalOpen(false)} />
                </Modal>
            )}
        </>
    );
};

export default UserManagement;