export const site = {
  name: 'Samuel Extehines Heydemans',
  title: 'Samuel Extehines Heydemans — Creative Technologist',
  description:
    'Samuel Extehines Heydemans is a Co-founder of The House Works and a Creative Technologist working across video editing, animation, web products, and self-hosted infrastructure.',
  email: 'samuel.heydemanss@gmail.com',
  availability: 'Open to creative and technical collaborations',
  updated: '2026-10-27',
  links: {
    portfolio: 'https://samuel-extehines-heydemans-portofolio.vercel.app/',
    theHouseWorks: 'https://thehouseworks.vercel.app/',
    linkedin: 'https://www.linkedin.com/in/samuel-extehines-heydemans/',
    behance: 'https://www.behance.net/samuel-e-heydemans',
    github: 'https://github.com/samwhine',
    instagram: 'https://instagram.com/samuelheydemans',
    resume: '',
    blog: '',
  },
  testimonial: {
    quote:
      'I build visual work, web products, and self-hosted systems — combining creative production with practical technology.',
    name: 'Samuel Extehines Heydemans',
    role: 'Co-founder, The House Works · Creative Technologist',
  },
};

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}
