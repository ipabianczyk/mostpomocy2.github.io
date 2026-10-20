export const reserved=['admin','api','blog','kategorie','ogloszenia','dodaj-ogloszenie','szukaj','404','assets','content'];
export function validateContent(d){
 const errors=[];const err=s=>errors.push(s);const str=(o,k,max=4000)=>{if(typeof o?.[k]!=='string'||o[k].length>max)err(`Nieprawidłowe pole: ${k}`)};
 if(!d||typeof d!=='object'||d.schemaVersion!==1)return ['Nieobsługiwana wersja danych'];
 for(const k of ['settings','home'])if(!d[k]||typeof d[k]!=='object')err(`Brak sekcji ${k}`);
 if(errors.length)return errors;
 for(const k of ['name','tagline','description','siteUrl','adminUrl','email','primaryColor','logo','heroImage','footerText','analyticsUrl'])str(d.settings,k);
 if(!/^#[0-9a-f]{6}$/i.test(d.settings.primaryColor||''))err('Kolor musi mieć format #087dff');
 for(const k of ['siteUrl','adminUrl','analyticsUrl'])if(d.settings[k]&&!/^https:\/\/[^\s]+$/.test(d.settings[k]))err(`Wymagany adres HTTPS: ${k}`);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.settings.email||''))err('Nieprawidłowy email');
 for(const k of ['eyebrow','title','subtitle','description','handwritten','primaryLabel','secondaryLabel','categoriesTitle','categoriesDescription','postsTitle','postsDescription','ctaTitle','ctaDescription','ctaLabel'])str(d.home,k);
 const safeUrl=(s,asset=false)=>typeof s==='string'&&s.length<2000&&(/^(https:\/\/|mailto:|tel:|\/[^\/]|\/$|#)/i.test(s)||(asset&&/^assets\/[a-z0-9_./-]+$/i.test(s)&&!s.includes('..')));
 for(const k of ['heroImage','logo'])if(!safeUrl(d.settings[k],true))err('Nieprawidłowy adres obrazu');
 if(!Array.isArray(d.settings.regionOptions)||!d.settings.regionOptions.length||d.settings.regionOptions.length>50||d.settings.regionOptions.some(x=>typeof x!=='string'||x.length>100))err('Nieprawidłowe regiony');
 for(const k of ['navigation','footerLinks','categories','posts','listings','pages','media'])if(!Array.isArray(d[k])||d[k].length>1000)err(`Nieprawidłowa lista ${k}`);
 if(errors.length)return errors;
 for(const k of ['navigation','footerLinks'])for(const l of d[k]){str(l,'label',150);if(!safeUrl(l.href))err('Nieprawidłowy odnośnik menu')}
 const ids={};for(const k of ['categories','posts','listings','pages','media']){const seen=new Set();ids[k]=seen;for(const v of d[k]){if(!v||typeof v!=='object'){err('Nieprawidłowy element');continue}if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.id)||seen.has(v.id))err(`Nieprawidłowy lub powtórzony identyfikator w ${k}`);seen.add(v.id);if(k!=='media'){str(v,'title',200);str(v,'body',100000)}if(k==='pages'&&reserved.includes(v.id))err('Zarezerwowany adres strony');if(['posts','listings'].includes(k)){if(!['published','draft'].includes(v.status))err('Nieprawidłowy status');if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date||''))err('Nieprawidłowa data');str(v,'region',100);str(v,'excerpt',1000);if(v.image&&!safeUrl(v.image,true))err('Nieprawidłowy obraz')}if(k==='categories'){str(v,'description',400);str(v,'icon',30);if(!/^#[a-f0-9]{6}$/i.test(v.color||''))err('Nieprawidłowy kolor kategorii');if(!Array.isArray(v.links))err('Nieprawidłowe linki');else for(const l of v.links){str(l,'label',150);if(!safeUrl(l.href))err('Nieprawidłowy link kategorii')}}if(k==='listings'){str(v,'type',50);str(v,'contact',300)}if(k==='media'){str(v,'name',200);str(v,'alt',500);if(!safeUrl(v.url,true))err('Nieprawidłowy adres zdjęcia')}}}
 for(const k of ['posts','listings'])for(const v of d[k])if(!ids.categories.has(v.category))err(`Nieznana kategoria: ${v.category}`);
 if(!d.pages.some(x=>x.id==='kontakt'))err('Strona Kontakt musi istnieć');
 // No traversals or local filesystem protocols, including embedded whitespace escapes.
 if(JSON.stringify(d).length>1500000)err('Treść jest zbyt duża');
 return errors;
}
