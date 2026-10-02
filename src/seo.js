// Everything the search engines (and social cards) need to know about each page. Pure functions,
// shared by the app (to keep <head> in sync while navigating) and by scripts/prerender.mjs
// (to bake the same tags into the static HTML of every page).

export const SITE = {
  url:
    (typeof process !== 'undefined' && process.env?.SITE_URL) || 'https://prologez.lucabonaldo.dev',
  name: 'PrologEZ',
  tagline: 'Learn Prolog interactively in your browser',
  description:
    'Learn Prolog with a free interactive course: run real SWI-Prolog in your browser. Over 40 lessons, auto-checked exercises and a step-by-step interpreter.',
  image: '/og-image.png',
  author: {
    name: 'Luca Bonaldo',
    url: 'https://lucabonaldo.dev/',
    github: 'https://github.com/LucaBonaldoIT',
  },
  repo: 'https://github.com/LucaBonaldoIT/prologez',
};

const trim = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const abs = (path) => SITE.url.replace(/\/$/, '') + path;

export const lessonPath = (id) => `/lesson/${id}/`;
export const routePath = (route) =>
  route.name === 'lesson'
    ? lessonPath(route.id)
    : route.name === 'playground'
      ? '/playground/'
      : route.name === 'about'
        ? '/about/'
        : '/';

const person = () => ({
  '@type': 'Person',
  name: SITE.author.name,
  url: SITE.author.url,
  sameAs: [SITE.author.url, SITE.author.github],
});

const courseRef = (lessons) => ({
  '@type': 'Course',
  '@id': abs('/#course'),
  name: `${SITE.name}: ${SITE.tagline}`,
  description: SITE.description,
  url: abs('/'),
  inLanguage: 'en',
  isAccessibleForFree: true,
  educationalLevel: 'Beginner to intermediate',
  teaches: 'Prolog, logic programming, unification, recursion, constraint programming',
  provider: person(),
  hasPart: lessons
    ?.slice(0, 100)
    .map((l) => ({ '@type': 'LearningResource', name: l.title, url: abs(lessonPath(l.id)) })),
});

const lessonTitle = (t) => {
  const full = `${t}: Prolog tutorial | ${SITE.name}`;
  if (full.length <= 62) return full;
  const short = `${t} | ${SITE.name}`;
  return short.length <= 66 ? short : trim(t, 54) + ` | ${SITE.name}`;
};

/** @returns {{title:string, description:string, path:string, canonical:string, robots:string, type:string, jsonld:object[]}} */
export function pageMeta(route, lessons) {
  const home = {
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
    type: 'website',
  };
  let m;
  let jsonld = [];
  if (route.name === 'lesson') {
    const i = lessons.findIndex((l) => l.id === route.id);
    const l = lessons[i];
    m = {
      title: lessonTitle(l.title),
      description: trim(
        `${l.summary} A free interactive Prolog lesson: run and edit the examples in your browser.`,
        158,
      ),
      type: 'article',
    };
    jsonld = [
      {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: l.title,
        headline: l.title,
        description: l.summary,
        url: abs(lessonPath(l.id)),
        inLanguage: 'en',
        isAccessibleForFree: true,
        learningResourceType: 'Interactive tutorial',
        educationalLevel: l.part === 'Advanced' ? 'Intermediate' : 'Beginner',
        teaches: l.title,
        position: i + 1,
        about: { '@type': 'ComputerLanguage', name: 'Prolog' },
        isPartOf: { '@id': abs('/#course') },
        author: person(),
        image: abs(SITE.image),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE.name, item: abs('/') },
          {
            '@type': 'ListItem',
            position: 2,
            name: l.part,
            item: abs('/#' + l.part.toLowerCase().replace(/[^a-z]+/g, '-')),
          },
          { '@type': 'ListItem', position: 3, name: l.title, item: abs(lessonPath(l.id)) },
        ],
      },
    ];
  } else if (route.name === 'playground') {
    m = {
      title: `Online Prolog playground | ${SITE.name}`,
      description:
        'Write and run Prolog in your browser: a free online Prolog playground with editable programs and queries, powered by SWI-Prolog WebAssembly. Nothing to install.',
      type: 'website',
    };
    jsonld = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: `${SITE.name} Prolog playground`,
        url: abs('/playground/'),
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any (runs in the browser)',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        author: person(),
      },
    ];
  } else if (route.name === 'about') {
    m = {
      title: `About ${SITE.name}: an interactive Prolog course by ${SITE.author.name}`,
      description: `About ${SITE.name}: how it works, what the lessons cover, and its author ${SITE.author.name} (lucabonaldo.dev).`,
      type: 'website',
    };
    jsonld = [
      {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: `About ${SITE.name}`,
        url: abs('/about/'),
        mainEntity: person(),
      },
    ];
  } else if (route.name === 'notfound') {
    return {
      title: `Page not found | ${SITE.name}`,
      description: SITE.description,
      path: '/',
      canonical: abs('/'),
      robots: 'noindex, follow',
      type: 'website',
      jsonld: [],
    };
  } else {
    m = home;
    jsonld = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': abs('/#website'),
        name: SITE.name,
        url: abs('/'),
        description: SITE.description,
        inLanguage: 'en',
        publisher: person(),
      },
      { '@context': 'https://schema.org', ...courseRef(lessons) },
    ];
  }
  const path = routePath(route);
  return {
    ...m,
    path,
    canonical: abs(path),
    robots: 'index, follow, max-image-preview:large, max-snippet:-1',
    jsonld,
  };
}

const escAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The <head> tags for a page (used by the prerenderer). */
export function headTags(meta) {
  const img = abs(SITE.image);
  const tags = [
    `<meta name="description" content="${escAttr(meta.description)}" />`,
    `<meta name="robots" content="${meta.robots}" />`,
    `<meta name="author" content="${escAttr(SITE.author.name)}" />`,
    `<link rel="author" href="${SITE.author.url}" />`,
    `<link rel="canonical" href="${meta.canonical}" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:title" content="${escAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escAttr(meta.description)}" />`,
    `<meta property="og:url" content="${meta.canonical}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="PrologEZ: learn Prolog by running it" />`,
    `<meta property="og:locale" content="en" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escAttr(meta.description)}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ];
  meta.jsonld.forEach((o) =>
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`,
    ),
  );
  return tags.join('\n    ');
}

/** Keep <head> in sync while the app navigates (client side). */
export function applyMeta(meta) {
  document.title = meta.title;
  const set = (sel, attr, value, create) => {
    let el = document.head.querySelector(sel);
    if (!el && create) {
      el = document.createElement(create.tag);
      Object.entries(create.attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.append(el);
    }
    if (el) el.setAttribute(attr, value);
  };
  set('meta[name="description"]', 'content', meta.description, {
    tag: 'meta',
    attrs: { name: 'description' },
  });
  set('meta[name="robots"]', 'content', meta.robots, { tag: 'meta', attrs: { name: 'robots' } });
  set('link[rel="canonical"]', 'href', meta.canonical, {
    tag: 'link',
    attrs: { rel: 'canonical' },
  });
  set('meta[property="og:title"]', 'content', meta.title);
  set('meta[property="og:description"]', 'content', meta.description);
  set('meta[property="og:url"]', 'content', meta.canonical);
  set('meta[property="og:type"]', 'content', meta.type);
  set('meta[name="twitter:title"]', 'content', meta.title);
  set('meta[name="twitter:description"]', 'content', meta.description);
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
  meta.jsonld.forEach((o) => {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(o);
    document.head.append(s);
  });
}
