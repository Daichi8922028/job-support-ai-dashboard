
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChatSession } from '../types'; // Assuming ChatSession is defined
import { HomeIcon, LightBulbIcon, BuildingOffice2Icon, BriefcaseIcon, Cog6ToothIcon, CommandLineIcon, ChevronDownIcon, ChevronUpIcon, PlusCircleIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import Button from './Button'; // Added import for Button

interface NavItem {
  path: string;
  name: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { path: '/', name: 'ホーム', icon: HomeIcon },
  { path: '/self-analysis', name: '自己分析マップ', icon: LightBulbIcon },
  { path: '/company-analysis', name: '企業分析AIチャット', icon: BuildingOffice2Icon },
  { path: '/industry-analysis', name: '業界分析AIチャット', icon: BriefcaseIcon },
];

const secondaryNavItems: NavItem[] = [
  { path: '/gemini-test', name: 'Gemini APIテスト', icon: CommandLineIcon },
  { path: '/settings', name: '設定', icon: Cog6ToothIcon },
];

// Mock chat sessions
const mockChatSessions: ChatSession[] = [
  { id: 'session1', title: '自己分析 (強み)', lastUpdated: new Date(), messages: [], type: 'self' },
  { id: 'session2', title: '〇〇株式会社について', lastUpdated: new Date(), messages: [], type: 'company' },
  { id: 'session3', title: 'IT業界の動向', lastUpdated: new Date(), messages: [], type: 'industry' },
];


const NavLinkItem: React.FC<{ item: NavItem }> = ({ item }) => {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  return (
    <Link
      to={item.path}
      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} /> {/* Replaced hero-icon */}
      <span>{item.name}</span>
    </Link>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [chatHistoryOpen, setChatHistoryOpen] = useState(true);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-200 p-4 flex flex-col space-y-4 overflow-y-auto z-40 transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav className="flex-grow space-y-1 pt-16"> {/* Add padding top to clear navbar */}
          {mainNavItems.map(item => <NavLinkItem key={item.path} item={item} />)}
        </nav>

      <div>
        <button 
          onClick={() => setChatHistoryOpen(!chatHistoryOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <span className="flex items-center space-x-3">
            <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-gray-500" /> {/* Replaced hero-icon */}
            <span>チャット履歴</span>
          </span>
          {chatHistoryOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />} {/* Already sized */}
        </button>
        {chatHistoryOpen && (
          <div className="mt-2 space-y-1 pl-3">
            {mockChatSessions.map(session => (
              <Link
                key={session.id}
                // TODO: Update path to actual chat session path e.g. /chat/${session.type}/${session.id}
                to={`/${session.type}-analysis`} 
                className="block px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-md truncate"
                title={session.title}
              >
                {session.title}
              </Link>
            ))}
            <Button variant="ghost" size="sm" className="w-full mt-1 text-blue-600">
              <PlusCircleIcon className="w-4 h-4 mr-1" /> {/* Replaced hero-icon, kept existing size */}
              新規チャット
            </Button>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <nav className="space-y-1">
          {secondaryNavItems.map(item => <NavLinkItem key={item.path} item={item} />)}
        </nav>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
