import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import TimelineItem from '../components/TimelineItem';
import Button from '../components/Button';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { TimelineStep } from '../types';
import { INITIAL_TIMELINE_STEPS } from '../constants';
import { LightBulbIcon, BuildingOffice2Icon, BriefcaseIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { db, collection, doc, getDocs, updateDoc, Timestamp, onSnapshot } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';

const HomeScreen: React.FC = () => {
  const { profile, isLoading: profileLoading } = useProfile();
  const { userId, loadingAuth } = useAuth();
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  useEffect(() => {
    if (!userId || loadingAuth) { // Ensure userId is available and auth is not loading
        setLoadingTimeline(false);
        return;
    }

    setLoadingTimeline(true);
    const timelineCollectionRef = collection(db, 'users', userId, 'timelineSteps');
    
    // Use onSnapshot for real-time updates if desired, or getDocs for one-time fetch.
    // For this example, let's use onSnapshot.
    const unsubscribe = onSnapshot(timelineCollectionRef, (querySnapshot) => {
      const stepsFromFirestore: TimelineStep[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        stepsFromFirestore.push({
          id: docSnap.id,
          title: data.title,
          description: data.description,
          status: data.status,
          // Convert Firestore Timestamp to JS Date if it exists
          dueDate: data.dueDate && data.dueDate.toDate ? data.dueDate.toDate() : undefined,
        });
      });
      // Sort steps, perhaps by a predefined order or creation date if available
      // For now, if using INITIAL_TIMELINE_STEPS IDs, sort by them.
      stepsFromFirestore.sort((a, b) => parseInt(a.id) - parseInt(b.id)); 
      setTimelineSteps(stepsFromFirestore);
      setLoadingTimeline(false);
    }, (error) => {
      console.error("Error fetching timeline steps from Firestore:", error);
      setTimelineSteps(INITIAL_TIMELINE_STEPS); // Fallback or show error
      setLoadingTimeline(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount

  }, [userId, loadingAuth]);

  useEffect(() => {
    if (timelineSteps.length > 0) {
      const completedSteps = timelineSteps.filter(step => step.status === 'completed').length;
      const totalSteps = timelineSteps.length;
      setProgress(totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0);
    } else {
      setProgress(0);
    }
  }, [timelineSteps]);

  const toggleStepStatus = async (id: string) => {
    if (!userId) return;

    const stepToUpdate = timelineSteps.find(step => step.id === id);
    if (!stepToUpdate) return;

    let newStatus: TimelineStep['status'];
    if (stepToUpdate.status === 'completed') newStatus = 'pending';
    else if (stepToUpdate.status === 'pending') newStatus = 'in-progress';
    else newStatus = 'completed'; // from in-progress to completed

    const stepRef = doc(db, 'users', userId, 'timelineSteps', id);
    try {
      await updateDoc(stepRef, { status: newStatus });
      // Local state will be updated by onSnapshot listener.
      // If not using onSnapshot, update local state here:
      // setTimelineSteps(prevSteps =>
      //   prevSteps.map(step => (step.id === id ? { ...step, status: newStatus } : step))
      // );
    } catch (error) {
      console.error("Error updating timeline step status:", error);
      // Handle error (e.g., show a notification to the user)
    }
  };
  
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
            <Button variant="primary">プロフィール設定へ</Button>
        </Link>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-3xl font-semibold text-gray-800">
          {getGreeting()}、{profile.name || profile.email.split('@')[0]}さん！
        </h1>
        <p className="text-gray-600 mt-1">あなたの就職活動ダッシュボードへようこそ。</p>
      </Card>

      <Card title="進捗状況">
        {loadingTimeline ? <LoadingSpinner size="sm" /> : 
          timelineSteps.length > 0 ? (
            <>
              <ProgressBar value={progress} label="全体の進捗" />
              <p className="text-sm text-gray-500 mt-2">
                {timelineSteps.filter(s => s.status === 'completed').length} / {timelineSteps.length} ステップ完了
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">タイムラインデータがありません。</p>
          )
        }
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/self-analysis">
          <Card className="hover:shadow-xl transition-shadow bg-blue-50 hover:bg-blue-100">
            <div className="flex items-center space-x-3">
              <LightBulbIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-blue-700">自己分析マップ</h3>
                <p className="text-sm text-blue-600">AIと対話して自己理解を深める</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/company-analysis">
          <Card className="hover:shadow-xl transition-shadow bg-green-50 hover:bg-green-100">
             <div className="flex items-center space-x-3">
              <BuildingOffice2Icon className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-700">企業分析AIチャット</h3>
                <p className="text-sm text-green-600">気になる企業をAIが分析</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/industry-analysis">
          <Card className="hover:shadow-xl transition-shadow bg-purple-50 hover:bg-purple-100">
            <div className="flex items-center space-x-3">
              <BriefcaseIcon className="w-8 h-8 text-purple-600" />
              <div>
                <h3 className="text-lg font-semibold text-purple-700">業界分析AIチャット</h3>
                <p className="text-sm text-purple-600">業界動向をAIが解説</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <Card title="就活ステップタイムライン">
      {loadingTimeline ? <LoadingSpinner text="タイムラインを読み込み中..." /> : 
        timelineSteps.length > 0 ? (
            <ol className="relative border-s border-gray-200 dark:border-gray-700 mt-4">
            {timelineSteps.map((step, index) => (
                <div key={step.id} className="relative mb-2">
                <TimelineItem step={step} isLast={index === timelineSteps.length -1}/>
                <div className="absolute top-1/2 -translate-y-1/2 right-0 md:right-4">
                    <Button
                        size="sm"
                        variant={step.status === 'completed' ? 'secondary' : 'primary'}
                        onClick={() => toggleStepStatus(step.id)}
                        leftIcon={step.status === 'completed' ? <CheckCircleIcon className="w-4 h-4"/> : undefined}
                    >
                        {step.status === 'completed' ? '未完了に戻す' : step.status === 'in-progress' ? '完了にする' : '開始する'}
                    </Button>
                </div>
                </div>
            ))}
            </ol>
        ) : (
            <p className="text-sm text-gray-500 text-center py-4">タイムラインステップが見つかりませんでした。</p>
        )
        }
      </Card>
    </div>
  );
};

export default HomeScreen;
