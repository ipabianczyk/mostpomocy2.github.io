import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {renderSite,pageInfo,esc,published} from '../site/assets/render.js';
import {validateContent} from '../site/assets/schema.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(await readFile(join(root,'site/content/site.json'),'utf8'));
const errors=validateContent(data);if(errors.length)throw Error(errors.join('\n'));
const out=join(root,'dist');await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(join(root,'site/assets'),join(out,'assets'),{recursive:true});await cp(join(root,'site/admin'),join(out,'admin'),{recursive:true});await mkdir(join(out,'content'),{recursive:true});
// Public artefacts intentionally exclude drafts. The GitHub repository itself is public.
const publicData={...data,posts:published(data.posts),listings:published(data.listings)};
await writeFile(join(out,'content/public.json'),JSON.stringify(publicData));
const routes=['/','/blog/','/kategorie/','/ogloszenia/','/dodaj-ogloszenie/','/szukaj/',...data.categories.map(x=>`/kategorie/${x.id}/`),...published(data.posts).map(x=>`/blog/${x.id}/`),...published(data.listings).map(x=>`/ogloszenia/${x.id}/`),...data.pages.map(x=>`/${x.id}/`)];
for(const route of [...routes,'/404/']){const meta=pageInfo(data,route),canonical=data.settings.siteUrl.replace(/\/$/,'')+route,html=`<!doctype html><html lang="pl" style="--blue:${esc(data.settings.primaryColor)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.title)} | ${esc(data.settings.name)}</title><meta name="description" content="${esc(meta.description)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(meta.title)}"><meta property="og:description" content="${esc(meta.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}"><link rel="icon" href="/assets/logo.svg"><link rel="stylesheet" href="/assets/site.css">${route==='/'?'<link rel="preload" as="image" href="/'+esc(data.settings.heroImage)+'">':''}</head><body>${renderSite(publicData,route)}<script type="module" src="/assets/app.js"></script></body></html>`;const dest=route==='/404/'?join(out,'404.html'):join(out,route,'index.html');await mkdir(dirname(dest),{recursive:true});await writeFile(dest,html)}
await writeFile(join(out,'.nojekyll'),'');const host=new URL(data.settings.siteUrl).hostname;if(!host.endsWith('.github.io')&&!host.endsWith('.chatgpt.site'))await writeFile(join(out,'CNAME'),host);
await writeFile(join(out,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${data.settings.siteUrl.replace(/\/$/,'')}/sitemap.xml\n`);
await writeFile(join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.filter(x=>x!='/szukaj/').map(x=>`<url><loc>${esc(data.settings.siteUrl.replace(/\/$/,'')+x)}</loc></url>`).join('')}</urlset>`);
console.log(`Zbudowano ${routes.length} stron i stronę 404. Treść jest gotowa bez uruchamiania JavaScript.`);
