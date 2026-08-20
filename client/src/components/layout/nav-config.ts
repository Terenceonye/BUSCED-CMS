import {
  Bot,
  Building2,
  CalendarDays,
  GalleryHorizontalEnd,
  GraduationCap,
  Images,
  KeyRound,
  LayoutDashboard,
  Layers,
  Newspaper,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Also highlight the item for these path prefixes. */
  match?: string[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Content",
    items: [
      { title: "News", href: "/news", icon: Newspaper, match: ["/news"] },
      { title: "Events", href: "/events", icon: CalendarDays },
      { title: "Gallery", href: "/gallery", icon: GalleryHorizontalEnd },
      { title: "Hero Images", href: "/hero-images", icon: Images },
    ],
  },
  {
    label: "Academics",
    items: [
      { title: "Faculties", href: "/faculties", icon: Building2 },
      { title: "Departments", href: "/departments", icon: Layers },
      { title: "Program Types", href: "/program-types", icon: GraduationCap },
      { title: "Programs", href: "/programs", icon: GraduationCap },
      { title: "Staff", href: "/staff", icon: Users },
    ],
  },
  {
    label: "System",
    items: [
      { title: "AI Assistant", href: "/ai", icon: Bot },
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Change Password", href: "/change-password", icon: KeyRound },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
