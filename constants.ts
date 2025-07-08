
import { TimelineStep, PaletteItem, NodeDetails } from './types';
import {
  AcademicCapIcon,
  UsersIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  BriefcaseIcon,
  LightBulbIcon,
  ArrowTrendingDownIcon, // Corrected from TrendingDownIcon
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';

export const APP_NAME = "Job Support AI Dashboard";
export const GEMINI_API_KEY_ENV_VAR = "API_KEY"; // To remind that it comes from process.env

export const DEFAULT_ACADEMIC_YEARS: string[] = [
  "学部1年", "学部2年", "学部3年", "学部4年",
  "修士1年", "修士2年",
  "博士1年", "博士2年", "博士3年",
  "既卒", "その他"
];

export const DEFAULT_INDUSTRIES: string[] = [
  "IT・ソフトウェア", "コンサルティング", "メーカー（電機・機械）", "メーカー（素材・化学）",
  "商社", "金融", "広告・出版・マスコミ", "不動産・建設",
  "運輸・物流", "エネルギー", "教育", "医療・福祉", "官公庁・団体", "その他"
];

export const INITIAL_TIMELINE_STEPS: TimelineStep[] = [
  { id: '1', title: "自己分析", description: "強み・弱み、価値観を明確にする", status: 'pending' },
  { id: '2', title: "業界研究", description: "興味のある業界の動向を調査する", status: 'pending' },
  { id: '3', title: "企業研究", description: "志望企業の事業内容・文化を理解する", status: 'pending' },
  { id: '4', title: "ES作成", description: "エントリーシートを作成・添削する", status: 'pending' },
  { id: '5', title: "筆記試験対策", description: "SPIや玉手箱などの対策を行う", status: 'pending' },
  { id: '6', title: "面接対策", description: "模擬面接などで実践練習を積む", status: 'pending' },
  { id: '7', title: "OB/OG訪問", description: "実際に働く社員から話を聞く", status: 'pending' },
  { id: '8', title: "インターンシップ参加", description: "企業での就業体験を通じて理解を深める", status: 'pending' },
  { id: '9', title: "本選考応募", description: "企業へ正式に応募する", status: 'pending' },
  { id: '10', title: "内定承諾", description: "内定を得て、承諾手続きを行う", status: 'pending' },
];

export const GEMINI_TEXT_MODEL = "gemini-2.5-flash-preview-04-17";
export const GEMINI_IMAGE_MODEL = "imagen-3.0-generate-002"; // Though not used in this app currently

const createDefaultExperienceDetails = (): NodeDetails['experience'] => ({
  activeFramework: 'star',
  star: { situation: '', task: '', action: '', result: '' },
  custom: { target: '', issue: '', action: '', result: '', learning: '' },
  deepDive: { questions: [], answers: {}, currentIndex: 0 },
});

const createDefaultTraitDetails = (): NodeDetails['trait'] => ({
  description: '',
});

export const PALETTE_ITEMS: PaletteItem[] = [
  { id: 'exp-gakuchika', group: '経験ノード', type: 'experience', label: '学チカ', icon: AcademicCapIcon, color: 'bg-blue-100 border-blue-400', defaultDetails: { experience: createDefaultExperienceDetails() } },
  { id: 'exp-circle', group: '経験ノード', type: 'experience', label: 'サークル', icon: UsersIcon, color: 'bg-green-100 border-green-400', defaultDetails: { experience: createDefaultExperienceDetails() } },
  { id: 'exp-arbeit', group: '経験ノード', type: 'experience', label: 'アルバイト', icon: CurrencyDollarIcon, color: 'bg-yellow-100 border-yellow-400', defaultDetails: { experience: createDefaultExperienceDetails() } },
  { id: 'exp-club', group: '経験ノード', type: 'experience', label: '部活動', icon: TrophyIcon, color: 'bg-red-100 border-red-400', defaultDetails: { experience: createDefaultExperienceDetails() } },
  { id: 'exp-intern', group: '経験ノード', type: 'experience', label: '長期インターン', icon: BriefcaseIcon, color: 'bg-indigo-100 border-indigo-400', defaultDetails: { experience: createDefaultExperienceDetails() } },
  { id: 'trait-strength', group: '特性ノード', type: 'trait', label: '強み', icon: LightBulbIcon, color: 'bg-lime-100 border-lime-400', defaultDetails: { trait: createDefaultTraitDetails() } },
  { id: 'trait-weakness', group: '特性ノード', type: 'trait', label: '弱み', icon: ArrowTrendingDownIcon, color: 'bg-rose-100 border-rose-400', defaultDetails: { trait: createDefaultTraitDetails() } }, // Corrected icon
  { id: 'trait-common', group: '特性ノード', type: 'trait', label: '共通属性', icon: PuzzlePieceIcon, color: 'bg-gray-100 border-gray-400', defaultDetails: { trait: createDefaultTraitDetails() } },
];

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 80;
export const CONNECTOR_SIZE = 12;
