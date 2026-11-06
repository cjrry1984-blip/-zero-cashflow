/* IZZOPAC checkout activation. No direct downloads or payment credentials in this repo.
 * Set a Payhip /b/ URL AND status=verified only after delivery test.
 */
(()=>{'use strict';
function payhipUrl(value){
 try{const u=new URL(value);
   return u.protocol==='https:'&&u.hostname==='payhip.com'&&/^\/b\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)?u.href:null;
 }catch{return null;}
}
async function activate(){
 try{
  const response=await fetch('data/checkout-links.json',{cache:'no-store'});
  if(!response.ok)return;
  const config=await response.json();
  for(const button of document.querySelectorAll('[data-product-checkout]')){
    const key=button.dataset.productCheckout,entry=config[key],url=entry?.status==='verified'?payhipUrl(entry.url):null;
    if(!url)continue;
    button.href=url;button.hidden=false;button.rel='noopener noreferrer';button.target='_blank';
    const pending=document.querySelector('[data-pending-checkout="'+key+'"]');
    if(pending)pending.hidden=true;
  }
 }catch(e){/* If config isn't reachable, checkout remains disabled. */}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate,{once:true});
else activate();
})();
