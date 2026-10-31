import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {validatePage,builtSite,elements,attr} from './validate.mjs';
const config=builtSite();
const pages={en:readFileSync(path.join(config.dist,'index.html'),'utf8'),zh:readFileSync(path.join(config.dist,'zh/index.html'),'utf8')};
for(const locale of ['en','zh'])test(`${locale}: static HTML, metadata, profile schema, crawlable links and assets`,()=>validatePage(pages[locale],{...config,locale}));
for(const locale of ['en','zh'])test(`${locale}: one train remains outside the scrolling identity in the shared page shell`,()=>{
  const nodes=elements(pages[locale]);
  const trains=nodes.filter(n=>attr(n,'data-train-divider')!==undefined);
  assert.equal(trains.length,1,'scrolling must not duplicate or hand off to another train');
  const dock=trains[0].parentNode;
  assert.equal(attr(dock,'class'),'train-dock');
  assert.equal(attr(dock.parentNode,'class'),'page-shell','the sticky train must not be bounded by the short identity');
  assert.ok(dock.childNodes.some(n=>n.tagName==='nav'),'navigation shares the same rail');
});
for(const locale of ['en','zh'])test(`${locale}: practice metrics and both calendars are available without opening a disclosure`,()=>{
  const nodes=elements(pages[locale]);
  for(const panelId of ['codex-panel','github-panel']){
    const panel=nodes.find(n=>attr(n,'id')===panelId);
    assert.ok(panel,`${panelId} exists`);
    const descendants=nodes.filter(n=>{
      for(let parent=n.parentNode;parent;parent=parent.parentNode)if(parent===panel)return true;
      return false;
    });
    for(const cls of ['activity-metrics','activity-calendar']){
      const content=descendants.find(n=>(attr(n,'class')??'').split(' ').includes(cls));
      assert.ok(content,`${panelId} includes ${cls}`);
      for(let ancestor=content;ancestor;ancestor=ancestor.parentNode){
        assert.notEqual(ancestor.tagName,'details','practice content must not require expansion');
        assert.equal(attr(ancestor,'hidden'),undefined,'practice content stays visible');
      }
      assert.ok(content.childNodes.length>0);
    }
    const calendarPrefix=locale==='zh'?(panelId==='codex-panel'?'Codex Token 日历':'GitHub 贡献日历'):(panelId==='codex-panel'?'Codex Token calendar':'GitHub contribution calendar');
    assert.ok(descendants.some(n=>attr(n,'role')==='img'&&attr(n,'aria-label')?.startsWith(calendarPrefix)),'calendar has a localized accessible summary');
  }
});
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
