import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200/80 dark:border-gray-700/60 transition-shadow duration-300 hover:shadow-lg">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
      <div className="px-6 py-5">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
      </div>
      <div className="p-6 pt-0">
        {children}
      </div>
    </div>
  );
};

export default Card;