async function load(){
  const r=await fetch('/api/admin/links');
  const data=await r.json();

  document.getElementById('list').innerHTML=data.map(x=>
    '<div class="item">'+
    '<b>'+x.title+'</b><br>'+
    x.url+
    '<button class="delete" onclick="del('+x.id+')">ลบ</button>'+
    '</div>'
  ).join('');
}
