
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ---- Shared DB flag: when true, the whole monolith is effectively down
let DB_DOWN = false;
let DOWN_REASON = '';

// ---- Demo data
const PRODUCTS = [
  { id: 'p1', name: 'กล้องโพลารอยด์', price: 3990, img: 'https://picsum.photos/seed/camera/800/600' },
  { id: 'p2', name: 'สติ๊กเกอร์ Pastel', price: 120, img: 'https://picsum.photos/seed/sticker/800/600' },
  { id: 'p3', name: 'ขาตั้งกล้องเล็ก', price: 590, img: 'https://picsum.photos/seed/tripod/800/600' },
  { id: 'p4', name: 'ถุงผ้า Lumera', price: 290, img: 'https://picsum.photos/seed/totebag/800/600' }
];
let CART = [];   // [{productId, qty}]
let ORDERS = []; // [{id, items, amount, time}]

// ---- Toggle routes (kept alive even when down so we can restore)
app.post('/api/db/crash', (req,res)=>{
  DB_DOWN = true;
  DOWN_REASON = 'ระบบฐานข้อมูลที่ใช้ร่วมกันล่ม';
  res.json({ ok:true, dbDown:true, reason: DOWN_REASON });
});
app.post('/api/db/restore', (req,res)=>{
  DB_DOWN = false;
  DOWN_REASON = '';
  res.json({ ok:true, dbDown:false });
});

// Simulate "one service (Cart) crashes -> whole app is down"
app.post('/api/cart/crash', (req,res)=>{
  DB_DOWN = true;
  DOWN_REASON = 'ตะกร้าสินค้าล่มและทำให้ฐานข้อมูลที่ใช้ร่วมกันล่ม (Monolith)';
  res.json({ ok:true, dbDown:true, reason: DOWN_REASON });
});

// Serve custom error page helper
function serveErrorPage(res, status=503){
  res.status(status).sendFile(path.join(__dirname,'public','error.html'));
}

// ---- Global gate: when DB_DOWN, all non-toggle endpoints show our custom error page (HTML)
app.use((req,res,next)=>{
  if(DB_DOWN && !req.path.startsWith('/api/db')){
    return serveErrorPage(res, 503);
  }
  next();
});

// ---- Health (will also be caught by the gate above when down)
app.get('/api/health', (req,res)=> res.json({ status:'ok', down: false }));

// ---- Catalog
app.get('/api/catalog/products', (req,res)=> res.json({ products: PRODUCTS }));
app.get('/api/catalog/products/:id', (req,res)=>{
  const p = PRODUCTS.find(x=>x.id===req.params.id);
  if(!p) return res.status(404).json({error:'not found'});
  res.json(p);
});

// ---- Cart
app.get('/api/cart', (req,res)=> res.json({ items: CART }));
app.post('/api/cart/add', (req,res)=>{
  const {productId, qty=1} = req.body||{};
  if(!productId) return res.status(400).json({error:'productId required'});
  const found = CART.find(i=>i.productId===productId);
  if(found) found.qty += Number(qty)||1; else CART.push({productId, qty:Number(qty)||1});
  res.json({ ok:true, items: CART });
});
app.delete('/api/cart/clear', (req,res)=>{ CART=[]; res.json({ ok:true }) });

// ---- Order
function calcAmount(items){
  return items.reduce((sum,it)=>{
    const p = PRODUCTS.find(x=>x.id===it.productId);
    return sum + (p?p.price:0) * (Number(it.qty)||0);
  },0);
}
app.post('/api/order', (req,res)=>{
  const {items, source='direct'} = req.body||{};
  if(!Array.isArray(items)||items.length===0) return res.status(400).json({error:'items required'});
  const amount = calcAmount(items);
  const id = 'ord_'+Math.random().toString(36).slice(2,8);
  const order = { id, items, amount, source, time:new Date().toISOString() };
  ORDERS.push(order);
  res.json(order);
});
app.get('/api/orders', (req,res)=> res.json({ orders: ORDERS }));

// ---- Static: index and custom error page
app.use(express.static(path.join(__dirname,'public')));
app.get('/error', (req,res)=> res.sendFile(path.join(__dirname,'public','error.html')));
app.get('*', (req,res)=> res.sendFile(path.join(__dirname,'public','index.html')));

// ---- Fallback error handler: always our own HTML page
app.use((err, req, res, next) => {
  console.error('Fatal error:', err);
  return serveErrorPage(res, 500);
});

app.listen(PORT, ()=> console.log(`Monolith (ALL-down with custom error page) -> http://localhost:${PORT}`));
