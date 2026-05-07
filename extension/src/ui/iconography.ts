import { ICONS } from '@/ui/svgicons';

const CATEGORY_ICON_MAP: Record<string, string> = {
  games: ICONS.GAMES,
  gambling: ICONS.GAMBLING,
  porn: ICONS.PORN,
  'social-networks': ICONS.SOCIAL,
  'video-streaming': ICONS.VIDEO,
  shopping: ICONS.SHOPPING,
  dating: ICONS.DATING,
  piracy: ICONS.PIRACY,
};

export function getCategoryBadge(category: { id?: string; name?: string }) {
  const key = String(category?.id || '').toLowerCase();
  return (
    CATEGORY_ICON_MAP[key] ||
    String(category?.name || key)
      .slice(0, 2)
      .toUpperCase()
  );
}
