import test from 'node:test';
import assert from 'node:assert/strict';
import {localizedUrls,metadata,profileStructuredData} from '../src/lib/seo.ts';
test('locale URLs normalize configured base, including host root',()=>{
  assert.deepEqual(localizedUrls(new URL('https://example.org'),'/aboutMe/'),{en:'https://example.org/aboutMe/',zh:'https://example.org/aboutMe/zh/'});
  assert.deepEqual(localizedUrls(new URL('https://example.org'),'/'),{en:'https://example.org/',zh:'https://example.org/zh/'});
});
test('profile schema uses supplied identity and a stable shared person ID',()=>{
  const profile={name:'Test Person',github:'https://github.com/test',linkedin:'https://www.linkedin.com/in/test'};
  const urls=localizedUrls(new URL('https://example.org'),'/aboutMe');
  for(const locale of ['en','zh']){
    const schema=profileStructuredData(profile,locale,urls,'https://example.org/photo.webp');
    assert.equal(schema.mainEntity.name,profile.name);
    assert.deepEqual(schema.mainEntity.sameAs,[profile.github,profile.linkedin]);
    assert.equal(schema.mainEntity['@id'],`${urls.en}#person`);
    assert.equal(schema.description,metadata[locale].description);
  }
});
