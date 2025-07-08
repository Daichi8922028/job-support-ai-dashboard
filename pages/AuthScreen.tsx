import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { APP_NAME } from '../constants';
import { AtSymbolIcon, LockClosedIcon, UserPlusIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmail, registerWithEmail, loginWithGoogle, isAuthenticated, loadingAuth } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();

  const from = location.state?.from?.pathname || '/';

  // Redirect if already authenticated and profile exists or profile setup is the target
   useEffect(() => {
    if (!loadingAuth && isAuthenticated) {
      if (profile || from === '/profile-setup') {
        navigate(from, { replace: true });
      } else if (!profileLoading && !profile) {
        navigate('/profile-setup', { replace: true, state: {from: location} });
      }
    }
  }, [isAuthenticated, loadingAuth, profile, profileLoading, navigate, from, location]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError('パスワードが一致しません。');
      setLoading(false);
      return;
    }

    try {
      let user;
      if (isLogin) {
        user = await loginWithEmail(email, password);
      } else {
        user = await registerWithEmail(email, password);
      }

      if (user) {
        // Navigation is handled by the useEffect above, or by ProtectedRoute logic
        // For new registrations, they will be directed to profile-setup if profile is null.
        // For logins, if profile exists, to 'from', else to 'profile-setup'.
      }
    } catch (err: any) {
      setError(err.message || '認証に失敗しました。');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user) {
        // Similar to email/password, navigation is handled by useEffect or ProtectedRoute
      }
    } catch (err: any) {
       setError(err.message || 'Google認証に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth || (isAuthenticated && profileLoading)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
            <Card className="w-full max-w-md text-center">
                <p>状態を確認中...</p>
            </Card>
        </div>
      );
  }
  // If authenticated and loadingAuth is false, useEffect should have redirected.
  // This screen should only be visible if not authenticated.
  if (isAuthenticated && !loadingAuth) {
    return null; // Or a redirect, though useEffect should handle it.
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-blue-600">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          <h2 className="text-3xl font-bold text-gray-800">{isLogin ? 'ログイン' : '新規登録'}</h2>
          <p className="text-gray-600">で {APP_NAME} を始めましょう</p>
        </div>

        {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="メールアドレス"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            Icon={AtSymbolIcon}
            placeholder="your@email.com"
            disabled={loading}
          />
          <Input
            label="パスワード"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            Icon={LockClosedIcon}
            placeholder="********"
            disabled={loading}
          />
          {!isLogin && (
            <Input
              label="パスワード (確認)"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              Icon={LockClosedIcon}
              placeholder="********"
              disabled={loading}
            />
          )}
          <Button type="submit" variant="primary" className="w-full" isLoading={loading} leftIcon={isLogin ? <ArrowRightOnRectangleIcon className="w-5 h-5"/> : <UserPlusIcon className="w-5 h-5"/>}>
            {isLogin ? 'ログイン' : '登録する'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError('');}} 
            className="text-sm text-blue-600 hover:underline"
            disabled={loading}
          >
            {isLogin ? 'アカウントをお持ちでないですか？新規登録' : '既にアカウントをお持ちですか？ログイン'}
          </button>
        </div>
        
        <div className="mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">または</span>
                </div>
            </div>
            <Button 
                variant="secondary" 
                className="w-full mt-4" 
                onClick={handleGoogleAuth} 
                isLoading={loading}
                leftIcon={<img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5"/>}
            >
                Googleで{isLogin ? 'ログイン' : '登録'}
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default AuthScreen;
