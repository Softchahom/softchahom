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
        return Response.json(
          { error: "รหัสผ่านไม่ถูกต้อง" },
          { status: 401 }
        );
      }

      const token = crypto.randomUUID();
      const expires = Date.now() + 86400000;

      await env.DB.prepare(
        "INSERT INTO sessions (token,expires_at) VALUES (?,?)"
      ).bind(token, expires).run();

      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json",
          "set-cookie":
            "session=" + token +
            "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400"
        }
      });
    }

    if (url.pathname === "/api/admin/links" && request.method === "POST") {
      if (!(await loggedIn(request, env))) {
        return Response.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      const body = await request.json();

      if (!body.title || !body.url) {
        return Response.json(
          { error: "กรอกข้อมูลให้ครบ" },
          { status: 400 }
        );
      }

      await env.DB.prepare(
        "INSERT INTO links (title,url,enabled,sort_order) VALUES (?,?,1,?)"
      )
        .bind(
          body.title,
          body.url,
          Number(body.sort_order || 0)
        )
        .run();

      return Response.json({ ok: true });
    }

    if (
      url.pathname.startsWith("/api/admin/links/") &&
      request.method === "DELETE"
    ) {
      if (!(await loggedIn(request, env))) {
        return Response.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      const id = url.pathname.split("/").pop();

      await env.DB.prepare(
        "DELETE FROM links WHERE id=?"
      ).bind(id).run();

      return Response.json({ ok: true });
    }

    if (url.pathname === "/api/admin/links" && request.method === "GET") {
      if (!(await loggedIn(request, env))) {
        return Response.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
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
  )
    .bind(match[1], Date.now())
    .first();

  return !!row;
}


function homePage() {
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">

<title>CONYXCHAHOM</title>

<style>

*{
  box-sizing:border-box;
}

html{
  scroll-behavior:smooth;
}

body{
  margin:0;
  font-family:Arial,sans-serif;
  color:#563b49;
  min-height:100vh;
  overflow-x:hidden;

  background:
    radial-gradient(circle at 10% 15%,#fff 0 4px,transparent 5px),
    radial-gradient(circle at 90% 30%,#fff 0 3px,transparent 4px),
    radial-gradient(circle at 20% 75%,#fff 0 3px,transparent 4px),
    linear-gradient(
      180deg,
      #ffd9eb 0%,
      #ffe7f2 45%,
      #fff4f9 100%
    );
}


/* =========================
   ตกแต่งพื้นหลัง
========================= */

body::before{
  content:"✦";
  position:fixed;
  left:8%;
  top:20%;
  color:white;
  font-size:30px;
  opacity:.8;
  animation:float 4s ease-in-out infinite;
  pointer-events:none;
}

body::after{
  content:"✧";
  position:fixed;
  right:10%;
  top:65%;
  color:white;
  font-size:35px;
  opacity:.8;
  animation:float 5s ease-in-out infinite reverse;
  pointer-events:none;
}

@keyframes float{

  0%,100%{
    transform:translateY(0) rotate(0);
  }

  50%{
    transform:translateY(-18px) rotate(15deg);
  }

}


/* =========================
   กล่องหลัก
========================= */

.container{
  width:min(92%,620px);
  margin:auto;
  padding:40px 0 80px;
  text-align:center;
}


/* =========================
   โบว์
========================= */

.bow{
  font-size:55px;

  animation:
    bowFloat 2.5s ease-in-out infinite;
}

@keyframes bowFloat{

  0%,100%{
    transform:scale(1) rotate(0);
  }

  50%{
    transform:scale(1.08) rotate(-5deg);
  }

}


/* =========================
   ชื่อ
========================= */

h1{
  margin:10px 0 8px;

  color:#b0527c;

  font-size:30px;

  letter-spacing:1px;
}

.verified{

  display:inline-flex;

  align-items:center;
  justify-content:center;

  width:22px;
  height:22px;

  margin-left:5px;

  border-radius:50%;

  background:#e58ab4;

  color:white;

  font-size:14px;
  font-weight:bold;

  box-shadow:
    0 3px 10px #d97fa755;
}


/* =========================
   คำอธิบาย
========================= */

.subtitle{

  font-size:17px;

  line-height:1.8;

  margin-bottom:30px;

}


/* =========================
   ของตกแต่ง
========================= */

.decor{

  font-size:38px;

  margin:12px 0;

  animation:
    wiggle 3s ease-in-out infinite;
}

@keyframes wiggle{

  0%,100%{
    transform:rotate(0);
  }

  50%{
    transform:rotate(6deg) translateY(-5px);
  }

}


/* =========================
   การ์ด
========================= */

.card{

  position:relative;

  background:#fff9fc;

  border:2px solid #f2b7d1;

  border-radius:25px;

  padding:24px 20px;

  margin:18px 0;

  box-shadow:
    0 10px 30px #d78aaa30;

  animation:
    cardIn .8s ease both;

  transition:
    transform .25s ease,
    box-shadow .25s ease;
}

.card:hover{

  transform:
    translateY(-4px);

  box-shadow:
    0 15px 35px #d78aaa45;
}

@keyframes cardIn{

  from{
    opacity:0;
    transform:
      translateY(25px)
      scale(.96);
  }

  to{
    opacity:1;
    transform:
      translateY(0)
      scale(1);
  }

}

.card h2{

  margin:0 0 18px;

  color:#b0527c;

  font-size:22px;

}


/* =========================
   กล่องข้อมูล
========================= */

.info{

  display:grid;

  grid-template-columns:
    1fr 1fr;

  gap:15px;
}

.info-box{

  background:#ffe7f2;

  border-radius:18px;

  padding:16px 8px;

  transition:.25s;
}

.info-box:hover{

  transform:scale(1.03);

}

.info-box b{

  display:block;

  color:#a24d74;

  font-size:18px;

  margin-bottom:8px;
}


/* =========================
   ดาว
========================= */

.rating{

  font-size:25px;

  color:#e3a02d;

  letter-spacing:2px;
}


/* =========================
   รีวิว
========================= */

.review{

  line-height:1.8;

}


/* =========================
   หัวข้อรีวิว
========================= */

.review-title{

  margin:
    40px 0 20px;

  color:#b0527c;

}


/* =========================
   Footer
========================= */

.footer{

  margin-top:60px;

  color:#b0527c;

  font-size:18px;

}


/* =========================
   ปุ่มเพลง
========================= */

.music{

  position:fixed;

  right:20px;
  bottom:20px;

  width:60px;
  height:60px;

  border:
    3px solid white;

  border-radius:50%;

  background:#d9d9d9;

  color:#333;

  font-size:25px;

  box-shadow:
    0 7px 20px #77777755;

  z-index:999;

  cursor:pointer;

  transition:
    transform .25s ease,
    box-shadow .25s ease;
}

.music:active{

  transform:
    scale(.86);

}

.music.playing{

  animation:
    musicPrincess 1.8s ease-in-out infinite;
}

@keyframes musicPrincess{

  0%,100%{
    transform:
      scale(1)
      rotate(0);
  }

  50%{
    transform:
      scale(1.12)
      rotate(8deg);
  }

}


/* =========================
   เอฟเฟกต์ตอนแตะ
========================= */

.spark{

  position:fixed;

  pointer-events:none;

  z-index:9999;

  font-size:20px;

  animation:
    sparkOut .8s ease-out forwards;
}

@keyframes sparkOut{

  from{

    opacity:1;

    transform:
      translate(0,0)
      scale(.6)
      rotate(0);
  }

  to{

    opacity:0;

    transform:
      translate(var(--x),var(--y))
      scale(1.4)
      rotate(25deg);
  }

}


/* =========================
   มือถือ
========================= */

@media(max-width:500px){

  .container{
    padding-top:30px;
  }

  h1{
    font-size:27px;
  }

  .info{
    gap:10px;
  }

}

</style>
</head>


<body>


<div class="container">


  <div class="bow">
    🎀
  </div>


  <h1>

    CONYXCHAHOM

    <span class="verified">
      ✓
    </span>

  </h1>


  <div class="subtitle">

    บริการรับกดไนโตร กรอบดีส ฯลฯ<br>

    เปิดร้านมานานกว่า 2 ปี

  </div>


  <div class="decor">
    🐰
  </div>


  <div class="card">

    <h2>
      Admin
    </h2>


    <div class="info">


      <div class="info-box">

        <b>
          password
        </b>

        <span>
          ••••••••
        </span>

      </div>


      <div class="info-box">

        <b>
          rating
        </b>

        <div class="rating">
          ★★★★★
        </div>

        <span>
          5.0
        </span>

      </div>


    </div>

  </div>


  <div class="card">

    <h2>
      review
    </h2>

    <div class="review">

      ข้อความรีวิวของลูกค้า<br>

      สามารถจัดการได้จากหน้า Admin

    </div>

  </div>


  <div class="card">

    <div class="info">


      <div class="info-box">

        <b>
          ชื่อ
        </b>

        <span>
          รีวิว
        </span>

      </div>


      <div class="info-box">

        <b>
          เพียงเธอ
        </b>

        <span>
          aiko cartier
        </span>

      </div>


    </div>


    <p class="review">

      ทำเป็นสัญลักษณ์ว่าเพลงถึงท่อนไหนแล้ว<br><br>

      กดปุ่มเพลงเพื่อเปิด / ปิดเพลง

    </p>

  </div>


  <div class="decor">
    🎂
  </div>


  <h2 class="review-title">

    รวมข้อความที่ลูกค้ารีวิวมา

  </h2>


  <div class="card">

    💗 ขอบคุณสำหรับทุกรีวิว 💗

  </div>


  <div class="footer">

    thx for support chahom 🎀

  </div>


</div>


<!-- ปุ่มเพลง -->

<button
  class="music"
  id="musicBtn"
  aria-label="เปิดปิดเพลง">

  🎵

</button>


<script>


/* =========================
   เอฟเฟกต์ตอนแตะหน้าจอ
========================= */

document.addEventListener(
  'pointerdown',
  function(e){

    var icons=[
      '✦',
      '♡',
      '🎀',
      '✧'
    ];


    for(
      var i=0;
      i<4;
      i++
    ){

      var s=
        document.createElement(
          'span'
        );


      s.className=
        'spark';


      s.textContent=
        icons[
          Math.floor(
            Math.random()
            * icons.length
          )
        ];


      s.style.left=
        e.clientX+'px';


      s.style.top=
        e.clientY+'px';


      s.style.setProperty(
        '--x',
        (
          Math.random()*100-50
        )+'px'
      );


      s.style.setProperty(
        '--y',
        (
          Math.random()*100-80
        )+'px'
      );


      document.body.appendChild(s);


      setTimeout(
        function(el){

          return function(){
            el.remove();
          };

        }(s),

        800
      );

    }

  }
);


/* =========================
   ปุ่มเพลง
========================= */

var musicBtn=
  document.getElementById(
    'musicBtn'
  );


var playing=false;


musicBtn.onclick=
  function(){

    playing=!playing;


    if(playing){

      musicBtn.textContent=
        '🔊';

      musicBtn.classList.add(
        'playing'
      );

    }else{

      musicBtn.textContent=
        '🎵';

      musicBtn.classList.remove(
        'playing'
      );

    }

  };


</script>


</body>
</html>`;
}


function adminPage() {
  return `<!doctype html>
<html lang="th">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>
Softchahom Admin
</title>

<style>

body{
  font-family:Arial,sans-serif;
  background:#f4f4f5;
  margin:0;
  color:#111;
}

.box{
  max-width:600px;
  margin:30px auto;
  padding:20px;
}

input,
button{
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
  background:white;
  padding:15px;
  margin:10px 0;
  border-radius:12px;
  overflow-wrap:anywhere;
}

.delete{
  background:#c00;
}

</style>

</head>


<body>

<div class="box">

<h1>
จัดการลิงก์
</h1>


<div id="login">

<input
  id="password"
  type="password"
  placeholder="Admin password"
>

<button onclick="login()">
เข้าสู่ระบบ
</button>

</div>


<div
  id="panel"
  style="display:none"
>


<h2>
เพิ่มลิงก์
</h2>


<input
  id="title"
  placeholder="ชื่อปุ่ม เช่น Facebook"
>


<input
  id="link"
  type="url"
  placeholder="https://example.com"
>


<button onclick="addLink()">
เพิ่มลิงก์
</button>


<h2>
ลิงก์ทั้งหมด
</h2>


<div id="list">
</div>


</div>


<p>

<a href="/">
กลับหน้าหลัก
</a>

</p>


</div>


<script>


async function login(){

  var password=
    document
      .getElementById(
        'password'
      )
      .value;


  var r=
    await fetch(
      '/api/login',
      {
        method:'POST',

        headers:{
          'content-type':
            'application/json'
        },

        body:
          JSON.stringify({
            password:password
          })
      }
    );


  if(!r.ok){

    alert(
      'รหัสผ่านไม่ถูกต้อง'
    );

    return;
  }


  document
    .getElementById(
      'login'
    )
    .style.display='none';


  document
    .getElementById(
      'panel'
    )
    .style.display='block';


  load();

}


async function load(){

  var r=
    await fetch(
      '/api/admin/links'
    );


  if(!r.ok){

    alert(
      'กรุณาเข้าสู่ระบบใหม่'
    );

    return;
  }


  var data=
    await r.json();


  var list=
    document.getElementById(
      'list'
    );


  list.innerHTML='';


  data.forEach(
    function(x){

      var item=
        document.createElement(
          'div'
        );


      item.className=
        'item';


      var title=
        document.createElement(
          'b'
        );


      title.textContent=
        x.title;


      item.appendChild(
        title
      );


      item.appendChild(
        document.createElement(
          'br'
        )
      );


      var link=
        document.createElement(
          'span'
        );


      link.textContent=
        x.url;


      item.appendChild(
        link
      );


      var btn=
        document.createElement(
          'button'
        );


      btn.className=
        'delete';


      btn.textContent=
        'ลบ';


      btn.onclick=
        function(){

          del(x.id);

        };


      item.appendChild(
        btn
      );


      list.appendChild(
        item
      );

    }
  );

}


async function addLink(){

  var title=
    document
      .getElementById(
        'title'
      )
      .value
      .trim();


  var url=
    document
      .getElementById(
        'link'
      )
      .value
      .trim();


  if(!title || !url){

    alert(
      'กรอกข้อมูลให้ครบ'
    );

    return;
  }


  var r=
    await fetch(
      '/api/admin/links',
      {
        method:'POST',

        headers:{
          'content-type':
            'application/json'
        },

        body:
          JSON.stringify({
            title:title,
            url:url
          })
      }
    );


  if(!r.ok){

    alert(
      'เพิ่มลิงก์ไม่สำเร็จ'
    );

    return;
  }


  document
    .getElementById(
      'title'
    )
    .value='';


  document
    .getElementById(
      'link'
    )
    .value='';


  load();

}


async function del(id){

  if(
    !confirm(
      'ลบลิงก์นี้?'
    )
  ){

    return;
  }


  var r=
    await fetch(
      '/api/admin/links/'+id,
      {
        method:'DELETE'
      }
    );


  if(!r.ok){

    alert(
      'ลบไม่สำเร็จ'
    );

    return;
  }


  load();

}

</script>


</body>
</html>`;
}
