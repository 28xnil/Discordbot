import { createServer } from 'node:http';
import { getDashboardData } from './database.js';
import { config } from './config.js';
import { commands } from './command-loader.js';
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sentinel Control</title>
<style>
:root{color-scheme:dark;--bg:#0b0d12;--panel:#151923;--line:#293142;--text:#f3f5f7;--muted:#9aa6b2;--accent:#6d7cff;--good:#57d18c}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% -10%,#29306b 0,#0b0d12 42%);color:var(--text);font:16px/1.5 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:64px 24px}.eyebrow{color:#aeb7ff;text-transform:uppercase;letter-spacing:.16em;font-size:12px;font-weight:700}h1{font-size:clamp(42px,7vw,78px);line-height:.95;margin:16px 0}.lede{max-width:600px;color:var(--muted);font-size:19px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:40px 0}.card{background:#151923cc;border:1px solid var(--line);border-radius:10px;padding:22px;backdrop-filter:blur(12px)}.label{color:var(--muted);font-size:13px}.value{font-size:30px;font-weight:700;margin-top:6px}.status{color:var(--good)}footer{color:var(--muted);font-size:13px;border-top:1px solid var(--line);padding-top:20px}
</style></head><body><main><div class="eyebrow">Sentinel control</div><h1>Moderation, support, under control.</h1><p class="lede">A live operations view for your Discord bot. Configure the server through Discord slash commands and monitor its core services here.</p><section class="grid" id="stats"><div class="card"><div class="label">Status</div><div class="value status">Loading</div></div></section><footer>Sentinel dashboard · Data is served by the bot process.</footer></main><script>
fetch('/api/status').then(r=>r.json()).then(data=>{const items=[['Status',data.online?'Online':'Offline'],['Servers',data.guilds],['Commands',data.commands],['Open tickets',data.openTickets],['Total tickets',data.totalTickets],['Uptime',data.uptime]];document.querySelector('#stats').innerHTML=items.map(([label,value])=>'<div class="card"><div class="label">'+label+'</div><div class="value">'+value+'</div></div>').join('')}).catch(()=>{document.querySelector('#stats').innerHTML='<div class="card"><div class="label">Status</div><div class="value">Unavailable</div></div>'});
</script></body></html>`;
function sendJson(response, body, status = 200) {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify(body));
}
export function startWebServer(client) {
    const server = createServer(async (request, response) => {
        if (request.url === '/api/status') {
            try {
                const data = await getDashboardData();
                sendJson(response, { online: client.isReady(), guilds: client.guilds.cache.size, commands: commands.length, openTickets: data.openTickets, totalTickets: data.totalTickets, uptime: formatUptime(client.uptime ?? 0) });
            }
            catch {
                sendJson(response, { online: client.isReady(), error: 'Database unavailable' }, 503);
            }
            return;
        }
        if (request.url === '/' || request.url === '/index.html') {
            response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            response.end(page);
            return;
        }
        sendJson(response, { error: 'Not found' }, 404);
    });
    server.listen(config.port, '0.0.0.0', () => console.log(`Sentinel dashboard listening on port ${config.port}`));
}
function formatUptime(milliseconds) {
    const totalMinutes = Math.floor(milliseconds / 60_000);
    const days = Math.floor(totalMinutes / 1_440);
    const hours = Math.floor((totalMinutes % 1_440) / 60);
    const minutes = totalMinutes % 60;
    return `${days}d ${hours}h ${minutes}m`;
}
