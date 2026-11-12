import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock,
  Dumbbell,
  FileText,
  Flame,
  GraduationCap,
  House,
  Inbox,
  Layers,
  LogOut,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";

// Los iconos se referencian por nombre para poder pasarlos de Server a Client Components.
const ICONS = {
  home: House,
  book: BookOpen,
  work: Briefcase,
  video: Clapperboard,
  gym: Dumbbell,
  plus: Plus,
  check: Check,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  clock: Clock,
  calendar: CalendarDays,
  file: FileText,
  flame: Flame,
  graduation: GraduationCap,
  inbox: Inbox,
  layers: Layers,
  logout: LogOut,
  pencil: Pencil,
  play: Play,
  repeat: RefreshCw,
  settings: SlidersHorizontal,
  sparkles: Sparkles,
  target: Target,
  trash: Trash2,
  upload: Upload,
  user: User,
  x: X,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  const Component = ICONS[name];
  return <Component size={size} strokeWidth={1.8} className={className} aria-hidden />;
}
