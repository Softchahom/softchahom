
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      )
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL
      )
    `).run();

    if (url.pathname === "/") {
      return new Response(homePage(), {
        headers: { "content-type": "text/html;charset=UTF-8" }
      });
    }

    if (url.pathname === "/admin") {
      return new Response(adminPage(), {
        headers: { "content-type": "text/html;charset=UTF-8" }
      });
    }

    if (url.pathname === "/api/links" && request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT id,title,url FROM links WHERE enabled=1 ORDER BY sort_order,id"
      ).all();
      return Response.json(result.results);
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      const body = await request.json();

      if (!env.ADMIN_PASSWORD || body.password !== env.ADMIN_PASSWORD) {
        return Response.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
      }

      const token = crypto.randomUUID();
      const expires = Date.now() + 86400000;

      await env.DB.prepare(
        "INSERT INTO sessions (token,expires_at) VALUES (?,?)"
      ).bind(token, expires).run();

      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json",
          "set-cookie": "session=" + token + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400"
        }
      });
    }

    if (url.pathname === "/api/admin/links" && request.method === "POST") {
      if (!(await loggedIn(request, env))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();

      if (!body.title || !body.url) {
        return Response.json({ error: "กรอกข้อมูลให้ครบ" }, { status: 400 });
      }

      await env.DB.prepare(
        "INSERT INTO links (title,url,enabled,sort_order) VALUES (?,?,1,?)"
      ).bind(body.title, body.url, Number(body.sort_order || 0)).run();

      return Response.json({ ok: true });
    }

    if (url.pathname.startsWith("/api/admin/links/") && request.method === "DELETE") {
      if (!(await loggedIn(request, env))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = url.pathname.split("/").pop();
      await env.DB.prepare("DELETE FROM links WHERE id=?").bind(id).run();
      return Response.json({ ok: true });
    }

    if (url.pathname === "/api/admin/links" && request.method === "GET") {
      if (!(await loggedIn(request, env))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const result = await env.DB.prepare(
        "SELECT * FROM links ORDER BY sort_order,id"
      ).all();
      return Response.json(result.results);
    }

    return new Response("Not found", { status: 404 });
  }
};

async function loggedIn(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return false;

  const row = await env.DB.prepare(
    "SELECT token FROM sessions WHERE token=? AND expires_at>?"
  ).bind(match[1], Date.now()).first();

  return !!row;
}

function homePage() {
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Softchahom</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#f4f4f5;color:#111}
.box{max-width:520px;margin:50px auto;padding:25px;text-align:center}
h1{font-size:32px}
.card{display:block;background:white;padding:18px;margin:14px 0;border-radius:15px;text-decoration:none;color:#111;box-shadow:0 3px 12px #0001;overflow-wrap:anywhere}
small{color:#777}
</style>
</head>
<body>
<div class="box">
<h1>Softchahom</h1>
<p>My Links</p>
<div id="links">กำลังโหลด...</div>
<p><a href="/admin">Admin</a></p>
<small>Powered by Cloudflare</small>
</div>
<script>
fetch('/api/links')
.then(function(r){return r.json()})
.then(function(data){
  var box=document.getElementById('links');
  if(!data.length){box.textContent='ยังไม่มีลิงก์';return;}
  box.innerHTML=data.map(function(x){
    var a=document.createElement('a');
    a.className='card';
    a.href=x.url;
    a.target='_blank';
    a.rel='noopener noreferrer';
    a.textContent=x.title;
    return a.outerHTML;
  }).join('');
})
.catch(function(){
  document.getElementById('links').textContent='โหลดข้อมูลไม่ได้';
});
</script>
</body>
</html>`;
}

function adminPage() {
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Softchahom Admin</title>
<style>
body{font-family:Arial,sans-serif;background:#f4f4f5;margin:0;color:#111}
.box{max-width:600px;margin:30px auto;padding:20px}
input,button{width:100%;box-sizing:border-box;padding:13px;margin:6px 0;border-radius:10px;border:1px solid #ddd}
button{background:#111;color:white;cursor:pointer}
.item{background:white;padding:15px;margin:10px 0;border-radius:12px;overflow-wrap:anywhere}
.delete{background:#c00}
</style>
</head>
<body>
<div class="box">
<h1>จัดการลิงก์</h1>
<div id="login">
<input id="password" type="password" placeholder="Admin password">
<button onclick="login()">เข้าสู่ระบบ</button>
</div>
<div id="panel" style="display:none">
<h2>เพิ่มลิงก์</h2>
<input id="title" placeholder="ชื่อปุ่ม เช่น Facebook">
<input id="link" type="url" placeholder="https://example.com">
<button onclick="addLink()">เพิ่มลิงก์</button>
<h2>ลิงก์ทั้งหมด</h2>
<div id="list"></div>
</div>
<p><a href="/">กลับหน้าหลัก</a></p>
</div>
<script>
async function login(){
  var password=document.getElementById('password').value;
  var r=await fetch('/api/login',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({password:password})
  });
  if(!r.ok){alert('รหัสผ่านไม่ถูกต้อง');return;}
  document.getElementById('login').style.display='none';
  document.getElementById('panel').style.display='block';
  load();
}

async function load(){
  var r=await fetch('/api/admin/links');
  if(!r.ok){alert('กรุณาเข้าสู่ระบบใหม่');return;}
  var data=await r.json();
  var list=document.getElementById('list');
  list.innerHTML='';

  data.forEach(function(x){
    var item=document.createElement('div');
    item.className='item';

    var title=document.createElement('b');
    title.textContent=x.title;
    item.appendChild(title);
    item.appendChild(document.createElement('br'));

    var link=document.createElement('span');
    link.textContent=x.url;
    item.appendChild(link);

    var btn=document.createElement('button');
    btn.className='delete';
    btn.textContent='ลบ';
    btn.onclick=function(){del(x.id);};
    item.appendChild(btn);

    list.appendChild(item);
  });
}

async function addLink(){
  var title=document.getElementById('title').value.trim();
  var url=document.getElementById('link').value.trim();

  if(!title || !url){alert('กรอกข้อมูลให้ครบ');return;}

  var r=await fetch('/api/admin/links',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({title:title,url:url})
  });

  if(!r.ok){alert('เพิ่มลิงก์ไม่สำเร็จ');return;}

  document.getElementById('title').value='';
  document.getElementById('link').value='';
  load();
}

async function del(id){
  if(!confirm('ลบลิงก์นี้?'))return;
  var r=await fetch('/api/admin/links/'+id,{method:'DELETE'});
  if(!r.ok){alert('ลบไม่สำเร็จ');return;}
  load();
}
</script>
</body>
</html>`;
}
