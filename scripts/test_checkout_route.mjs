import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync(new URL('../assets/activate-checkout.js',import.meta.url),'utf8');
async function simulate({campaign='photographer_booking_flow',fetchFails=false,status='verified'}={}){
  const button={
    dataset:{productCheckout:'website_playbook'},
    attrs:{href:'https://payhip.com/b/xCQTj'},
    hidden:false,
    getAttribute(name){return this.attrs[name];},
    set href(value){this.attrs.href=value;},
    get href(){return this.attrs.href;}
  };
  const pending={hidden:true,textContent:''};
  const document={
    readyState:'complete',
    querySelectorAll(selector){return selector==='[data-product-checkout]'?[button]:[];},
    querySelector(selector){return selector==='[data-pending-checkout="website_playbook"]'?pending:null;}
  };
  const context={
    document,URL,URLSearchParams,
    location:{search:'?utm_campaign='+campaign},
    fetch:async()=>{if(fetchFails)throw Error('offline');return {ok:true,json:async()=>({
      website_playbook:{url:'https://payhip.com/b/xCQTj',status}
    })};}
  };
  vm.runInNewContext(source,context,{filename:'activate-checkout.js'});
  await new Promise(resolve=>setImmediate(resolve));
  return {button,pending};
}
const photographer=await simulate();
assert.equal(photographer.button.hidden,false);
assert.equal(new URL(photographer.button.href).searchParams.get('utm_campaign'),'photographer_booking_flow');
assert.equal(new URL(photographer.button.href).searchParams.get('utm_source'),'izzopac_auditor');
const ordinary=await simulate({campaign:'other'});
assert.equal(new URL(ordinary.button.href).searchParams.get('utm_campaign'),'free_website_audit');
const offline=await simulate({fetchFails:true});
assert.equal(offline.button.hidden,false);
assert.equal(new URL(offline.button.href).searchParams.get('utm_campaign'),'photographer_booking_flow');
const unavailable=await simulate({status:'pending'});
assert.equal(unavailable.button.hidden,true);
assert.equal(unavailable.pending.hidden,false);
console.log('Checkout route functional tests passed: photographer, ordinary, offline fallback, pending.');
