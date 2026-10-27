export type Locale = 'en' | 'zh';

export const metadata = {
  en: {
    language: 'en',
    title: 'Lu Tao · Mechanical Engineering × AI',
    description: 'Lu Tao: mechanical engineering and railway braking systems. Currently focusing on AI for engineering and EM-Brake. Selected work and public activity.',
  },
  zh: {
    language: 'zh-CN',
    title: 'Lu Tao · 机械工程 × AI',
    description: 'Lu Tao 的个人职业画像：机械工程、铁路制动系统与 AI 辅助开发。目前专注于 AI 与 EM-Brake，展示工程经历、精选作品和公开活动。',
  },
} as const;

export function localizedUrls(site: URL, base: string) {
  const path = `/${base.split('/').filter(Boolean).join('/')}`.replace(/\/$/, '') + '/';
  return { en: new URL(path, site).href, zh: new URL(`${path}zh/`, site).href };
}

export function profileStructuredData(
  profile: {name: string; github: string; linkedin: string},
  locale: Locale,
  urls: Record<Locale, string>,
  image: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${urls[locale]}#profile`,
    url: urls[locale],
    name: metadata[locale].title,
    description: metadata[locale].description,
    inLanguage: metadata[locale].language,
    mainEntity: {
      '@type': 'Person',
      '@id': `${urls.en}#person`,
      name: profile.name,
      url: urls.en,
      image,
      sameAs: [profile.github, profile.linkedin],
    },
  };
}
