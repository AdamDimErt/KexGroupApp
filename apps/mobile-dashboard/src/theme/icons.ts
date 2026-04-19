// Lucide icon mapping for DDS expense groups
// Source: colors-categories.html (source of truth for GROUP_ICON_COLORS)
//         icons-lucide.html (icon component selection, pinned lucide-react-native)
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
  ArrowRight,
  ArrowDown,
  ArrowUp,

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
  // Wallet exported above — used for Заработная плата
  Zap,             // Коммунальные услуги
  Megaphone,       // Маркетинг и реклама
  // Wifi exported in Status — used for IT и связь
  Truck,           // Транспортные расходы
  Wrench,          // Оборудование и ремонт
  Landmark,        // Налоги и сборы (spec: Landmark, not FileText)
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
  CheckCircle2,
  X,
  XCircle,
  AlertTriangle,
  Info,
  Link2,
  MessageSquare,

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
  Wallet,
  Zap,
  Megaphone,
  Wifi,
  Truck,
  Wrench,
  Landmark,
  Package,
  Shield,
  GraduationCap,
} from 'lucide-react-native';

/** Maps DDS expense group names to Lucide icon components */
export const GROUP_ICONS: Record<string, LucideIcon> = {
  'Продукты питания':      Utensils,
  'Аренда помещений':      Building2,
  'Заработная плата':      Wallet,       // spec: Wallet (not Users)
  'Коммунальные услуги':   Zap,
  'Маркетинг и реклама':   Megaphone,
  'IT и связь':            Wifi,         // spec: Wifi (not Monitor)
  'Транспортные расходы':  Truck,
  'Оборудование и ремонт': Wrench,
  'Налоги и сборы':        Landmark,     // spec: Landmark (not FileText)
  'Прочие расходы':        Package,
  'Охрана и безопасность': Shield,
  'Обучение персонала':    GraduationCap,
};

/** Default icon for unknown expense groups */
export const DEFAULT_GROUP_ICON = Package;

/**
 * DDS group color palette — source of truth: colors-categories.html
 * RULE: never derive from icons-lucide.html (stale decorative colors)
 */
export const GROUP_ICON_COLORS: Record<string, string> = {
  'Продукты питания':      '#8B5CF6', // violet-500
  'Аренда помещений':      '#1E40AF', // blue-800
  'Заработная плата':      '#A855F7', // purple-500
  'Коммунальные услуги':   '#CA8A04', // yellow-600
  'Маркетинг и реклама':   '#EC4899', // pink-500
  'IT и связь':            '#06B6D4', // cyan-500
  'Транспортные расходы':  '#0D9488', // teal-700
  'Оборудование и ремонт': '#78716C', // stone-500
  'Налоги и сборы':        '#B91C1C', // red-700
  'Прочие расходы':        '#64748B', // slate-500
  'Охрана и безопасность': '#475569', // slate-600
  'Обучение персонала':    '#84CC16', // lime-500
};
