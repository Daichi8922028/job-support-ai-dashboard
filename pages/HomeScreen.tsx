import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { LightBulbIcon, BuildingOffice2Icon, BriefcaseIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const HomeScreen: React.FC = () => {
  const { profile, isLoading: profileLoading } = useProfile();
  const { loadingAuth } = useAuth();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "おはようございます";
    if (hour < 18) return "こんにちは";
    return "こんばんは";
  }

  if (loadingAuth || profileLoading) {
    return (
      <div className="text-center p-8">
        <LoadingSpinner text="プロファイル情報を読み込んでいます..." size="lg" />
      </div>
    );
  }
  
  if (!profile) {
     // This case should ideally be handled by ProtectedRoute redirecting to profile-setup
    return (
      <div className="text-center p-8">
        <p>プロファイルが未設定です。設定画面へ移動してください。</p>
        <Link to="/profile-setup">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            プロフィール設定へ
          </button>
        </Link>
      </div>
    );
  }


  return (
    <div className="w-full min-h-screen relative bg-gradient-to-br from-slate-100 to-blue-100 overflow-hidden">
      {/* グリーティング表示（上部） */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 bg-white/90 backdrop-blur-sm rounded-xl p-3 md:p-4 shadow-lg max-w-[calc(100vw-2rem)]">
        <h1 className="text-lg md:text-2xl font-bold text-gray-800">
          {getGreeting()}、{profile.name || profile.email.split('@')[0]}さん！
        </h1>
        <p className="text-gray-600 text-xs md:text-sm mt-1">あなたの就職活動ダッシュボードへようこそ。</p>
      </div>
      
      {/* 中央ガイダンステキスト */}
      <div className="absolute top-[12%] md:top-[8%] left-1/2 transform -translate-x-1/2 z-10 text-center px-4">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">始めましょう！</h2>
        <p className="text-gray-600 text-base md:text-lg">メニューを選択してください</p>
      </div>
      
      {/* デスクトップ・タブレット用レイアウト (md以上) */}
      <div className="hidden md:block">
        {/* 自己分析マップ - 上部中央 */}
        <Link to="/self-analysis" className="group">
          <div className="w-[200px] lg:w-[250px] h-[200px] lg:h-[250px] top-[25%] left-1/2 transform -translate-x-1/2 absolute z-20">
            <div className="absolute inset-0 bg-blue-500/80 backdrop-blur-sm rounded-full border-4 border-blue-400/60 cursor-pointer group-hover:scale-105 group-hover:bg-blue-500/90 transition-all duration-300 group-hover:shadow-2xl group-hover:border-blue-300"></div>
            <div className="absolute inset-0 rounded-full bg-blue-300/40 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-6 lg:-mt-8">
              <div className="w-12 lg:w-16 h-12 lg:h-16 bg-white rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <LightBulbIcon className="w-6 lg:w-8 h-6 lg:h-8 text-blue-600" />
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-8 lg:mt-12 text-center">
              <h3 className="text-white text-lg lg:text-2xl font-bold font-['Inter'] drop-shadow-lg group-hover:scale-105 transition-transform duration-300">自己分析マップ</h3>
              <p className="text-blue-100 text-xs lg:text-sm mt-1 drop-shadow">AIと対話して自己理解を深める</p>
            </div>
          </div>
        </Link>
        
        {/* 業界分析 - 下部左 */}
        <Link to="/industry-analysis" className="group">
          <div className="w-[200px] lg:w-[250px] h-[200px] lg:h-[250px] bottom-[15%] left-[15%] absolute z-20">
            <div className="absolute inset-0 bg-green-500/80 backdrop-blur-sm rounded-full border-4 border-green-400/60 cursor-pointer group-hover:scale-105 group-hover:bg-green-500/90 transition-all duration-300 group-hover:shadow-2xl group-hover:border-green-300"></div>
            <div className="absolute inset-0 rounded-full bg-green-300/40 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-6 lg:-mt-8">
              <div className="w-12 lg:w-16 h-12 lg:h-16 bg-white rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <BriefcaseIcon className="w-6 lg:w-8 h-6 lg:h-8 text-green-600" />
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-8 lg:mt-12 text-center">
              <h3 className="text-white text-lg lg:text-2xl font-bold font-['Inter'] drop-shadow-lg group-hover:scale-105 transition-transform duration-300">業界分析</h3>
              <p className="text-green-100 text-xs lg:text-sm mt-1 drop-shadow">業界動向をAIが詳しく解説</p>
            </div>
          </div>
        </Link>
        
        {/* 企業情報整理 - 下部右 */}
        <Link to="/company-analysis" className="group">
          <div className="w-[200px] lg:w-[250px] h-[200px] lg:h-[250px] bottom-[15%] right-[15%] absolute z-20">
            <div className="absolute inset-0 bg-purple-500/80 backdrop-blur-sm rounded-full border-4 border-purple-400/60 cursor-pointer group-hover:scale-105 group-hover:bg-purple-500/90 transition-all duration-300 group-hover:shadow-2xl group-hover:border-purple-300"></div>
            <div className="absolute inset-0 rounded-full bg-purple-300/40 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-6 lg:-mt-8">
              <div className="w-12 lg:w-16 h-12 lg:h-16 bg-white rounded-full flex items-center justify-center mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <BuildingOffice2Icon className="w-6 lg:w-8 h-6 lg:h-8 text-purple-600" />
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-8 lg:mt-12 text-center">
              <h3 className="text-white text-lg lg:text-2xl font-bold font-['Inter'] drop-shadow-lg group-hover:scale-105 transition-transform duration-300">企業情報整理</h3>
              <p className="text-purple-100 text-xs lg:text-sm mt-1 drop-shadow">気になる企業をAIが分析</p>
            </div>
          </div>
        </Link>
      </div>
      
      {/* モバイル用レイアウト (sm以下) */}
      <div className="md:hidden flex flex-col items-center justify-center min-h-screen pt-24 pb-8 px-4">
        <div className="space-y-8 w-full max-w-sm">
          {/* 自己分析マップ */}
          <Link to="/self-analysis" className="group block">
            <div className="w-full h-32 bg-blue-500/80 backdrop-blur-sm rounded-2xl border-4 border-blue-400/60 cursor-pointer group-hover:scale-105 group-hover:bg-blue-500/90 transition-all duration-300 group-hover:shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-300/40 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300 rounded-2xl"></div>
              <div className="flex items-center h-full p-6">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <LightBulbIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-xl font-bold font-['Inter'] drop-shadow-lg">自己分析マップ</h3>
                  <p className="text-blue-100 text-sm mt-1 drop-shadow">AIと対話して自己理解を深める</p>
                </div>
              </div>
            </div>
          </Link>
          
          {/* 業界分析 */}
          <Link to="/industry-analysis" className="group block">
            <div className="w-full h-32 bg-green-500/80 backdrop-blur-sm rounded-2xl border-4 border-green-400/60 cursor-pointer group-hover:scale-105 group-hover:bg-green-500/90 transition-all duration-300 group-hover:shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-green-300/40 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300 rounded-2xl"></div>
              <div className="flex items-center h-full p-6">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <BriefcaseIcon className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-xl font-bold font-['Inter'] drop-shadow-lg">業界分析</h3>
                  <p className="text-green-100 text-sm mt-1 drop-shadow">業界動向をAIが詳しく解説</p>
                </div>
              </div>
            </div>
          </Link>
          
          {/* 企業情報整理 */}
          <Link to="/company-analysis" className="group block">
            <div className="w-full h-32 bg-purple-500/80 backdrop-blur-sm rounded-2xl border-4 border-purple-400/60 cursor-pointer group-hover:scale-105 group-hover:bg-purple-500/90 transition-all duration-300 group-hover:shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-purple-300/40 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300 rounded-2xl"></div>
              <div className="flex items-center h-full p-6">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <BuildingOffice2Icon className="w-8 h-8 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-xl font-bold font-['Inter'] drop-shadow-lg">企業情報整理</h3>
                  <p className="text-purple-100 text-sm mt-1 drop-shadow">気になる企業をAIが分析</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
