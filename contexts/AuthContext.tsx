import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleAuthProvider } from '../firebase'; // Import Firebase auth instance
import { 
  type User, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut as firebaseSignOut,
  type AuthError
} from 'firebase/auth';
import LoadingSpinner from '../components/LoadingSpinner'; // For initial auth state check

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  user: User | null; // Expose Firebase user object if needed
  loadingAuth: boolean; // To indicate if auth state is being determined
  loginWithEmail: (email: string, password: string) => Promise<User | null>;
  registerWithEmail: (email: string, password: string) => Promise<User | null>;
  loginWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true); // Start as true
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const handleAuthError = (error: AuthError): string => {
    console.error("Firebase Auth Error:", error.code, error.message);
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています。';
      case 'auth/invalid-email':
        return '無効なメールアドレスです。';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'メールアドレスまたはパスワードが正しくありません。';
      case 'auth/weak-password':
        return 'パスワードは6文字以上で入力してください。';
      case 'auth/popup-closed-by-user':
        return '認証ポップアップが閉じられました。もう一度お試しください。';
      case 'auth/cancelled-popup-request':
        return '複数の認証リクエストがありました。ポップアップを閉じて再試行してください。'
      default:
        return '認証中にエラーが発生しました。しばらくしてから再度お試しください。';
    }
  };
  
  const loginWithEmail = async (email: string, password: string): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw new Error(handleAuthError(error as AuthError));
    }
  };

  const registerWithEmail = async (email: string, password: string): Promise<User | null> => {
     try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw new Error(handleAuthError(error as AuthError));
    }
  };
  
  const loginWithGoogle = async (): Promise<User | null> => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      return result.user;
    } catch (error) {
      // Don't navigate on cancel, just throw error
      if ((error as AuthError).code === 'auth/popup-closed-by-user' || (error as AuthError).code === 'auth/cancelled-popup-request') {
         throw new Error(handleAuthError(error as AuthError));
      }
      throw new Error(handleAuthError(error as AuthError));
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      // User state will be updated by onAuthStateChanged
      // No need to clear profile manually here, ProfileContext will react to userId change
      navigate('/auth'); 
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle sign out error if necessary
    }
  };

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <LoadingSpinner text="認証情報を確認中..." size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user, 
      userId: user?.uid || null, 
      userEmail: user?.email || null,
      user,
      loadingAuth,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
