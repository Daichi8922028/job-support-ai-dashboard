
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';
import { UserCircleIcon, ArrowLeftOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { logout, userEmail } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-white shadow-md fixed w-full z-20 top-0 left-0 h-16 flex items-center">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={onMenuClick} className="p-2 rounded-md text-gray-500 hover:bg-gray-100 md:hidden">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <Link to="/" className="text-2xl font-bold text-blue-600">
            {APP_NAME}
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {userEmail && (
            <span className="text-sm text-gray-600 hidden md:block">{userEmail}</span>
          )}
          <Link
            to="/settings"
            className={`p-2 rounded-full hover:bg-gray-200 ${location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-500'}`}
            title="Settings"
          >
            <UserCircleIcon className="w-6 h-6" /> {/* Replaced hero-icon */}
          </Link>
          <button
            onClick={logout}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-red-600"
            title="Sign Out"
          >
            <ArrowLeftOnRectangleIcon className="w-6 h-6" /> {/* Replaced hero-icon */}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
