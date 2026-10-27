export interface Quest {
  id: string;
  title: string;
  description: string;
  media?: string;
  type?: 'image' | 'video';
  poster?: string;
}

// Add media paths from public/ when your experiments are ready.
export const quests: Quest[] = [
  {
    id: '01',
    title: 'Location Intelligence Dashboard',
    description:
      'A intelligence feature to visualize and analyze spatial data for business location planning.',
    type: 'image',
    media: '/quests/location-intelligence.webp',
  },
  {
    id: '02',
    title: 'Hero Section',
    description:
      'Using LottieLab to animate the hero section for my portfolio website (what you saw earlier).',
    type: 'video',
    media: '/quests/hero-section.mp4',
    poster: '/quests/hero-section-poster.webp',
  },
  {
    id: '03',
    title: 'Asset Management Mobile App',
    description: 'Mobile app for UNHWIs to manage their assets and investments.',
    type: 'video',
    media: '/quests/fintivio-mobile-app.mp4',
    poster: '/quests/fintivio-mobile-app-poster.webp',
  },
  {
    id: '04',
    title: 'Teaching aspiring designers',
    description:
      'Teaching aspiring designers and career switchers to get into the digital product field (Hacktiv8).',
    type: 'image',
    media: '/quests/online-class.webp',
  },
];
