import type FontAwesome from '@expo/vector-icons/FontAwesome';

export const HOWARD_BLUE = '#003A63';
export const HOWARD_RED = '#E31837';

export const SEARCH_PAGE_SIZE = 20;
export const RECENT_MAX = 10;
export const SUGGEST_DEBOUNCE_MS = 300;
export const POPULAR_LIMIT = 4;

export type SearchCategory = {
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  bg: string;
};

export const CATEGORIES: SearchCategory[] = [
  { label: 'Science', subtitle: 'Lab, Research', icon: 'flask', color: '#06b6d4', bg: '#ecfeff' },
  { label: 'Fiction', subtitle: 'Stories, Novels', icon: 'magic', color: '#8b5cf6', bg: '#f5f3ff' },
  { label: 'Technology', subtitle: 'AI, Systems', icon: 'microchip', color: HOWARD_BLUE, bg: '#eff6ff' },
  { label: 'History', subtitle: 'Archives', icon: 'globe', color: '#f59e0b', bg: '#fffbeb' },
  { label: 'Biography', subtitle: 'Memoirs, Life', icon: 'user', color: '#10b981', bg: '#ecfdf5' },
  { label: 'Art & Design', subtitle: 'Creative', icon: 'paint-brush', color: HOWARD_RED, bg: '#fff1f2' },
];

