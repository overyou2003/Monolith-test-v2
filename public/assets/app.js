
const fmt = (n)=> (n||0).toLocaleString('th-TH')
const $ = (sel)=> document.querySelector(sel)
const grid = $('#products')
const statusApp = $('#status-app b')
const modal = $('#cart-modal')
const cartBody = $('#cart-body')
const notice = $('#notice')

// Status (if server switched to error page for /api/health, this fetch will be redirected to HTML)
async function refreshStatus(){
  try{
    const r = await fetch('/api/health', { headers:{'Accept':'application/json'} })
    if(!r.ok) throw new Error('down')
    const j = await r.json().catch(()=>({}))
    statusApp.textContent = 'ปกติ'
    hideNotice()
  }catch{
    statusApp.textContent = 'ล่ม'
    showNotice('ระบบล่ม (Monolith ใช้ฐานข้อมูลเดียว) — ทุกฟีเจอร์ไม่พร้อมใช้งาน')
  }
}
setInterval(refreshStatus, 4000); refreshStatus()

function showNotice(msg){ notice.textContent = msg; notice.classList.remove('hidden') }
function hideNotice(){ notice.classList.add('hidden') }

// Products
async function loadProducts(){
  grid.innerHTML = '<p class="muted">กำลังโหลดสินค้า…</p>'
  try{
    const res = await fetch('/api/catalog/products', { headers:{'Accept':'application/json'} })
    if(!res.ok) throw new Error('down')
    const {products=[]} = await res.json()
    grid.innerHTML = ''
    for(const p of products){
      const card = document.createElement('div')
      card.className = 'card'
      card.innerHTML = `
        <img src="${p.img}" alt="${p.name}" onerror="this.src='https://picsum.photos/seed/fallback/800/600'">
        <h4>${p.name}</h4>
        <p>${fmt(p.price)} บาท</p>
        <div class="row">
          <span class="muted">จำนวน</span>
          <input type="number" min="1" value="1" />
        </div>
        <div class="row" style="margin-top:8px">
          <button class="btn add">เพิ่มลงตะกร้า</button>
          <button class="btn ghost buy">ซื้อทันที</button>
        </div>
      `
      const qtyEl = card.querySelector('input')
      card.querySelector('.add').onclick = ()=> addToCart(p.id, Number(qtyEl.value)||1)
      card.querySelector('.buy').onclick = ()=> buyNow(p.id, Number(qtyEl.value)||1)
      grid.appendChild(card)
    }
  }catch{
    grid.innerHTML = `<p class="badtext">โหลดสินค้าไม่สำเร็จ — ระบบล่ม</p>`
  }
}
loadProducts()

async function addToCart(productId, qty){
  try{
    const r = await fetch('/api/cart/add', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({productId, qty}) })
    if(!r.ok) throw new Error('down')
    alert('เพิ่มลงตะกร้าแล้ว')
  }catch{
    alert('เพิ่มตะกร้าไม่ได้ — ระบบล่ม (Monolith)')
  }
}

async function buyNow(productId, qty){
  try{
    const items = [{productId, qty}]
    const r = await fetch('/api/order',{ method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({items, source:'direct'}) })
    const j = await r.json().catch(()=>({}))
    if(!r.ok) throw new Error('down')
    alert(`สั่งซื้อสำเร็จ เลขออเดอร์: ${j.id} (รวม ${fmt(j.amount)} บาท)`)
  }catch{
    alert('สั่งซื้อไม่ได้ — ระบบล่ม (Monolith)')
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('cart-modal');
  const btnOpen = document.getElementById('btn-open-cart');
  const btnClose = document.getElementById('btn-close');

  // เปิด modal
  btnOpen.addEventListener('click', () => {
    modal.classList.remove('hidden');
    loadCart();
  });

  // ปิด modal ด้วยปุ่ม "ปิด"
  btnClose.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // คลิกนอกกล่อง modal เพื่อปิด
  modal.addEventListener('mousedown', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

// Modal open/close
//$('#btn-open-cart').onclick = ()=>{ modal.classList.remove('hidden'); loadCart() }
//$('#btn-close').onclick = ()=> modal.classList.add('hidden')
//modal.addEventListener('mousedown', (e)=>{ if(e.target===modal) modal.classList.add('hidden') })

async function loadCart(){
  try{
    const cart = await fetch('/api/cart', { headers:{'Accept':'application/json'} }).then(r=>{ if(!r.ok) throw new Error('down'); return r.json() })
    const products = await fetch('/api/catalog/products', { headers:{'Accept':'application/json'} }).then(r=>{ if(!r.ok) throw new Error('down'); return r.json() })
    const map = new Map(products.products.map(p=>[p.id,p]))
    const detailed = (cart.items||[]).map(it=>{
      const p = map.get(it.productId)||{}
      const price = Number(p.price||0); const qty = Number(it.qty||0); const line = price*qty
      return { id: it.productId, name:p.name||it.productId, img:p.img, price, qty, line }
    })
    const total = detailed.reduce((s,i)=>s+i.line,0)
    cartBody.innerHTML = detailed.length===0
      ? '<p class="muted">ยังไม่มีสินค้าในตะกร้า</p>'
      : `<ul>${detailed.map(i=>`
          <li>
            <img src="${i.img}" alt="${i.name}" onerror="this.src='https://picsum.photos/seed/fallback/144/144'"/>
            <div>
              <div style="font-weight:700">${i.name}</div>
              <div class="muted">฿${fmt(i.price)} × ${i.qty}</div>
            </div>
            <div style="font-weight:800">฿${fmt(i.line)}</div>
          </li>`).join('')}</ul>
         <div style="display:flex;justify-content:space-between;margin-top:12px;align-items:center">
           <div class="muted">รวมทั้งหมด</div>
           <div style="font-size:1.15rem;font-weight:900">฿${fmt(total)}</div>
         </div>`
  }catch{
    cartBody.innerHTML = '<p class="badtext">โหลดตะกร้าไม่ได้ — ระบบล่ม</p>'
  }
}

$('#btn-clear').onclick = async ()=>{ await fetch('/api/cart/clear', {method:'DELETE'}).catch(()=>{}); loadCart() }
$('#btn-checkout').onclick = async ()=>{
  try{
    const c = await fetch('/api/cart', { headers:{'Accept':'application/json'} }).then(r=>{ if(!r.ok) throw new Error('down'); return r.json() })
    const r = await fetch('/api/order',{ method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({items: c.items||[], source:'cart'}) })
    const j = await r.json().catch(()=>({}))
    if(!r.ok) throw new Error('down')
    alert(`ชำระสำเร็จ เลขออเดอร์: ${j.id} (รวม ${fmt(j.amount)} บาท)`)
    await fetch('/api/cart/clear',{method:'DELETE'}).catch(()=>{})
    loadCart()
  }catch{
    alert('ชำระเงินไม่ได้ — ระบบล่ม')
  }
}

// Crash/Restore buttons
$('#btn-crash-cart').onclick = async ()=>{
  await fetch('/api/cart/crash',{method:'POST'})
  // Next requests will be served with custom error page by the server
  location.href = '/error'
}
$('#btn-crash-db').onclick = async ()=>{
  await fetch('/api/db/crash',{method:'POST'})
  location.href = '/error'
}
$('#btn-restore').onclick = async ()=>{
  await fetch('/api/db/restore',{method:'POST'})
  hideNotice()
  location.href = '/'
}
