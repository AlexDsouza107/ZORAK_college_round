// ShopLite — a deliberately buggy demo storefront used to showcase PATCHWORK.
// v1 = "production today". v2 = a vendor redesign that ships later (DOM restructured, classes/ids renamed)
// but still contains the same bugs, so patches must *heal* onto the new markup.
import http from 'node:http';

const PORT = Number(process.env.SHOPLITE_PORT || 4100);
let version = 'v1';

const PRODUCTS = [
  { id: 'hp', name: 'Aurora Headphones', price: 129, emoji: '🎧', tone: '#6366f1' },
  { id: 'wt', name: 'Pulse Smartwatch', price: 199, emoji: '⌚', tone: '#0ea5e9' },
  { id: 'kb', name: 'Kinetic Keyboard', price: 89, emoji: '⌨️', tone: '#14b8a6' },
  { id: 'cm', name: 'Lumen Webcam', price: 59, emoji: '📷', tone: '#f59e0b' },
  { id: 'sp', name: 'Orbit Speaker', price: 79, emoji: '🔊', tone: '#ec4899' },
  { id: 'ch', name: 'Volt Charger', price: 29, emoji: '🔌', tone: '#84cc16' }
];

/* ------------------------------------------------------------------ shared JS */
const APP_JS = `
(function(){
  var V = window.SHOP_VERSION, P = ${JSON.stringify(PRODUCTS)};
  function cart(){ try { return JSON.parse(localStorage.getItem('shoplite.cart')||'[]'); } catch(e){ return []; } }
  function save(c){ localStorage.setItem('shoplite.cart', JSON.stringify(c)); }
  function count(){ return cart().reduce(function(n,i){return n+i.qty;},0); }
  function paint(){ var el=document.getElementById(V==='v1'?'cart-count':'bag-count'); if(el) el.textContent=count(); }
  function money(n){ return '$'+n.toFixed(2); }
  document.addEventListener('click', function(e){
    var add = e.target.closest('[data-add]');
    if (add) { var c=cart(), id=add.getAttribute('data-add'), it=c.find(function(x){return x.id===id;}); if(it) it.qty++; else c.push({id:id,qty:1}); save(c); paint(); add.setAttribute('data-added','1'); var o=add.textContent; add.textContent='Added ✓'; setTimeout(function(){add.textContent=o;},900); }
    var rm = e.target.closest('[data-remove]');
    if (rm) { save(cart().filter(function(x){return x.id!==rm.getAttribute('data-remove');})); render(); paint(); }
    var go = e.target.closest('[data-go]');
    if (go && !go.disabled) { location.href = go.getAttribute('data-go'); }
  });
  function render(){
    var box = document.getElementById('cart-items'); if(!box) return;
    var c = cart(), total = 0;
    if(!c.length){ box.innerHTML = '<p class="empty">Your cart is empty. <a href="/">Browse products</a></p>'; }
    else box.innerHTML = c.map(function(i){ var p=P.find(function(x){return x.id===i.id;}); total+=p.price*i.qty;
      return '<div class="'+(V==='v1'?'cart-row':'line')+'"><span class="'+(V==='v1'?'thumb':'line__thumb')+'" style="background:'+p.tone+'">'+p.emoji+'</span><span class="'+(V==='v1'?'name':'line__name')+'">'+p.name+' <small>× '+i.qty+'</small></span><strong>'+money(p.price*i.qty)+'</strong><button type="button" class="'+(V==='v1'?'link-btn':'line__rm')+'" data-remove="'+p.id+'" aria-label="Remove '+p.name+'">Remove</button></div>'; }).join('');
    var st = document.getElementById('subtotal'); if(st) st.textContent = money(total);
  }
  var form = document.getElementById('checkout-form');
  if (form) form.addEventListener('submit', function(e){ e.preventDefault(); localStorage.setItem('shoplite.order','SL-'+Math.floor(1000+Math.random()*9000)); save([]); location.href='/confirmation'; });
  var ord = document.getElementById('order-no'); if (ord) ord.textContent = localStorage.getItem('shoplite.order') || 'SL-0000';
  render(); paint();
})();
`;

/* -------------------------------------------------------------------- CSS v1 */
const CSS_V1 = `
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#1f2937;background:#f8fafc}
a{color:#2563eb;text-decoration:none}
.site-header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:5}
.logo{font-weight:800;font-size:22px;color:#111827;letter-spacing:-.5px}.logo::before{content:'🛍️ '}
.main-nav a{margin-left:24px;font-weight:600;color:#374151}
.container{max-width:1080px;margin:0 auto;padding:28px 24px 60px}
.hero{background:linear-gradient(120deg,#e0e7ff,#fce7f3);border-radius:18px;padding:44px 48px;margin-bottom:30px}
.hero h1{margin:0 0 8px;font-size:38px;letter-spacing:-1px}.hero p{margin:0 0 20px;color:#4b5563;font-size:17px}
.btn{display:inline-block;border:0;border-radius:10px;padding:11px 20px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit}
.btn-primary{background:#2563eb;color:#fff;width:100%;margin:14px 0 10px}.btn-primary:disabled{background:#93a3bd;cursor:not-allowed}
.btn-secondary{background:#eef2ff;color:#3730a3}.btn-secondary:hover{background:#e0e7ff}
.btn-hero{background:#fff;color:#c4c9d4;border:1px solid #e5e7eb}
.grid-products{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.card .img{height:130px;display:flex;align-items:center;justify-content:center;font-size:54px;color:#fff}
.card .body{padding:16px;display:flex;flex-direction:column;gap:6px;flex:1}.card h3{margin:0;font-size:17px}.price{font-weight:800;font-size:18px}
.card .btn{margin-top:auto}
h2.section{margin:34px 0 16px;font-size:22px}
.page-title{font-size:30px;margin:0 0 20px}
.cart-layout{display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start}
.cart-items{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:8px 20px;min-height:120px}
.cart-row{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #f1f5f9}.cart-row:last-child{border:0}
.thumb{width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px}
.cart-row .name{flex:1;font-weight:600}.cart-row small{color:#6b7280;font-weight:500}
.link-btn{background:none;border:0;color:#6b7280;cursor:pointer;text-decoration:underline;font-size:13px}
.cart-summary{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px}.cart-summary h2{margin:0 0 14px;font-size:18px}
.row{display:flex;justify-content:space-between;padding:6px 0}.link{display:block;text-align:center;font-size:14px}
.empty{padding:26px 6px;color:#6b7280}
.form{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:26px;max-width:520px}
.form label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}.form input{width:100%;padding:11px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:15px;font-family:inherit}
.form .btn-primary{margin-top:22px}
.done{text-align:center;padding:60px 20px}.done .tick{font-size:56px}.done h1{margin:10px 0}
footer.site-footer{padding:30px;text-align:center;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;background:#fff}
@media(max-width:760px){.grid-products{grid-template-columns:1fr 1fr}.cart-layout{grid-template-columns:1fr}.hero{padding:28px}.hero h1{font-size:28px}.site-header{padding:12px 16px}.main-nav a{margin-left:14px}}
`;

/* -------------------------------------------------------------------- CSS v2 */
const CSS_V2 = `
*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;color:#e5e7eb;background:#0b1020}
a{color:#a5b4fc;text-decoration:none}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:rgba(15,23,42,.85);border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:5;backdrop-filter:blur(8px)}
.brand{font-weight:900;font-size:24px;color:#fff;letter-spacing:-1px}.brand::after{content:'.';color:#818cf8}
.topbar__nav{display:flex;gap:22px;align-items:center}.topbar__nav a{font-weight:600;color:#cbd5e1}
.pill{display:inline-block;min-width:22px;text-align:center;background:#6366f1;color:#fff;border-radius:99px;padding:1px 7px;font-size:12px;margin-left:4px}
.page{max-width:1160px;margin:0 auto;padding:36px 28px 80px}
.stage{background:radial-gradient(circle at 20% 20%,#312e81,#0b1020 70%);border:1px solid #1e293b;border-radius:28px;padding:64px 56px;margin-bottom:40px}
.stage__title{margin:0 0 10px;font-size:46px;letter-spacing:-1.5px;color:#fff}.stage__sub{margin:0 0 26px;color:#94a3b8;font-size:18px}
.ui-btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;padding:12px 24px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit}
.ui-btn--cta{background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;width:100%;margin:18px 0 12px}.ui-btn--cta:disabled{opacity:.45;cursor:not-allowed}
.ui-btn--ghost{background:#1e293b;color:#c7d2fe}.ui-btn--ghost:hover{background:#273449}
.ui-btn--hero{background:#e2e8f0;color:#cbd5e1}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.tile{background:#111a30;border:1px solid #1e293b;border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:8px}
.tile__art{height:120px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:50px}
.tile__name{margin:0;font-size:17px;color:#fff}.tile__price{font-weight:800;color:#a5b4fc}.tile .ui-btn{margin-top:auto}
.page__heading{font-size:34px;margin:0 0 24px;color:#fff;letter-spacing:-1px}.sec{margin:6px 0 20px;font-size:20px;color:#fff}
.grid{display:grid;grid-template-columns:1fr 320px;gap:28px;align-items:start}
.grid__main{background:#111a30;border:1px solid #1e293b;border-radius:22px;padding:10px 22px;min-height:120px}
.line{display:flex;align-items:center;gap:14px;padding:16px 0;border-bottom:1px solid #1e293b}.line:last-child{border:0}
.line__thumb{width:52px;height:52px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:24px}
.line__name{flex:1;font-weight:600;color:#fff}.line small{color:#94a3b8}.line__rm{background:none;border:0;color:#94a3b8;cursor:pointer;text-decoration:underline;font-size:13px}
.order-summary{position:sticky;top:96px}.order-summary__card{background:#111a30;border:1px solid #1e293b;border-radius:22px;padding:24px}
.order-summary__title{margin:0 0 14px;font-size:18px;color:#fff}.order-summary__line{display:flex;justify-content:space-between;padding:7px 0;color:#cbd5e1}
.order-summary__back{display:block;text-align:center;font-size:14px}
.empty{padding:26px 6px;color:#94a3b8}
.panel{background:#111a30;border:1px solid #1e293b;border-radius:22px;padding:28px;max-width:540px}
.panel label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px;color:#cbd5e1}.panel input{width:100%;padding:12px 14px;border:1px solid #334155;background:#0b1020;color:#fff;border-radius:14px;font-size:15px;font-family:inherit}
.panel .ui-btn--cta{margin-top:24px}
.success{text-align:center;padding:70px 20px}.success__tick{font-size:60px}.success h1{color:#fff;margin:10px 0}
.foot{padding:34px;text-align:center;color:#64748b;font-size:14px;border-top:1px solid #1e293b}
@media(max-width:760px){.tiles{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}.stage{padding:32px 24px}.stage__title{font-size:30px}.topbar{padding:14px 16px}.order-summary{position:static}}
`;

/* ---------------------------------------------------------------- templates */
const productCards = (v) => PRODUCTS.map((p) => v === 'v1'
  ? `<article class="card"><div class="img" style="background:${p.tone}">${p.emoji}</div><div class="body"><h3>${p.name}</h3><span class="price">$${p.price}</span><button type="button" class="btn btn-secondary" data-add="${p.id}">Add to cart</button></div></article>`
  : `<article class="tile"><div class="tile__art" style="background:${p.tone}">${p.emoji}</div><h3 class="tile__name">${p.name}</h3><span class="tile__price">$${p.price}</span><button type="button" class="ui-btn ui-btn--ghost" data-add="${p.id}">Add to cart</button></article>`).join('\n');

const PAGES = {
  v1: {
    shell: (title, body, css) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · ShopLite</title><style>${css}</style></head><body>
<header class="site-header"><a class="logo" href="/">ShopLite</a><nav class="main-nav"><a href="/">Shop</a><a href="/cart" id="cart-link">Cart (<span id="cart-count">0</span>)</a></nav></header>
${body}
<footer class="site-footer">© 2026 ShopLite · Free shipping on orders over $50</footer>
<script>window.SHOP_VERSION='v1'</script><script src="/assets/app.js"></script></body></html>`,
    home: () => `<main class="container">
<section class="hero"><h1>Autumn sale is on</h1><p>Up to 30% off tech you'll actually use.</p><a class="btn btn-hero" href="#products" id="hero-cta">Shop the sale</a></section>
<h2 class="section" id="products">Featured products</h2><div class="grid-products">${productCards('v1')}</div></main>`,
    cart: () => `<main class="container"><h1 class="page-title">Your cart</h1><div class="cart-layout"><section class="cart-items" id="cart-items"></section>
<div class="cart-summary"><h2>Order summary</h2><div class="row"><span>Subtotal</span><strong id="subtotal">$0.00</strong></div><div class="row"><span>Shipping</span><span>Free</span></div>
<button id="checkout-btn" class="btn btn-primary" data-testid="checkout" type="button" aria-label="Proceed to checkout" data-go="/checkout" disabled>Proceed to chekout</button>
<a class="link" href="/">Continue shopping</a></div></div></main>`,
    checkout: () => `<main class="container"><h1 class="page-title">Checkout</h1><form class="form" id="checkout-form"><label for="name">Full name</label><input id="name" name="name" required value="Alex Morgan"><label for="email">Email</label><input id="email" name="email" type="email" required value="alex@example.com"><label for="addr">Shipping address</label><input id="addr" name="address" required value="12 Park Street"><button class="btn btn-primary" id="place-order" type="submit">Place order</button></form></main>`,
    confirmation: () => `<main class="container"><div class="done"><div class="tick">✅</div><h1>Order confirmed</h1><p>Thanks! Your order <strong id="order-no"></strong> is on its way.</p><a href="/">Back to shop</a></div></main>`,
    css: CSS_V1
  },
  v2: {
    shell: (title, body, css) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — ShopLite</title><style>${css}</style></head><body>
<header class="topbar"><a class="brand" href="/">ShopLite</a><nav class="topbar__nav"><a href="/">Store</a><a class="topbar__cart" href="/cart">Bag <span class="pill" id="bag-count">0</span></a></nav></header>
${body}
<footer class="foot">© 2026 ShopLite · Made for makers</footer>
<script>window.SHOP_VERSION='v2'</script><script src="/assets/app.js"></script></body></html>`,
    home: () => `<div class="page"><section class="stage"><h1 class="stage__title">Autumn drop, now live</h1><p class="stage__sub">Up to 30% off tech you'll actually use.</p><a class="ui-btn ui-btn--hero" href="#shelf">Shop the sale</a></section>
<h2 class="sec" id="shelf">Featured products</h2><div class="tiles">${productCards('v2')}</div></div>`,
    cart: () => `<div class="page"><h1 class="page__heading">Your bag</h1><div class="grid"><div class="grid__main" id="cart-items"></div>
<aside class="order-summary"><div class="order-summary__card"><h2 class="order-summary__title">Summary</h2><div class="order-summary__line"><span>Subtotal</span><strong id="subtotal">$0.00</strong></div><div class="order-summary__line"><span>Shipping</span><span>Free</span></div>
<button class="ui-btn ui-btn--cta" id="pay-cta" type="button" aria-label="Proceed to checkout" data-go="/checkout" disabled>Proceed to chekout →</button>
<a class="order-summary__back" href="/">Continue shopping</a></div></aside></div></div>`,
    checkout: () => `<div class="page"><h1 class="page__heading">Checkout</h1><form class="panel" id="checkout-form"><label for="name">Full name</label><input id="name" name="name" required value="Alex Morgan"><label for="email">Email</label><input id="email" name="email" type="email" required value="alex@example.com"><label for="addr">Shipping address</label><input id="addr" name="address" required value="12 Park Street"><button class="ui-btn ui-btn--cta" id="confirm-pay" type="submit">Place order</button></form></div>`,
    confirmation: () => `<div class="page"><div class="success"><div class="success__tick">✅</div><h1>Order confirmed</h1><p>Thanks! Your order <strong id="order-no"></strong> is on its way.</p><a href="/">Back to the store</a></div></div>`,
    css: CSS_V2
  }
};
const TITLES = { home: 'Home', cart: 'Cart', checkout: 'Checkout', confirmation: 'Confirmation' };

function readJson(req) {
  return new Promise((resolve) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (url.pathname === '/__admin/version') {
    if (req.method === 'POST') { const b = await readJson(req); if (b.version === 'v1' || b.version === 'v2') version = b.version; }
    res.writeHead(200, { 'content-type': 'application/json', ...cors });
    return res.end(JSON.stringify({ version }));
  }
  if (url.pathname === '/assets/app.js') { res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-store' }); return res.end(APP_JS); }
  if (url.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
  const map = { '/': 'home', '/cart': 'cart', '/checkout': 'checkout', '/confirmation': 'confirmation' };
  const page = map[url.pathname.replace(/\/$/, '') || '/'];
  if (!page) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('<h1>404</h1><a href="/">Home</a>'); }
  const v = PAGES[version];
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
    'content-security-policy': "frame-ancestors 'none'", 'x-frame-options': 'DENY'
  });
  res.end(v.shell(TITLES[page], v[page](), v.css));
});

server.listen(PORT, () => console.log(`[shoplite] demo store on http://localhost:${PORT} (${version})`));
