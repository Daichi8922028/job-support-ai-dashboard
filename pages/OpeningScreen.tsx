
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '../constants';
import LoadingSpinner from '../components/LoadingSpinner'; 

const OpeningScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/auth'); // Redirect to auth screen after a delay
    }, 3000); // 3 seconds delay

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6">
      <div className="text-center"> {/* Removed animate-fadeIn */}
        {/* Placeholder for a logo - using text for now */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24 mx-auto mb-6 text-white animate-pulse">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
        </svg>
        <h1 className="text-5xl font-bold mb-4">{APP_NAME}</h1>
        <p className="text-xl text-blue-200 mb-8">あなたの就職活動を全力サポート</p>
        <LoadingSpinner size="md" color="text-white" text="準備中..." />
      </div>
      {/* Removed style jsx block */}
    </div>
  );
};

export default OpeningScreen;
