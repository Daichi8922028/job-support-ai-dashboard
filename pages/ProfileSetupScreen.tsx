import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Card from '../components/Card';
import { DEFAULT_ACADEMIC_YEARS, DEFAULT_INDUSTRIES } from '../constants';
import { UserCircleIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const ProfileSetupScreen: React.FC = () => {
  const { profile, setProfileData, isLoading: profileLoading } = useProfile();
  const { userEmail, userId, isAuthenticated, loadingAuth } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [desiredIndustries, setDesiredIndustries] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isLoading to avoid conflict
  const [error, setError] = useState('');

  useEffect(() => {
    // If auth is done loading, and user is not authenticated, redirect.
    if (!loadingAuth && !isAuthenticated) {
      navigate('/auth', { replace: true });
      return;
    }
    // If profile already exists, redirect to home.
    // This check should happen after auth and profile are done loading.
    if (!loadingAuth && !profileLoading && profile) {
      navigate('/', { replace: true });
      return;
    }

    // Pre-fill form if profile data becomes available (e.g., from a partial save attempt or race condition)
    // This is less likely if the above redirect works correctly.
    if (profile) {
      setName(profile.name || '');
      setAcademicYear(profile.academicYear || '');
      setDesiredIndustries(profile.desiredIndustries || []);
    }
  }, [profile, isAuthenticated, loadingAuth, profileLoading, navigate]);

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
      setError('');
    } else {
      // Prevent checking more than 3 boxes by not updating the state
      setError('希望業界は3つまで選択できます。');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!academicYear || desiredIndustries.length === 0) {
      setError('学年と希望業界は必須です。');
      setIsSubmitting(false);
      return;
    }
    
    if (!userId || !userEmail) {
        setError('ユーザー情報が取得できませんでした。再度ログインしてください。');
        setIsSubmitting(false);
        return;
    }

    try {
      await setProfileData({ name, academicYear, desiredIndustries });
      // ProfileContext will update the profile state.
      // The useEffect above or ProtectedRoute logic will handle navigation to '/'
      // once profile is set. Explicit navigation here might lead to race conditions.
      navigate('/', { replace: true }); // Navigate to home after profile setup is successful
    } catch (err) {
        console.error("Profile setup error:", err);
        setError('プロフィールの保存中にエラーが発生しました。');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  // Show loading spinner if auth or initial profile check is in progress
  if (loadingAuth || (!profile && profileLoading && isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <LoadingSpinner text="情報を読み込み中..." size="lg"/>
      </div>
    );
  }
  
  // If authenticated and profile already exists, this component shouldn't be rendered (due to redirect).
  // If not authenticated, also shouldn't be rendered.

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-lg">
        <div className="text-center mb-6">
          <UserCircleIcon className="w-16 h-16 mx-auto text-blue-600 mb-3" />
          <h2 className="text-2xl font-semibold text-gray-800">プロフィール設定</h2>
          <p className="text-gray-600">就職活動を始めるために、基本情報を入力してください。</p>
          {userEmail && <p className="text-sm text-gray-500 mt-1">メールアドレス: {userEmail}</p>}
        </div>

        {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
           <Input
            label="氏名 (任意)"
            name="name"
            type="text"
            value={name}
            Icon={UserCircleIcon}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
            disabled={isSubmitting}
          />
          <Select
            label="学年"
            name="academicYear"
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

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            プロフィールを保存して開始
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ProfileSetupScreen;
