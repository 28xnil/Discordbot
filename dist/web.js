import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { config } from './config.js';
import { commands } from './command-loader.js';
import { deleteCustomCommand, getCustomCommands, getDashboardData, saveCustomCommand } from './database.js';
import { syncCommands } from './sync-commands.js';
const pendingStates = new Set();
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sentinel Control</title><style>
:root{color-scheme:dark;--bg:#0b0d12;--panel:#151923;--line:#293142;--text:#f3f5f7;--muted:#9aa6b2;--accent:#7c8cff;--good:#57d18c;--bad:#ff7070}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% -10%,#29306b 0,#0b0d12 42%);color:var(--text);font:15px/1.5 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:44px 22px}.top{display:flex;justify-content:space-between;align-items:center;gap:20px}.eyebrow{color:#aeb7ff;text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:700}h1{font-size:clamp(38px,7vw,72px);line-height:.95;margin:14px 0}.lede{max-width:650px;color:var(--muted);font-size:18px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:30px 0}.card,form{background:#151923dd;border:1px solid var(--line);border-radius:10px;padding:20px}.label{color:var(--muted);font-size:12px}.value{font-size:28px;font-weight:700;margin-top:5px}.status{color:var(--good)}section{margin-top:24px}h2{font-size:20px}input,textarea{width:100%;background:#0d1017;color:var(--text);border:1px solid var(--line);border-radius:6px;padding:10px;margin:6px 0 12px;font:inherit}textarea{min-height:90px;resize:vertical}button,.button{border:0;border-radius:6px;padding:10px 14px;background:var(--accent);color:white;font-weight:700;cursor:pointer;text-decoration:none}.muted{color:var(--muted)}.command{display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid var(--line);padding:12px 0}.danger{background:#9f3f4b}#app[hidden]{display:none}.login{display:inline-block;margin-top:20px}</style></head><body><main><div id="login"><div class="eyebrow">Sentinel control</div><h1>Private operations panel.</h1><p class="lede">Sign in with Discord. Only the configured bot owner can access developer controls.</p><a class="button login" href="/auth/discord">Continue with Discord</a></div><div id="app" hidden><div class="top"><div><div class="eyebrow">Sentinel control</div><h1>Developer console.</h1><p class="lede">Manage custom commands and inspect the live bot service.</p></div><a class="button" href="/auth/logout">Sign out</a></div><section class="grid" id="stats"></section><section><h2>Custom commands</h2><form id="command-form"><label>Name<input name="name" pattern="[a-z0-9-]{1,32}" placeholder="rules" required></label><label>Description<input name="description" maxlength="100" placeholder="Show server rules" required></label><label>Response<textarea name="response" maxlength="2000" placeholder="Please read #rules." required></textarea></label><button>Add or update command</button><p class="muted">Commands are synced to Discord immediately after saving.</p></form><div id="commands"></div></section></div></main><script>
const json=async(url,options)=>{const r=await fetch(url,options);if(r.status===401){location.reload();throw Error('login')}const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data};
async function load(){const me=await json('/api/me');if(!me.authenticated)return;document.querySelector('#login').hidden=true;document.querySelector('#app').hidden=false;const [status,commands]=await Promise.all([json('/api/status'),json('/api/custom-commands')]);document.querySelector('#stats').innerHTML=[['Status',status.online?'Online':'Offline'],['Servers',status.guilds],['Built-in commands',status.commands],['Open tickets',status.openTickets],['Total tickets',status.totalTickets],['Uptime',status.uptime]].map(x=>'<div class="card"><div class="label">'+x[0]+'</div><div class="value">'+x[1]+'</div></div>').join('');render(commands)}
function render(commands){document.querySelector('#commands').innerHTML=commands.length?commands.map(c=>'<div class="command"><span><b>/'+c.name+'</b><br><span class="muted">'+c.description+'</span></span><button class="danger" onclick="removeCommand(\''+c.name+'\')">Delete</button></div>').join(''):'<p class="muted">No custom commands yet.</p>'}
async function removeCommand(name){await json('/api/custom-commands/'+name,{method:'DELETE'});load()}
document.querySelector('#command-form').addEventListener('submit',async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.target));await json('/api/custom-commands',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});event.target.reset();load()});load().catch(()=>{});
</script></body></html>`;
function cookie(request, name) {
    return request.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}
function sign(value) {
    return createHmac('sha256', config.sessionSecret).update(value).digest('base64url');
}
function sessionCookie(session) {
    const value = Buffer.from(JSON.stringify(session)).toString('base64url');
    return `${value}.${sign(value)}`;
}
function readSession(request) {
    const raw = cookie(request, 'sentinel_session');
    if (!raw)
        return undefined;
    const [value, signature] = raw.split('.');
    if (!value || !signature)
        return undefined;
    const expected = sign(value);
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
        return undefined;
    try {
        const session = JSON.parse(Buffer.from(value, 'base64url').toString());
        return session.exp > Date.now() && session.id === config.ownerId ? session : undefined;
    }
    catch {
        return undefined;
    }
}
function sendJson(response, body, status = 200) {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify(body));
}
async function body(request) {
    let data = '';
    for await (const chunk of request)
        data += chunk;
    return JSON.parse(data || '{}');
}
function redirect(response, location, headers = {}) {
    response.writeHead(302, { location, ...headers });
    response.end();
}
export function startWebServer(client) {
    const server = createServer(async (request, response) => {
        const url = new URL(request.url ?? '/', config.dashboardUrl);
        try {
            if (url.pathname === '/auth/discord') {
                if (!config.oauthClientSecret)
                    return sendJson(response, { error: 'DISCORD_OAUTH_CLIENT_SECRET is not configured.' }, 503);
                const state = randomBytes(24).toString('hex');
                pendingStates.add(state);
                const oauth = new URL('https://discord.com/oauth2/authorize');
                oauth.searchParams.set('client_id', config.clientId);
                oauth.searchParams.set('response_type', 'code');
                oauth.searchParams.set('redirect_uri', `${config.dashboardUrl}/auth/callback`);
                oauth.searchParams.set('scope', 'identify');
                oauth.searchParams.set('state', state);
                redirect(response, oauth.toString());
                return;
            }
            if (url.pathname === '/auth/callback') {
                if (!config.oauthClientSecret || !url.searchParams.get('code') || !pendingStates.delete(url.searchParams.get('state') ?? ''))
                    return sendJson(response, { error: 'Invalid OAuth callback.' }, 400);
                const tokenResponse = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.oauthClientSecret, grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: `${config.dashboardUrl}/auth/callback` }) });
                const token = await tokenResponse.json();
                if (!token.access_token)
                    return sendJson(response, { error: 'Discord authorization failed.' }, 401);
                const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${token.access_token}` } });
                const user = await userResponse.json();
                if (user.id !== config.ownerId)
                    return sendJson(response, { error: 'This dashboard is restricted to the bot owner.' }, 403);
                const session = { id: user.id, username: user.username, exp: Date.now() + 7 * 86_400_000 };
                redirect(response, '/', { 'set-cookie': `sentinel_session=${sessionCookie(session)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800` });
                return;
            }
            if (url.pathname === '/auth/logout') {
                redirect(response, '/', { 'set-cookie': 'sentinel_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
                return;
            }
            const session = readSession(request);
            if (url.pathname === '/api/me')
                return sendJson(response, session ? { authenticated: true, username: session.username } : { authenticated: false });
            if (url.pathname.startsWith('/api/')) {
                if (!session)
                    return sendJson(response, { error: 'Unauthorized' }, 401);
                if (url.pathname === '/api/status' && request.method === 'GET') {
                    const data = await getDashboardData();
                    return sendJson(response, { online: client.isReady(), guilds: client.guilds.cache.size, commands: commands.length, openTickets: data.openTickets, totalTickets: data.totalTickets, uptime: formatUptime(client.uptime ?? 0) });
                }
                if (url.pathname === '/api/custom-commands' && request.method === 'GET')
                    return sendJson(response, await getCustomCommands());
                if (url.pathname === '/api/custom-commands' && request.method === 'POST') {
                    const input = await body(request);
                    if (!/^[a-z0-9-]{1,32}$/.test(input.name ?? '') || !(input.description ?? '').trim() || !(input.response ?? '').trim())
                        return sendJson(response, { error: 'Name, description, and response are required.' }, 400);
                    await saveCustomCommand({ name: input.name, description: input.description, response: input.response, enabled: true });
                    await syncCommands();
                    return sendJson(response, { ok: true });
                }
                if (url.pathname.startsWith('/api/custom-commands/') && request.method === 'DELETE') {
                    await deleteCustomCommand(decodeURIComponent(url.pathname.split('/').pop()));
                    await syncCommands();
                    return sendJson(response, { ok: true });
                }
                return sendJson(response, { error: 'Not found' }, 404);
            }
            if (url.pathname === '/' || url.pathname === '/index.html') {
                response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
                response.end(page);
                return;
            }
            sendJson(response, { error: 'Not found' }, 404);
        }
        catch (error) {
            console.error('Dashboard request failed', error);
            sendJson(response, { error: 'Dashboard request failed' }, 500);
        }
    });
    server.listen(config.port, '0.0.0.0', () => console.log(`Sentinel dashboard listening on port ${config.port}`));
}
function formatUptime(milliseconds) { const totalMinutes = Math.floor(milliseconds / 60_000); const days = Math.floor(totalMinutes / 1_440); const hours = Math.floor((totalMinutes % 1_440) / 60); const minutes = totalMinutes % 60; return `${days}d ${hours}h ${minutes}m`; }
