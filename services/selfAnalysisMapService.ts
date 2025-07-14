import {
  db,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from '../firebase';
import { SelfAnalysisMap, Node, Connection, SelfAnalysisResult } from '../types';

const COLLECTION_NAME = 'selfAnalysisMaps';

/**
 * オブジェクトからundefined値を再帰的に除去する
 */
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
};

/**
 * 自己分析マップを保存する
 */
export const saveSelfAnalysisMap = async (
  userId: string,
  title: string,
  nodes: Record<string, Node>,
  connections: Connection[],
  analysisResult?: SelfAnalysisResult,
  mapId?: string
): Promise<string> => {
  try {
    console.log('=== selfAnalysisMapService 保存開始 ===');
    console.log('保存パラメータ:', {
      userId,
      title,
      nodesCount: Object.keys(nodes).length,
      connectionsCount: connections.length,
      hasAnalysisResult: !!analysisResult,
      isUpdate: !!mapId
    });

    // Firebase接続状態の確認
    console.log('Firebase接続状態:', {
      db: !!db,
      collectionName: COLLECTION_NAME
    });

    if (!userId) {
      throw new Error('ユーザーIDが提供されていません。');
    }

    if (!title || title.trim() === '') {
      throw new Error('マップタイトルが空です。');
    }

    // データの詳細ログ
    console.log('保存前の生データ:', {
      nodesKeys: Object.keys(nodes),
      sampleNode: Object.values(nodes)[0],
      connectionsCount: connections.length,
      analysisResultKeys: analysisResult ? Object.keys(analysisResult) : null
    });

    // undefinedの値を除去してFirestore互換のデータにする
    const cleanedNodes = removeUndefinedValues(nodes);
    const cleanedConnections = removeUndefinedValues(connections);
    const cleanedAnalysisResult = removeUndefinedValues(analysisResult);
    
    console.log('クリーンアップ後のデータ:', {
      cleanedNodesKeys: Object.keys(cleanedNodes),
      cleanedConnectionsCount: cleanedConnections.length,
      hasCleanedAnalysisResult: !!cleanedAnalysisResult
    });
    
    const mapData = {
      title: title.trim(),
      nodes: cleanedNodes,
      connections: cleanedConnections,
      analysisResult: cleanedAnalysisResult || null,
      userId,
      updatedAt: serverTimestamp(),
    };
    
    console.log('Firestore保存データ構造:', {
      title: mapData.title,
      nodesCount: Object.keys(mapData.nodes).length,
      connectionsCount: mapData.connections.length,
      userId: mapData.userId,
      hasUpdatedAt: !!mapData.updatedAt
    });

    if (mapId) {
      // 既存マップの更新
      console.log('🔄 既存マップ更新開始:', mapId);
      const mapRef = doc(db, COLLECTION_NAME, mapId);
      console.log('Document reference created:', {
        path: mapRef.path,
        id: mapRef.id
      });
      
      await updateDoc(mapRef, mapData);
      console.log('✅ 既存マップ更新完了:', mapId);
      return mapId;
    } else {
      // 新規マップの作成
      console.log('🆕 新規マップ作成開始');
      const newMapData = {
        ...mapData,
        createdAt: serverTimestamp(),
      };
      
      console.log('新規マップデータ:', {
        ...newMapData,
        createdAt: '[ServerTimestamp]',
        updatedAt: '[ServerTimestamp]'
      });
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newMapData);
      console.log('✅ 新規マップ作成完了:', docRef.id);
      return docRef.id;
    }
  } catch (error: any) {
    console.error('❌ 自己分析マップの保存エラー詳細:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorName: error.name,
      stack: error.stack,
      fullError: error
    });
    
    // Firebaseエラーコードの詳細解析
    switch (error.code) {
      case 'permission-denied':
        console.error('🚫 権限拒否: Firestoreセキュリティルールで拒否されました');
        console.error('対処法: Firebase Console でセキュリティルールを確認してください');
        throw new Error('保存権限がありません。Firestoreセキュリティルールの設定を確認してください。');
      
      case 'unauthenticated':
        console.error('🔐 認証エラー: ユーザーが認証されていません');
        throw new Error('認証エラーです。再ログインしてください。');
      
      case 'unavailable':
        console.error('📡 サービス利用不可: Firestoreサービスがダウンしています');
        throw new Error('Firestoreサービスが利用できません。しばらく時間をおいて再試行してください。');
      
      case 'failed-precondition':
        console.error('⚙️ 前提条件エラー: Firebase設定に問題があります');
        throw new Error('Firebase設定に問題があります。管理者にお問い合わせください。');
      
      case 'invalid-argument':
        console.error('📝 無効な引数: 保存データに問題があります');
        throw new Error('保存データが無効です。データを確認してください。');
      
      default:
        console.error('❓ 未知のエラー:', error.code || 'no-code');
        throw new Error(`マップの保存に失敗しました [${error.code || 'unknown'}]: ${error.message}`);
    }
  } finally {
    console.log('=== selfAnalysisMapService 保存終了 ===');
  }
};

/**
 * 自己分析マップを読み込む
 */
export const loadSelfAnalysisMap = async (mapId: string): Promise<SelfAnalysisMap | null> => {
  try {
    const mapRef = doc(db, COLLECTION_NAME, mapId);
    const mapSnap = await getDoc(mapRef);
    
    if (mapSnap.exists()) {
      const data = mapSnap.data();
      return {
        id: mapSnap.id,
        title: data.title,
        nodes: data.nodes,
        connections: data.connections,
        analysisResult: data.analysisResult,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        userId: data.userId,
      } as SelfAnalysisMap;
    }
    
    return null;
  } catch (error) {
    console.error('自己分析マップの読み込みエラー:', error);
    throw new Error('マップの読み込みに失敗しました。');
  }
};

/**
 * ユーザーの自己分析マップ一覧を取得する
 * インデックスエラーを回避するため、orderByを使わずに取得後にソート
 */
export const getUserSelfAnalysisMaps = async (userId: string): Promise<SelfAnalysisMap[]> => {
  try {
    console.log('マップ一覧取得開始:', userId);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const maps: SelfAnalysisMap[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      maps.push({
        id: doc.id,
        title: data.title,
        nodes: data.nodes,
        connections: data.connections,
        analysisResult: data.analysisResult,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        userId: data.userId,
      } as SelfAnalysisMap);
    });
    
    // クライアントサイドでソート（updatedAt降順）
    maps.sort((a, b) => {
      const aTime = a.updatedAt && typeof a.updatedAt === 'object' && 'seconds' in a.updatedAt
        ? a.updatedAt.seconds
        : new Date(a.updatedAt).getTime() / 1000;
      const bTime = b.updatedAt && typeof b.updatedAt === 'object' && 'seconds' in b.updatedAt
        ? b.updatedAt.seconds
        : new Date(b.updatedAt).getTime() / 1000;
      return bTime - aTime;
    });
    
    console.log('マップ一覧取得完了:', maps.length, '件');
    return maps;
  } catch (error) {
    console.error('自己分析マップ一覧の取得エラー:', error);
    throw new Error('マップ一覧の取得に失敗しました。');
  }
};

/**
 * 自己分析マップを削除する
 */
export const deleteSelfAnalysisMap = async (mapId: string): Promise<void> => {
  try {
    const mapRef = doc(db, COLLECTION_NAME, mapId);
    await updateDoc(mapRef, {
      deletedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('自己分析マップの削除エラー:', error);
    throw new Error('マップの削除に失敗しました。');
  }
};

/**
 * マップの概要情報を取得する（タイトルと更新日のみ）
 */
export const getMapSummary = async (mapId: string): Promise<{ title: string; updatedAt: Timestamp } | null> => {
  try {
    const mapRef = doc(db, COLLECTION_NAME, mapId);
    const mapSnap = await getDoc(mapRef);
    
    if (mapSnap.exists()) {
      const data = mapSnap.data();
      return {
        title: data.title,
        updatedAt: data.updatedAt,
      };
    }
    
    return null;
  } catch (error) {
    console.error('マップ概要の取得エラー:', error);
    return null;
  }
};