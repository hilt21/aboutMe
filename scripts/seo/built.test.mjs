import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {validatePage,builtSite} from './validate.mjs';
const config=builtSite();
const pages={en:readFileSync(path.join(config.dist,'index.html'),'utf8'),zh:readFileSync(path.join(config.dist,'zh/index.html'),'utf8')};
for(const locale of ['en','zh'])test(`${locale}: static HTML, metadata, profile schema, crawlable links and assets`,()=>validatePage(pages[locale],{...config,locale}));
test('sitemap contains exactly the two canonical static URLs',()=>{
  const xml=readFileSync(path.join(config.dist,'sitemap.xml'),'utf8');
  assert.match(xml,/^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml,/<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]),Object.values(config.urls));
  assert.ok(xml.trim().endsWith('</urlset>'));
  assert.equal(existsSync(path.join(config.dist,'robots.txt')),false,'do not publish ineffective project-level robots.txt');
});
for(const [name,mutate] of [
  ['wrong canonical',html=>html.replace(/rel="canonical" href="[^"]+"/,'rel="canonical" href="https://example.org/"')],
  ['missing reciprocal language',html=>html.replace(/<link[^>]*hreflang="zh-CN"[^>]*>/,'')],
  ['noindex',html=>html.replace('</head>','<meta name="robots" content="noindex"></head>')],
  ['fabricated identity',html=>html.replace('"sameAs":[','"sameAs":["https://example.org/",')],
  ['broken internal link',html=>html.replace('</body>',`<a href="${config.base}missing/">Broken</a></body>`)],
])test(`regression detector rejects ${name}`,()=>assert.throws(()=>validatePage(mutate(pages.en),{...config,locale:'en'})));
