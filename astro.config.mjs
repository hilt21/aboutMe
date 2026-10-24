import { defineConfig } from 'astro/config';
export default defineConfig({devToolbar:{enabled:false},output:'static',site:process.env.SITE_URL||'https://hilt21.github.io',base:process.env.PUBLIC_BASE_PATH||'/aboutMe/',server:{host:'0.0.0.0',port:4173},vite:{server:{allowedHosts:['terminal.local']}}});
