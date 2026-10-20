let cachedKeys=new Map();
const decode=s=>{try{const text=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return JSON.parse(new TextDecoder().decode(Uint8Array.from(text,c=>c.charCodeAt(0))))}catch{throw new Error('Nieprawidłowy token')}};
export async function verifyAccess(token,env,fetcher=fetch,now=Math.floor(Date.now()/1000)){
 if(!env.CF_ACCESS_TEAM_DOMAIN||!env.CF_ACCESS_AUD)throw new Error('Brak konfiguracji Access');
 const issuer=`https://${env.CF_ACCESS_TEAM_DOMAIN.replace(/^https:\/\//,'').replace(/\/$/,'')}`;
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer))throw new Error('Nieprawidłowa domena Access');
 if(!token||token.length>16000)throw new Error('Wymagane logowanie');
 const parts=token.split('.');if(parts.length!==3)throw new Error('Nieprawidłowy token');
 const h=decode(parts[0]),p=decode(parts[1]);if(h.alg!=='RS256'||typeof h.kid!=='string')throw new Error('Niedozwolony algorytm');
 if(p.iss!==issuer||!(Array.isArray(p.aud)?p.aud:[p.aud]).includes(env.CF_ACCESS_AUD)||typeof p.exp!=='number'||p.exp<=now||typeof p.iat!=='number'||p.iat>now+60||(p.nbf&&p.nbf>now+30)||typeof p.email!=='string'||typeof p.sub!=='string')throw new Error('Nieważna sesja');
 let cached=cachedKeys.get(issuer);
 if(!cached||cached.until<Date.now()||!cached.keys.some(k=>k.kid===h.kid)){const r=await fetcher(`${issuer}/cdn-cgi/access/certs`);if(!r.ok)throw new Error('Nie można zweryfikować sesji');const body=await r.json();if(!Array.isArray(body.keys))throw new Error('Nieprawidłowe klucze');cached={keys:body.keys,until:Date.now()+300000};cachedKeys.set(issuer,cached)}
 const jwk=cached.keys.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!jwk)throw new Error('Nieznany klucz');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const sig=Uint8Array.from(atob(parts[2].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,sig,new TextEncoder().encode(parts[0]+'.'+parts[1])))throw new Error('Nieprawidłowy podpis');
 return {email:p.email.toLowerCase(),sub:p.sub};
}
export async function roleFor(user,env){const owners=(env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);if(owners.includes(user.email))return 'admin';if(!env.CMS_STATE)return null;const v=await env.CMS_STATE.get('team:'+user.email,'json');return v?.role==='editor'?'editor':v?.role==='admin'?'admin':null}
