import { Cart, CartUI } from './cart.js';
import { openVariantPicker } from './variant-picker.js';

CartUI.init();
var allProducts = [];
var FEATURED_EXCLUDE_IDS = ['6a432a94a19392bba5093566'];

function pickFeatured(products) {
  var pool=products.filter(function(p){return FEATURED_EXCLUDE_IDS.indexOf(p.id)===-1;});
  var hat=pool.find(function(p){return p.category==='hats' && cleanTitle(p.title).toLowerCase().includes('jesus saves');}) || pool.find(function(p){return p.category==='hats';});
  var featured=pool.filter(function(p){return p!==hat;}).slice(0,hat?3:4);
  if(hat) featured.splice(1,0,hat);
  return featured;
}

function productCard(p, idx, className) {
  var title=cleanTitle(p.title), subtitle=buildSubtitle(p);
  var lowest=p.variants.length?Math.min.apply(null,p.variants.map(function(v){return v.price;})):0;
  var multiple=p.variants.length>1;
  var url=p.productUrl||('/products/'+slugify(title)+'--'+p.id);
  var delay=idx>0?' style="--reveal-delay:'+(idx*.08).toFixed(2)+'s"':'';
  return '<article class="product-card reveal '+(className||'')+'" data-product-id="'+p.id+'" data-category="'+p.category+'"'+delay+' itemscope itemtype="https://schema.org/Product">'+
    '<a class="product-card-main-link" href="'+esc(url)+'" aria-label="View '+esc(title)+'">'+
      '<div class="product-img-wrap">'+(p.image?'<img src="'+esc(p.image)+'" alt="'+esc(title)+' — Christian apparel by Christos.Fashion" loading="lazy" decoding="async" width="600" height="600" itemprop="image">':'<div class="product-img-placeholder"><span class="design-text">'+esc(title)+'</span></div>')+'<div class="product-quick-add" aria-hidden="true">View Product</div></div>'+
      '<div class="product-info"><h3 class="product-name" itemprop="name">'+esc(title)+'</h3>'+(subtitle?'<p class="product-variant">'+esc(subtitle)+'</p>':'')+'<div class="product-price-row"><strong class="product-price">'+(multiple?'From ':'')+fmt(lowest)+'</strong><span class="btn btn-ghost btn-sm">Details →</span></div></div>'+
    '</a><button class="btn btn-primary btn-sm home-add-btn" data-product-id="'+p.id+'">'+(multiple?'Quick Add':'Add to Cart')+'</button></article>';
}

function wireGrid(grid, list) {
  grid.querySelectorAll('.reveal').forEach(function(el){var obs=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.style.transitionDelay=entry.target.style.getPropertyValue('--reveal-delay')||'0s';entry.target.classList.add('visible');obs.unobserve(entry.target);}});},{threshold:.08});obs.observe(el);});
  grid.querySelectorAll('.home-add-btn').forEach(function(btn){btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();openFor(btn.dataset.productId);});});
  grid.querySelectorAll('.product-card-main-link').forEach(function(link){link.addEventListener('click',function(){var card=link.closest('.product-card');var p=allProducts.find(function(x){return x.id===card.dataset.productId;});if(p)window.cfTrack?.('select_item',{item_list_name:list,items:[{item_id:p.id,item_name:cleanTitle(p.title),item_category:p.category}]});});});
}

document.addEventListener('DOMContentLoaded', function(){
  var featuredGrid=document.getElementById('featured-grid');
  fetch('/api/get-products').then(function(res){return res.ok?res.json():Promise.reject(res.status);}).then(function(products){
    if(!Array.isArray(products))throw new Error('Bad products payload');
    allProducts=products;
    if(featuredGrid){var featured=pickFeatured(products);featuredGrid.innerHTML=featured.map(function(p,i){return productCard(p,i,'');}).join('');wireGrid(featuredGrid,'Homepage Featured');}
    renderTherapy(products);
  }).catch(function(err){
    console.warn('Home products failed to load:',err);
    therapyState('error','Still Here','The live collection could not load just now. <a href="/collections/therapy">Open the Therapy Collection &rarr;</a>');
  });
});

/* The homepage Therapy section used to be five hard-coded artwork tiles linking
   to /products/<name>-is-my-therapy. Only two of those designs have a live
   Printify product, so three tiles led to a 404. It now renders the same live
   product cards the shop uses, driven entirely by the catalog — the section can
   never advertise something that isn't purchasable. */
function renderTherapy(products){
  var grid=document.getElementById('therapy-product-grid');
  if(!grid) return;
  var therapy=products.filter(function(p){return Array.isArray(p.collections)&&p.collections.indexOf('therapy')!==-1;}).slice(0,6);
  grid.setAttribute('aria-busy','false');
  if(!therapy.length){
    therapyState('empty','Back Soon','The Therapy Collection is being restocked. <a href="/shop.html">Browse everything else &rarr;</a>');
    return;
  }
  grid.innerHTML=therapy.map(function(p,i){return productCard(p,i,'therapy-product-card');}).join('');
  grid.dataset.count=String(therapy.length);
  wireGrid(grid,'Therapy Collection');
  document.getElementById('therapy-collection')?.classList.add('has-live-products');
}

function therapyState(kind,eyebrow,body){
  var grid=document.getElementById('therapy-product-grid');
  if(!grid) return;
  grid.setAttribute('aria-busy','false');
  grid.removeAttribute('data-count');
  grid.innerHTML='<div class="therapy-state" data-state="'+kind+'"><p class="eyebrow">'+eyebrow+'</p><p>'+body+'</p></div>';
}

function openFor(productId){var p=allProducts.find(function(x){return x.id===productId;});if(!p)return;p.variants.length===1?addVariant(p,p.variants[0]):openVariantPicker(p,addVariant);}
function addVariant(product,variant){Cart.add({productId:product.id,variantId:variant.id,title:cleanTitle(product.title),variantTitle:variant.title,price:variant.price,image:product.image,quantity:1});}
function cleanTitle(raw){return String(raw||'').split(' | ')[0].trim();}
function slugify(v){return String(v||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function buildSubtitle(p){var colorOpt=p.options.find(function(o){return(o.type||'').toLowerCase()==='color'||o.name.toLowerCase().includes('color');});var sizeOpt=p.options.find(function(o){return(o.type||'').toLowerCase()==='size'||o.name.toLowerCase().includes('size');});var parts=[];if(colorOpt&&colorOpt.values.length){var c=colorOpt.values.map(function(v){return v.title;});parts.push(c.length<=3?c.join(' · '):c.slice(0,3).join(' · ')+' +'+(c.length-3)+' more');}if(sizeOpt&&sizeOpt.values.length){var s=sizeOpt.values.map(function(v){return v.title;});parts.push(s.length<=2?s.join(' · '):s[0]+'–'+s[s.length-1]);}return parts.join(' · ');}
function fmt(cents){return '$'+(cents/100).toFixed(2);}function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c];});}
