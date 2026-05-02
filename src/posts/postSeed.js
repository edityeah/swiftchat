// One-shot seed of demo posts so the feed has content on first load.
// Stories ages are spread within the 24h window so the carousel shows rings
// for some authors but not all.

import { loadAllPosts } from './postStore'

const SEED_KEY = 'swiftchat.posts.seeded.v1'

const SEED_AUTHORS = {
  priya: {
    id: 'TCH1001', name: 'Priya Mehta', role: 'teacher', badge: 'Teacher',
    school: 'GPS Mehsana', initials: 'PM', color: '#3B82F6',
  },
  rakesh: {
    id: 'PRI2001', name: 'Rakesh Joshi', role: 'principal', badge: 'Principal',
    school: 'GPS Mehsana', initials: 'RJ', color: '#7C3AED',
  },
  asha: {
    id: 'TCH1002', name: 'Asha Verma', role: 'teacher', badge: 'Teacher',
    school: 'GPS Vadodara', initials: 'AV', color: '#10B981',
  },
  meera: {
    id: 'TCH1003', name: 'Meera Iyer', role: 'teacher', badge: 'Teacher',
    school: 'GPS Surat', initials: 'MI', color: '#F59E0B',
  },
  sunil: {
    id: 'PRI2002', name: 'Sunil Gohil', role: 'principal', badge: 'Principal',
    school: 'GPS Rajkot', initials: 'SG', color: '#EF4444',
  },
}

const HOUR = 60 * 60 * 1000

function seedPosts() {
  const now = Date.now()
  return [
    {
      id: 'seed_1', createdAt: now - 1 * HOUR, author: SEED_AUTHORS.priya,
      media: { type: 'image', src: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800' },
      caption: 'Today my Class 6 students built fraction models out of paper plates. Splitting a "pizza" into halves and quarters made the concept click for everyone! 🍕',
      showAsStory: true,
      reactions: { TCH1002: 'like', PRI2001: 'love', TCH1003: 'clap' },
      comments: [
        { id: 'sc1', userId: 'TCH1002', name: 'Asha Verma', role: 'teacher', text: 'Stealing this idea for tomorrow!', createdAt: now - 50 * 60 * 1000 },
      ],
      views: 42,
    },
    {
      id: 'seed_2', createdAt: now - 3 * HOUR, author: SEED_AUTHORS.rakesh,
      media: { type: 'image', src: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800' },
      caption: 'Reminder: PTM this Saturday at 10 AM. Please share with parents through your class WhatsApp groups. Let us aim for 100% attendance.',
      ctaUrl: 'https://example.com/ptm',
      showAsStory: true,
      reactions: { TCH1001: 'like', TCH1002: 'like' },
      comments: [],
      views: 128,
    },
    {
      id: 'seed_3', createdAt: now - 5 * HOUR, author: SEED_AUTHORS.asha,
      media: { type: 'video', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', poster: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800' },
      caption: '60-second concept video on photosynthesis. Recorded with the Canva mobile app — happy to share the template if anyone wants it.',
      showAsStory: true,
      reactions: { TCH1001: 'love', TCH1003: 'love', PRI2001: 'clap' },
      comments: [
        { id: 'sc2', userId: 'PRI2001', name: 'Rakesh Joshi', role: 'principal', text: 'Excellent. Please share the template.', createdAt: now - 4 * HOUR },
        { id: 'sc3', userId: 'TCH1001', name: 'Priya Mehta', role: 'teacher', text: 'Sharing in the staff group now 🙏', createdAt: now - 3.5 * HOUR },
      ],
      views: 215,
    },
    {
      id: 'seed_4', createdAt: now - 9 * HOUR, author: SEED_AUTHORS.meera,
      media: { type: 'text' },
      caption: 'Quick tip: when a student goes silent in class, give them a small group role (notetaker, time-keeper) before asking them to speak. Works every single time. 💡',
      showAsStory: false,
      reactions: { TCH1001: 'love', TCH1002: 'clap', PRI2002: 'like' },
      comments: [
        { id: 'sc4', userId: 'TCH1002', name: 'Asha Verma', role: 'teacher', text: 'This is gold.', createdAt: now - 8 * HOUR },
      ],
      views: 87,
    },
    {
      id: 'seed_5', createdAt: now - 14 * HOUR, author: SEED_AUTHORS.sunil,
      media: { type: 'image', src: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800' },
      caption: 'Our school sports day poster — feel free to use the layout. Made on Canva, took 20 minutes.',
      showAsStory: true,
      reactions: { TCH1001: 'like', TCH1003: 'love' },
      comments: [],
      views: 64,
    },
    {
      id: 'seed_6', createdAt: now - 26 * HOUR, author: SEED_AUTHORS.priya,
      media: { type: 'image', src: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800' },
      caption: 'Class 8 students presenting their solar system models. So proud of how much they researched on their own!',
      showAsStory: false, // outside 24h anyway — feed only
      reactions: { TCH1002: 'clap', PRI2001: 'love' },
      comments: [],
      views: 156,
    },
    {
      id: 'seed_7', createdAt: now - 36 * HOUR, author: SEED_AUTHORS.asha,
      media: { type: 'text' },
      caption: 'Looking for a good Hindi grammar workbook for Class 5. Any recommendations from teachers in Surat district?',
      showAsStory: false,
      reactions: { TCH1003: 'like' },
      comments: [
        { id: 'sc5', userId: 'TCH1003', name: 'Meera Iyer', role: 'teacher', text: 'Saraswati Press has a good one. DM me, I will send the cover photo.', createdAt: now - 30 * HOUR },
      ],
      views: 34,
    },
  ]
}

export function seedPostsOnce() {
  try {
    if (localStorage.getItem(SEED_KEY)) return
    if (loadAllPosts().length > 0) {
      localStorage.setItem(SEED_KEY, '1')
      return
    }
    localStorage.setItem('swiftchat.posts.v1', JSON.stringify(seedPosts()))
    localStorage.setItem(SEED_KEY, '1')
    try { window.dispatchEvent(new CustomEvent('swiftchat:posts:change')) } catch { /* noop */ }
  } catch { /* noop */ }
}
