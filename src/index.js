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
          "set-cookie": `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
        }
      });
    }

    if (url.pathname === "/api/admin/links" && request.method === "POST") {
      if (!(await loggedIn(request, env))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();

      await env.DB.prepare(
        "INSERT INTO links (title,url,enabled,sort_order) VALUES (?,?,1,?)"
      ).bind(
        body.title,
        body.url,
        Number(body.sort_order || 0)
      ).run();

      return Response.json({ ok: true });
    }

    if (url.pathname.startsWith("/api/admin/links/") && request.method === "DELETE") {
      if (!(await loggedIn(request, env))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = url.pathname.split("/").pop();

      await env.DB.prepare(
        "DELETE FROM links WHERE id=?"
      ).bind(id).run();

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
body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#f4f4f5;
  color:#111;
}
.box{
  max-width:520px;
  margin:50px auto;
  padding:25px;
  text-align:center;
}
h1{font-size:32px}
.card{
  display:block;
  background:white;
  padding:18px;
  margin:14px 0;
  border-radius:15px;
  text-decoration:none;
  color:#111;
  box-shadow:0 3px 12px #0001;
}
.card:hover{transform:scale(1.01)}
small{color:#777}
</style>
</head>
<body>
<div class="box">
<h1>Softchahom</h1>
<p>My Links</p>
<div id="links">กำลังโหลด...</div>
<small>Powered by Cloudflare</small>
</div>

<script>
fetch('/api/links')
.then(r=>r.json())
.then(data=>{
  const box=document.getElementById('links');
  if(!data.length){
    box.innerHTML='<p>ยังไม่มีลิงก์</p>';
    return;
  }
  box.innerHTML=data.map(x=>
    '<a class="card" href="'+x.url+'" target="_blank">'+x.title+'</a>'
  ).join('');
})
.catch(()=>{
  document.getElementById('links').innerHTML='โหลดข้อมูลไม่ได้';
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
<title>Admin</title>
<style>
body{
  font-family:Arial,sans-serif;
  background:#f4f4f5;
  margin:0;
}
.box{
  max-width:600px;
  margin:30px auto;
  padding:20px;
}
input,button{
  width:100%;
  box-sizing:border-box;
  padding:13px;
  margin:6px 0;
  border-radius:10px;
  border:1px solid #ddd;
}
button{
  background:#111;
  color:white;
  cursor:pointer;
}
.item{
