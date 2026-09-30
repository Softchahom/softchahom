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

body{
  margin:0;
  background:#fff5fa;
  font-family:Arial,sans-serif;
  color:#9b5578;
}

/* =========================
   ข้อ 1 : หัวเว็บ
========================= */

.header{
  width:92%;
  max-width:900px;
  margin:30px auto 0;
  position:relative;
  padding-bottom:90px;
}

/* กรอบสี่เหลี่ยมยาว */
.header-banner{
  width:100%;
  height:230px;

  background-image:url("banner.png");
  background-size:cover;
  background-position:center;

  border:2px solid #e7b4cc;
  border-radius:4px;
}

/* ส่วนข้อมูลใต้กรอบ */
.profile-info{
  position:relative;
  display:flex;
  align-items:center;

  margin-top:-70px;
  margin-left:35px;
}

/* รูปโปรไฟล์วงกลม */
.profile-picture{
  width:150px;
  height:150px;

  border-radius:50%;

  object-fit:cover;

  border:3px solid #fff;

  box-shadow:
    0 3px 12px rgba(150,80,120,.25);

  flex-shrink:0;
}

/* ข้อความข้างรูป */
.profile-text{
  margin-left:25px;
  padding-top:65px;
}

.profile-name{
  margin:0;

  font-size:22px;
  font-weight:bold;

  color:#b66b8e;
}

.verified{
  display:inline-flex;

  width:20px;
  height:20px;

  align-items:center;
  justify-content:center;

  margin-left:5px;

  border-radius:50%;

  background:#e88ab5;
  color:white;

  font-size:13px;
  font-weight:bold;

  vertical-align:middle;
}

.description{
  margin:7px 0 0;

  font-size:13px;
  line-height:1.6;

  color:#a66a86;
}

/* มือถือ */
@media(max-width:600px){

  .header{
    width:94%;
    margin-top:20px;
    padding-bottom:100px;
  }

  .header-banner{
    height:190px;
  }

  .profile-info{
    margin-top:-55px;
    margin-left:18px;
    align-items:flex-start;
  }

  .profile-picture{
    width:120px;
    height:120px;
  }

  .profile-text{
    margin-left:15px;
    padding-top:55px;
  }

  .profile-name{
    font-size:19px;
  }

  .description{
    font-size:11px;
  }

}

</style>
</head>

<body>

<!-- =========================
     ข้อ 1
========================= -->

<header class="header">

  <!-- กรอบสี่เหลี่ยมยาว -->
  <div class="header-banner"></div>

  <!-- รูปโปรไฟล์ + ข้อมูล -->
  <div class="profile-info">

    <img
      class="profile-picture"
      src="profile.jpg"
      alt="CONYXCHAHOM"
    >

    <div class="profile-text">

      <h1 class="profile-name">
        conyxchahom
        <span class="verified">✓</span>
      </h1>

      <p class="description">
        บริการรับกดไนโตร กรอบดิสคอร์ด<br>
        เปิดร้านมานานกว่า 2 ปี
      </p>

    </div>

  </div>

</header>

</body>
</html>`;
}
