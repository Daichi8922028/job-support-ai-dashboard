import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { UserProfile } from '../types';
import { useAuth } from './AuthContext';
import { db, doc, getDoc, setDoc, serverTimestamp } from '../firebase';

interface ProfileContextType {
  profile: UserProfile | null;
  setProfileData: (data: Omit<UserProfile, 'id' | 'email'>) => Promise<void>;
  clearProfile: () => void; // May not be needed as much with Firebase
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { userId, userEmail, isAuthenticated, loadingAuth } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated && userId && userEmail) {
        setIsLoading(true);
        const profileRef = doc(db, 'users', userId);
        try {
          const docSnap = await getDoc(profileRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Omit<UserProfile, 'id'>; // Firestore data doesn't include id itself
            setProfileState({ id: userId, ...data });
          } else {
            // Profile doesn't exist yet, e.g. new user after registration
            // Or if user registered but didn't complete profile setup
            setProfileState(null); 
          }
        } catch (error) {
          console.error("Error fetching user profile from Firestore:", error);
          setProfileState(null);
        } finally {
          setIsLoading(false);
        }
      } else if (!isAuthenticated && !loadingAuth) { // Only clear if auth is resolved and user is not authenticated
        setProfileState(null);
        setIsLoading(false);
      }
    };

    if (!loadingAuth) { // Wait for auth state to be resolved
        fetchProfile();
    }
  }, [isAuthenticated, userId, userEmail, loadingAuth]);

  const setProfileData = async (data: Omit<UserProfile, 'id' | 'email'>) => {
    if (userId && userEmail) {
      setIsLoading(true);
      const profileRef = doc(db, 'users', userId);
      const newProfileData: UserProfile = {
        id: userId,
        email: userEmail,
        ...data,
      };
      
      try {
        await setDoc(profileRef, {
          email: userEmail, // Ensure email is always set/updated from auth
          name: data.name || '',
          academicYear: data.academicYear,
          desiredIndustries: data.desiredIndustries,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true }); // Use merge to avoid overwriting createdAt on updates

        setProfileState(newProfileData);

      } catch (error) {
        console.error("Error saving profile to Firestore:", error);
        // Potentially revert local state or show error to user
      } finally {
        setIsLoading(false);
      }
    }
  };

  const clearProfile = () => {
    // This is mostly for local state clearing if user logs out.
    // Firestore data remains until user is deleted or data is explicitly removed.
    setProfileState(null);
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfileData, clearProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
