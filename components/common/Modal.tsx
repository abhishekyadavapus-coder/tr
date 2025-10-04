import React from 'react';
import { ICONS } from '../../constants';

interface ModalProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, title, children }) => {
  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg m-4 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center p-5 border-b border-gray-200/80 dark:border-gray-700/60">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="w-5 h-5 block">{ICONS.x}</span>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;