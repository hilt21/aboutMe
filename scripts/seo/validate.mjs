import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {parse} from 'parse5';

export const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
export function elements(html) {
  const result = [];
  function visit(node) { if (node.tagName) result.push(node); for (const child of node.childNodes ?? []) visit(child); }
  visit(parse(html));
  return result;
}
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');

export function validatePage(html, {locale,urls,profile,dist,base}) {
  const nodes = elements(html);
  const one = (tag, key, value) => {
    const matches = nodes.filter(node => node.tagName === tag && (!key || attr(node,key) === value));
    assert.equal(matches.length, 1, `${tag} ${key ?? ''}=${value ?? ''} must occur once`);
    return matches[0];
  };
  assert.equal(attr(one('html'),'lang'), locale === 'zh' ? 'zh-CN' : 'en');
  assert.equal(text(one('h1')),profile.name);
  assert.match(text(one('title')),locale === 'zh' ? /机械工程/ : /Mechanical Engineering/);
  assert.ok(attr(one('meta','name','description'),'content').length > 40);
  assert.match(attr(one('meta','name','description'),'content'),locale === 'zh' ? /机械工程/ : /mechanical engineering/);
  assert.equal(attr(one('link','rel','canonical'),'href'),urls[locale]);
  assert.equal(attr(one('meta','property','og:url'),'content'),urls[locale]);
  assert.equal(attr(one('meta','property','og:title'),'content'),text(one('title')));
  assert.equal(attr(one('meta','property','og:description'),'content'),attr(one('meta','name','description'),'content'));
  for (const [language,url] of [['en',urls.en],['zh-CN',urls.zh],['x-default',urls.en]]) {
    assert.equal(attr(one('link','hreflang',language),'href'),url);
  }
  assert.equal(nodes.filter(n => n.tagName === 'link' && attr(n,'rel') === 'alternate').length,3);
  assert.ok(!nodes.some(n => n.tagName === 'meta' && /robots|googlebot/i.test(attr(n,'name')??'') && /noindex|nofollow|none/i.test(attr(n,'content')??'')));
  assert.ok(!nodes.some(n => n.tagName === 'meta' && /refresh/i.test(attr(n,'http-equiv')??'')));
  const switcher=one('a','id','language');
  assert.equal(attr(switcher,'href'),new URL(urls[locale === 'en' ? 'zh' : 'en']).pathname,'language links stay on the current host, including previews');
  const thesis=nodes.find(n => attr(n,'class') === 'profile-thesis');
  assert.match(text(thesis),locale === 'zh' ? /把铁路制动与系统集成经验/ : /Bringing railway braking/);
  assert.match(text(nodes.find(n => attr(n,'id') === 'background')),locale === 'zh' ? /牵头地铁、高速列车/ : /Lead bogie equipment/);
  const projects=nodes.filter(n => n.tagName === 'a' && attr(n,'href') === 'https://hilt21.github.io/#projects');
  assert.equal(projects.length,2,'profile and compact navigation link to the project index');
  assert.ok(!nodes.some(n => (attr(n,'class')??'').split(' ').includes('project-card')),'project cards live in Project Atlas');
  const schema=JSON.parse(text(one('script','type','application/ld+json')));
  assert.equal(schema['@context'],'https://schema.org');
  assert.equal(schema['@type'],'ProfilePage');
  assert.equal(schema.url,urls[locale]);
  assert.equal(schema.inLanguage,locale === 'zh' ? 'zh-CN' : 'en');
  assert.equal(schema.mainEntity['@type'],'Person');
  assert.equal(schema.mainEntity['@id'],`${urls.en}#person`);
  assert.equal(schema.mainEntity.name,profile.name);
  assert.deepEqual(schema.mainEntity.sameAs,[profile.github,profile.linkedin]);
  const portrait=new URL(schema.mainEntity.image);
  assert.equal(portrait.origin,new URL(urls.en).origin);
  assert.ok(portrait.pathname.startsWith(base));
  const portraitFile=path.join(dist,decodeURIComponent(portrait.pathname.slice(base.length)));
  assert.ok(existsSync(portraitFile),'schema portrait exists');
  assert.ok(!('jobTitle' in schema.mainEntity) && !('alumniOf' in schema.mainEntity));
  const ids=new Set(nodes.map(n => attr(n,'id')).filter(Boolean));
  for (const node of nodes) {
    if (node.tagName === 'img') assert.ok(attr(node,'alt')?.trim(),'image alt');
    const ref = attr(node,'href') ?? attr(node,'src');
    if (!ref || /^(mailto:|data:)/.test(ref)) continue;
    const url = new URL(ref,urls[locale]);
    if (url.origin !== new URL(urls.en).origin) continue;
    // Other projects on the shared GitHub Pages host are outside this site's scope.
    if (!url.pathname.startsWith(base)) continue;
    const relative=decodeURIComponent(url.pathname.slice(base.length));
    const file=path.join(dist,relative.endsWith('/') || !relative ? relative+'index.html' : relative);
    assert.ok(existsSync(file),`local link/asset exists: ${ref}`);
    if (url.pathname === new URL(urls[locale]).pathname && url.hash) assert.ok(ids.has(decodeURIComponent(url.hash.slice(1))),`fragment exists: ${ref}`);
  }
  return schema;
}

export function builtSite(root = process.cwd()) {
  const dist=path.join(root,'dist');
  const site=process.env.SITE_URL ?? 'https://hilt21.github.io';
  const base='/' + (process.env.PUBLIC_BASE_PATH ?? '/aboutMe/').split('/').filter(Boolean).join('/') + '/';
  const normalizedBase=base === '//' ? '/' : base;
  const urls={en:new URL(normalizedBase,site).href,zh:new URL(normalizedBase+'zh/',site).href};
  const profile=JSON.parse(readFileSync(path.join(root,'src/data/profile.json'),'utf8'));
  return {dist,base:normalizedBase,urls,profile};
}
