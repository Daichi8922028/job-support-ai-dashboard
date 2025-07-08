// Assuming firebase.Timestamp is the type for Firestore timestamps
// For simplicity in React components, they often get converted to Date objects upon retrieval.
// This type definition reflects the data as it might be structured in components AFTER conversion.
// If dealing directly with Firestore data, these could be firebase.firestore.Timestamp.
import { Timestamp as FirebaseTimestamp } from 'firebase/firestore'; // Import Firebase's Timestamp


export interface UserProfile {
  id: string; // Firebase UID
  email: string; // From auth
  academicYear: string;
  desiredIndustries: string[];
  name?: string; // Optional name
  createdAt?: Date | FirebaseTimestamp; // Store as Firebase Timestamp, use as Date in app
  updatedAt?: Date | FirebaseTimestamp; // Store as Firebase Timestamp, use as Date in app
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date | FirebaseTimestamp; // Can be Date or Firebase Timestamp
  metadata?: Record<string, any>; // For potential grounding chunks or other info
}

export interface ChatSession {
  id:string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: Date | FirebaseTimestamp;
  type: 'self' | 'company' | 'industry' | 'general';
}

export interface TimelineStep {
  id: string; // Can be predefined ID from constants or Firestore generated ID
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: Date | FirebaseTimestamp; // Can be Date or Firebase Timestamp
}

// For Gemini API responses, particularly for grounding
export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // May include other types like "retrievedContext"
}
export interface Candidate {
  groundingMetadata?: {
    groundingChunks?: GroundingChunk[];
  };
  // other candidate properties
}

export interface GeminiApiResponse {
  text: string;
  candidates?: Candidate[];
  // other response properties
}

// Types for Self-Analysis Mind Map
export type NodeType = 'experience' | 'trait';
export type FrameworkType = 'star' | 'custom';

export interface PaletteItem {
  id: string; 
  type: NodeType;
  label: string;
  icon: React.ElementType;
  color: string; // Tailwind CSS class for background/border
  defaultDetails: NodeDetails;
  group: string; 
}

export interface Node {
  id: string;
  label: string;
  paletteItemId: string; 
  x: number;
  y: number;
  isComplete: boolean;
  details: NodeDetails;
}

export interface NodeDetails {
  experience?: {
    activeFramework: FrameworkType;
    star: { situation: string; task: string; action: string; result: string };
    custom: { target: string; issue: string; action: string; result: string; learning: string };
    deepDive: { questions: string[]; answers: Record<number, string>; currentIndex: number };
    aiStrengthSuggestions?: string[];
    aiWeaknessSuggestions?: string[];
  };
  trait?: {
    description: string;
  };
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromConnector: 'top' | 'bottom' | 'left' | 'right';
  toNodeId: string;
  toConnector: 'top' | 'bottom' | 'left' | 'right';
}

export interface AiGlobalAnalysis {
  selfPR: string;
  gakuchika: string;
}

export interface ConnectorPoint {
  nodeId: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  x: number;
  y: number;
}
