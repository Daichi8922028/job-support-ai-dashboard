import React, { useState, ChangeEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Added Link import
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { DEFAULT_ACADEMIC_YEARS, DEFAULT_INDUSTRIES } from '../constants';
import { UserCircleIcon, EnvelopeIcon, AcademicCapIcon, BriefcaseIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const SettingsScreen: React.FC = () => {
  const { userEmail, logout, loadingAuth } = useAuth();
  const { profile, setProfileData, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [desiredIndustries, setDesiredIndustries] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAcademicYear(profile.academicYear || '');
      setDesiredIndustries(profile.desiredIndustries || []);
    } else if (!profileLoading && !loadingAuth && !profile) {
        // If profile is definitively not there (and not loading), maybe redirect or show specific message
        // This screen assumes profile exists. ProtectedRoute should handle if profile is null.
    }
  }, [profile, profileLoading, loadingAuth]);

  const handleIndustryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    let newIndustries: string[];

    if (checked) {
      newIndustries = [...desiredIndustries, value];
    } else {
      newIndustries = desiredIndustries.filter((industry) => industry !== value);
    }

    if (newIndustries.length <= 3) {
      setDesiredIndustries(newIndustries);
      setMessage('');
    } else {
      setMessage('希望業界は3つまで選択できます。');
    }
  };

  const handleSaveProfile = async () => {
    if (!academicYear || desiredIndustries.length === 0) {
      setMessage('学年と希望業界は必須です。');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
        await setProfileData({ name, academicYear, desiredIndustries });
        setIsEditing(false);
        setMessage('プロフィールが更新されました。');
    } catch (error) {
        console.error("Error updating profile:", error);
        setMessage('プロフィールの更新中にエラーが発生しました。');
    } finally {
        setIsSubmitting(false);
        setTimeout(() => setMessage(''), 3000);
    }
  };
  
  const handleSignOut = async () => {
    await logout(); // AuthContext logout handles Firebase sign out and navigation
    // ProfileContext will clear profile due to auth state change
  }

  if (loadingAuth || profileLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto p-4 text-center">
        <LoadingSpinner text="設定情報を読み込んでいます..." size="lg" />
      </div>
    );
  }

  if (!profile) {
    // This should ideally be caught by ProtectedRoute or App logic
    return (
        <div className="space-y-6 max-w-2xl mx-auto p-4 text-center">
            <p>プロファイル情報が見つかりません。ホームページに戻るか、再ログインしてください。</p>
            <Link to="/"><Button variant="primary">ホームへ</Button></Link>
        </div>
    );
  }


  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold text-gray-800">アカウント設定</h1>

      {message && <p className={`p-3 rounded-md text-sm ${message.includes('更新され') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</p>}

      <Card title="基本情報">
        <div className="space-y-4">
          <div className="flex items-center">
            <EnvelopeIcon className="w-5 h-5 text-gray-500 mr-3"/>
            <span className="text-gray-700">メールアドレス: {userEmail}</span>
          </div>
          {!isEditing ? (
            <>
              <div className="flex items-center">
                <UserCircleIcon className="w-5 h-5 text-gray-500 mr-3"/>
                <span className="text-gray-700">氏名: {profile.name || '未設定'}</span>
              </div>
              <div className="flex items-center">
                <AcademicCapIcon className="w-5 h-5 text-gray-500 mr-3"/>
                <span className="text-gray-700">学年: {profile.academicYear}</span>
              </div>
              <div className="flex items-start">
                <BriefcaseIcon className="w-5 h-5 text-gray-500 mr-3 mt-1"/>
                <div>
                  <span className="text-gray-700">希望業界:</span>
                  {profile.desiredIndustries.length > 0 ? (
                    <ul className="list-disc list-inside ml-1">
                        {profile.desiredIndustries.map(ind => <li key={ind} className="text-gray-600">{ind}</li>)}
                    </ul>
                  ) : (
                    <span className="text-gray-500 ml-1">未設定</span>
                  )}
                </div>
              </div>
              <Button onClick={() => setIsEditing(true)} variant="secondary" disabled={isSubmitting}>プロフィールを編集</Button>
            </>
          ) : (
            <div className="space-y-4 pt-4 border-t">
              <Input 
                label="氏名 (任意)" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                Icon={UserCircleIcon}
                disabled={isSubmitting}
              />
              <Select
                label="学年"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                options={[
                  { value: '', label: '学年を選択してください' },
                  ...DEFAULT_ACADEMIC_YEARS.map(year => ({ value: year, label: year }))
                ]}
                required
                disabled={isSubmitting}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  希望業界 (3つまで選択)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-300 rounded-md">
                  {DEFAULT_INDUSTRIES.map(industry => (
                    <label key={industry} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        value={industry}
                        checked={desiredIndustries.includes(industry)}
                        onChange={handleIndustryChange}
                        disabled={isSubmitting || (desiredIndustries.length >= 3 && !desiredIndustries.includes(industry))}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span>{industry}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSaveProfile} variant="primary" isLoading={isSubmitting}>保存する</Button>
                <Button onClick={() => { setIsEditing(false); setMessage(''); }} variant="ghost" disabled={isSubmitting}>キャンセル</Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="アカウント操作">
        <Button 
            onClick={handleSignOut} 
            variant="danger" 
            isLoading={isSubmitting} // Can use same loading state or a specific one for logout
            leftIcon={<ArrowLeftOnRectangleIcon className="w-5 h-5"/>}
        >
            サインアウト
        </Button>
        <p className="text-xs text-gray-500 mt-2">
            サインアウトすると、再度ログインが必要になります。
        </p>
      </Card>
    </div>
  );
};

export default SettingsScreen;
