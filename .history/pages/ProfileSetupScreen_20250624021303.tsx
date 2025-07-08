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

  const handleIndustryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selectedIndustries: string[] = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        selectedIndustries.push(options[i].value);
      }
    }
    if (selectedIndustries.length <= 3) {
      setDesiredIndustries(selectedIndustries);
      setError('');
    } else {
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
            options={DEFAULT_ACADEMIC_YEARS.map(year => ({ value: year, label: year }))}
            required
            placeholder="学年を選択してください"
            disabled={isSubmitting}
          />
          <div>
            <label htmlFor="desiredIndustries" className="block text-sm font-medium text-gray-700 mb-1">
              希望業界 (複数選択可、3つまで)
            </label>
            <div className="relative">
              <BriefcaseIcon className="pointer-events-none absolute top-1/2 left-3 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="desiredIndustries"
                name="desiredIndustries"
                multiple
                value={desiredIndustries}
                onChange={handleIndustryChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm h-32"
                required
                disabled={isSubmitting}
              >
                {DEFAULT_INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-500">Ctrl (Cmd on Mac) を押しながらクリックで複数選択できます。</p>
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
