// Lucide icon mapping for DDS expense groups
// Replaces emoji icons per MASTER.md anti-pattern rule: "No emojis as icons"

export {
  // Navigation
  Home,
  BarChart3,
  Bell,
  BellRing,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,

  // Finance
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  DollarSign,
  Receipt,
  PiggyBank,

  // DDS expense group icons
  Utensils,        // Продукты питания
  Building2,       // Аренда помещений
  Users,           // Заработная плата
  Zap,             // Коммунальные услуги
  Megaphone,       // Маркетинг и реклама
  Monitor,         // IT и связь
  Truck,           // Транспортные расходы
  Wrench,          // Оборудование и ремонт
  FileText,        // Налоги и сборы
  Package,         // Прочие расходы
  Shield,          // Охрана и безопасность
  GraduationCap,   // Обучение персонала

  // Actions
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Info,

  // Status
  Wifi,
  WifiOff,
  Activity,
  CircleDot,

  // Data
  LayoutGrid,
  List,
  MapPin,
  Store,

  // Misc
  Sun,
  Moon,
  LogOut,
  Smartphone,
  Fingerprint,
} from 'lucide-react-native';

import type { LucideIcon } from 'lucide-react-native';
import {
  Utensils,
  Building2,
  Users,
  Zap,
  Megaphone,
  Monitor,
  Truck,
  Wrench,
  FileText,
  Package,
  Shield,
  GraduationCap,
} from 'lucide-react-native';

/** Maps DDS expense group names to Lucide icon components */
export const GROUP_ICONS: Record<string, LucideIcon> = {
  'Продукты питания': Utensils,
  'Аренда помещений': Building2,
  'Заработная плата': Users,
  'Коммунальные услуги': Zap,
  'Маркетинг и реклама': Megaphone,
  'IT и связь': Monitor,
  'Транспортные расходы': Truck,
  'Оборудование и ремонт': Wrench,
  'Налоги и сборы': FileText,
  'Прочие расходы': Package,
  'Охрана и безопасность': Shield,
  'Обучение персонала': GraduationCap,
};

/** Default icon for unknown expense groups */
export const DEFAULT_GROUP_ICON = Package;

/** DDS group color palette (muted for dark backgrounds) */
export const GROUP_ICON_COLORS: Record<string, string> = {
  'Продукты питания': '#F97316',     // orange-500
  'Аренда помещений': '#3B82F6',     // blue-500
  'Заработная плата': '#8B5CF6',     // violet-500
  'Коммунальные услуги': '#F59E0B',  // amber-500
  'Маркетинг и реклама': '#EC4899',  // pink-500
  'IT и связь': '#06B6D4',           // cyan-500
  'Транспортные расходы': '#10B981',  // emerald-500
  'Оборудование и ремонт': '#6366F1', // indigo-500
  'Налоги и сборы': '#EF4444',       // red-500
  'Прочие расходы': '#64748B',       // slate-500
  'Охрана и безопасность': '#14B8A6', // teal-500
  'Обучение персонала': '#A855F7',   // purple-500
};
