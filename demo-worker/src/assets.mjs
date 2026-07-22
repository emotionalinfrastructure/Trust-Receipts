export const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="description" content="Interactive AI Trust Receipt governance demonstration with pre-execution consent, evidence, review, and remedy gates.">
  <title>AI Trust Receipt — Governance Demonstration</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header class="hero">
    <div class="wrap">
      <p class="eyebrow">EMOTIONAL INFRASTRUCTURE™ · GOVERNANCE INSTRUMENT</p>
      <h1>AI Trust Receipt</h1>
      <p class="lead">An interactive governance demonstration that evaluates authority, affected-person confirmation, human review, evidence, receipt capability, and remedy capability before a persistent AI-mediated action executes.</p>
      <div class="boundary"><strong>Demonstration boundary:</strong> Each evaluation creates a unique, downloadable, hash-verifiable demonstration receipt. Receipts are not persisted and are not issuer-signed.</div>
    </div>
  </header>

  <main id="main" class="wrap main-grid">
    <section class="panel" aria-labelledby="scenario-heading">
      <h2 id="scenario-heading">Scenarios</h2>
      <div id="preset-bar" class="preset-bar" aria-label="Gate scenarios"></div>

      <form id="gate-form">
        <fieldset>
          <legend>Gate inputs</legend>
          <div class="form-grid">
            <label>Consequence class
              <select id="consequence_class" name="consequence_class">
                <option>C0</option><option>C1</option><option selected>C2</option><option>C3</option>
              </select>
            </label>
            <label>User confirmation
              <select id="user_confirmation" name="user_confirmation">
                <option value="confirmed">confirmed</option>
                <option value="denied">denied</option>
                <option value="pending">pending</option>
                <option value="not_required">not required</option>
              </select>
            </label>
            <label>Human review
              <select id="human_review" name="human_review">
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="pending">pending</option>
                <option value="none">none</option>
              </select>
            </label>
            <label>Grant status
              <select id="grant_status" name="grant_status">
                <option value="active">active</option>
                <option value="revoked">revoked</option>
                <option value="expired">expired</option>
                <option value="suspended">suspended</option>
              </select>
            </label>
            <label>Evidence status
              <select id="evidence_status" name="evidence_status">
                <option value="available">available</option>
                <option value="unavailable">unavailable</option>
              </select>
            </label>
            <label>Evidence freshness
              <select id="evidence_freshness" name="evidence_freshness">
                <option value="current">current</option>
                <option value="stale">stale</option>
              </select>
            </label>
          </div>
          <div class="check-grid">
            <label><input id="persistent_change" type="checkbox" checked> Persistent change</label>
            <label><input id="affected_party" type="checkbox" checked> Affects the person</label>
            <label><input id="action_in_scope" type="checkbox" checked> Action in scope</label>
            <label><input id="receipt_service_available" type="checkbox" checked> Receipt capability available</label>
            <label><input id="remedy_service_available" type="checkbox" checked> Remedy capability available</label>
          </div>
          <button class="primary" type="submit">Evaluate before execution</button>
        </fieldset>
      </form>
    </section>

    <section class="panel" aria-labelledby="decision-heading">
      <div class="decision-head">
        <div>
          <p class="eyebrow dark">PRE-EXECUTION GATE</p>
          <h2 id="decision-heading">Decision</h2>
        </div>
        <span id="decision-badge" class="badge neutral">NOT EVALUATED</span>
      </div>
      <div id="decision-summary" class="summary" role="status" aria-live="polite" aria-atomic="true">Choose a scenario or evaluate the current inputs.</div>
      <ol id="failure-list" class="failures"></ol>
      <p class="note">A denied action preserves the before-state. The complete ordered failure array is included inside the hashed receipt.</p>
    </section>

    <section class="panel receipt-panel" aria-labelledby="receipt-heading">
      <div class="receipt-head">
        <div>
          <p class="eyebrow dark">ACCOUNTABILITY ARTIFACT</p>
          <h2 id="receipt-heading">Receipt</h2>
        </div>
        <div class="actions">
          <button id="verify" type="button">Verify digest</button>
          <button id="tamper" type="button">Tamper test</button>
          <button id="download" type="button">Download JSON</button>
          <button id="copy" type="button">Copy JSON</button>
        </div>
      </div>

      <div class="tabs" role="tablist" aria-label="Receipt views">
        <button id="tab-summary" role="tab" aria-selected="true" aria-controls="panel-summary" tabindex="0">Receipt summary</button>
        <button id="tab-json" role="tab" aria-selected="false" aria-controls="panel-json" tabindex="-1">JSON</button>
      </div>
      <div id="panel-summary" role="tabpanel" aria-labelledby="tab-summary">
        <dl id="receipt-summary" class="receipt-summary"></dl>
      </div>
      <div id="panel-json" role="tabpanel" aria-labelledby="tab-json" hidden>
        <pre id="receipt-json" tabindex="0" aria-label="Machine-readable demonstration receipt">No receipt generated.</pre>
      </div>
      <div id="action-status" class="action-status" role="status" aria-live="polite" aria-atomic="true"></div>
    </section>
  </main>

  <footer class="wrap footer">
    <p>Digest verification establishes content integrity relative to the recorded digest. It does not authenticate the issuer.</p>
    <p><a href="/schema/trust-receipt-demo-v0.2.json">Published demo schema</a> · <a href="https://github.com/emotionalinfrastructure/Trust-Receipts">Specification and source</a></p>
  </footer>
  <script src="/app.js" defer></script>
</body>
</html>`;

export const CSS = `:root{--navy:#101c2c;--teal:#176b73;--copper:#c46a3a;--ivory:#f5f1e8;--slate:#5e6873;--graphite:#20252b;--line:#cbd2d6;--white:#fff;--danger:#8b1e2d;--success:#185c37}*{box-sizing:border-box}html{background:var(--ivory);color:var(--graphite);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}body{margin:0}.skip-link{position:absolute;left:-9999px;top:0}.skip-link:focus{left:1rem;top:1rem;z-index:10;background:#fff;padding:.75rem 1rem}.wrap{width:min(1120px,calc(100% - 2rem));margin-inline:auto}.hero{background:var(--navy);color:#fff;padding:4.5rem 0 3.5rem;border-bottom:6px solid var(--copper)}.eyebrow{font-size:.76rem;letter-spacing:.16em;font-weight:800;margin:0 0 .75rem;color:#b8e3e4}.eyebrow.dark{color:var(--teal)}h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.6rem,7vw,5.4rem);line-height:1;margin:.2rem 0 1rem;font-weight:500}h2{font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.55rem,3vw,2.25rem);margin:.1rem 0 1rem}.lead{max-width:850px;font-size:clamp(1rem,2vw,1.25rem);color:#e1e8ed}.boundary{max-width:900px;margin-top:1.5rem;padding:1rem 1.1rem;border-left:4px solid var(--copper);background:rgba(255,255,255,.08)}.main-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;padding-block:2rem}.panel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:clamp(1.1rem,3vw,1.75rem);box-shadow:0 12px 40px rgba(16,28,44,.07)}.receipt-panel{grid-column:1/-1}.preset-bar{display:flex;flex-wrap:wrap;gap:.55rem;margin-bottom:1.2rem}button,select{font:inherit}button{min-height:44px;border:1px solid var(--teal);background:#fff;color:var(--navy);border-radius:10px;padding:.65rem .9rem;font-weight:750;cursor:pointer}button:hover{background:#edf6f6}button:focus-visible,select:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid var(--copper);outline-offset:2px}.preset-bar button[aria-pressed=true],button.primary{background:var(--teal);color:#fff}.preset-bar button[aria-pressed=true]{box-shadow:inset 0 0 0 2px #fff}fieldset{border:0;padding:0;margin:0}legend{font-weight:800;margin-bottom:.8rem}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem}.form-grid label{display:grid;gap:.3rem;font-weight:700}.form-grid select{width:100%;min-height:44px;border:1px solid #87929a;border-radius:9px;padding:.55rem .65rem;background:#fff;color:var(--graphite);font-size:16px}.check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin:1rem 0}.check-grid label{display:flex;align-items:center;gap:.55rem}.check-grid input{width:20px;height:20px}.decision-head,.receipt-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.badge{display:inline-flex;align-items:center;min-height:36px;padding:.45rem .7rem;border-radius:999px;font-weight:900;font-size:.8rem;letter-spacing:.06em}.badge.neutral{background:#e8ecef}.badge.allow{background:#dff4e7;color:var(--success)}.badge.deny{background:#f9e0e4;color:var(--danger)}.summary{font-size:1.05rem;font-weight:700;padding:1rem;border-radius:12px;background:#f2f5f6}.failures{padding-left:1.25rem}.failures li{margin:.7rem 0;padding-left:.3rem}.failure-code{font-weight:900;color:var(--danger)}.note{color:#4b5660;font-size:.94rem}.actions{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:flex-end}.tabs{display:flex;gap:.4rem;border-bottom:1px solid var(--line);margin:1.25rem 0}.tabs [role=tab]{border:0;border-radius:8px 8px 0 0}.tabs [role=tab][aria-selected=true]{background:var(--navy);color:#fff}.receipt-summary{display:grid;grid-template-columns:minmax(140px,.35fr) 1fr;gap:.55rem 1rem}.receipt-summary dt{font-weight:850}.receipt-summary dd{margin:0;overflow-wrap:anywhere}pre{margin:0;background:#0d1723;color:#e6edf3;border-radius:12px;padding:1rem;max-height:520px;overflow:auto;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.action-status{min-height:1.5rem;margin-top:1rem;font-weight:750}.footer{padding:0 0 2.5rem;color:#4a555e}.footer a{color:var(--teal);font-weight:750}@media(max-width:760px){.hero{padding:3rem 0 2.4rem}.main-grid{grid-template-columns:1fr}.receipt-panel{grid-column:auto}.form-grid,.check-grid{grid-template-columns:1fr}.decision-head,.receipt-head{display:block}.actions{justify-content:flex-start;margin-top:.75rem}.actions button{flex:1 1 145px}.receipt-summary{grid-template-columns:1fr}.receipt-summary dd{margin-bottom:.45rem}.wrap{width:min(100% - 1rem,1120px)}button{min-height:48px}.preset-bar button{flex:1 1 145px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}`;

export const APP_JS = `const presets=[
{id:"clean",label:"Clean execution",summary:"All required controls are satisfied.",values:{}},
{id:"expired",label:"Expired grant",summary:"The authority grant has expired.",values:{grant_expired:true}},
{id:"scope",label:"Out-of-scope action",summary:"The requested action is outside the grant.",values:{action_in_scope:false}},
{id:"review",label:"Review bypass",summary:"Required independent review is pending.",values:{human_review:"pending"}},
{id:"stale",label:"Stale evidence",summary:"Required evidence is not current.",values:{evidence_freshness:"stale"}},
{id:"remedy",label:"Unavailable remedy",summary:"The C2 action lacks an operational remedy pathway.",values:{remedy_service_available:false}}
];
const base={scenario_id:"clean",consequence_class:"C2",persistent_change:true,affected_party:true,user_confirmation:"confirmed",human_review:"approved",grant_status:"active",request_before_grant:false,grant_expired:false,action_in_scope:true,target_in_scope:true,max_consequence_class:"C2",delegation_depth:1,max_delegation_depth:1,evidence_status:"available",evidence_freshness:"current",receipt_service_available:true,remedy_service_available:true,reversible:true,before_state:{weekly_summary:false},proposed_after_state:{weekly_summary:true}};
let currentReceipt=null;let activePreset="clean";
const byId=(id)=>document.getElementById(id);const announce=(text)=>{byId("action-status").textContent=text};
function setValue(id,value){const el=byId(id);if(!el)return;if(el.type==="checkbox")el.checked=Boolean(value);else el.value=String(value)}
function renderPresets(){const bar=byId("preset-bar");bar.textContent="";for(const preset of presets){const button=document.createElement("button");button.type="button";button.textContent=preset.label;button.dataset.id=preset.id;button.setAttribute("aria-pressed",String(preset.id===activePreset));button.title=preset.summary;button.addEventListener("click",()=>applyPreset(preset));bar.append(button)}}
function applyPreset(preset){activePreset=preset.id;const values={...base,...preset.values,scenario_id:preset.id};for(const [key,value] of Object.entries(values))setValue(key,value);renderPresets();evaluate(values)}
function collect(){return{...base,scenario_id:activePreset,consequence_class:byId("consequence_class").value,user_confirmation:byId("user_confirmation").value,human_review:byId("human_review").value,grant_status:byId("grant_status").value,evidence_status:byId("evidence_status").value,evidence_freshness:byId("evidence_freshness").value,persistent_change:byId("persistent_change").checked,affected_party:byId("affected_party").checked,action_in_scope:byId("action_in_scope").checked,receipt_service_available:byId("receipt_service_available").checked,remedy_service_available:byId("remedy_service_available").checked}}
async function evaluate(values=collect()){announce("Evaluating governance requirements…");try{const response=await fetch("/api/evaluate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(values)});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Evaluation failed");currentReceipt=data.receipt;renderReceipt();announce("Evaluation complete. A unique demonstration receipt was generated.")}catch(error){announce("Evaluation failed: "+error.message)}}
function renderReceipt(){if(!currentReceipt)return;const decision=currentReceipt.gate_decision.result;const badge=byId("decision-badge");badge.textContent=decision.toUpperCase();badge.className="badge "+decision;byId("decision-summary").textContent=decision==="allow"?"ALLOW — all required controls passed and the simulated action executed.":"DENY — the simulated action was blocked and the before-state was preserved.";const list=byId("failure-list");list.textContent="";for(const failure of currentReceipt.gate_decision.failures){const li=document.createElement("li");const code=document.createElement("span");code.className="failure-code";code.textContent=failure.sequence+". "+failure.code+" — ";li.append(code,document.createTextNode(failure.message+" ("+failure.field+")"));list.append(li)}byId("receipt-json").textContent=JSON.stringify(currentReceipt,null,2);const summary=byId("receipt-summary");summary.textContent="";const items=[["Attempt ID",currentReceipt.attempt_id],["Decision",decision.toUpperCase()],["Action",currentReceipt.action.status.toUpperCase()],["Failures",String(currentReceipt.gate_decision.failures.length)],["Persistence",currentReceipt.persistence.status],["Issuer authentication",currentReceipt.issuer.authentication_status],["Digest",currentReceipt.integrity.digest]];for(const [term,value] of items){const dt=document.createElement("dt");dt.textContent=term;const dd=document.createElement("dd");dd.textContent=value;summary.append(dt,dd)}}
async function verify(){if(!currentReceipt)return announce("Generate a receipt first.");announce("Verifying digest…");try{const response=await fetch("/api/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({receipt:currentReceipt})});const data=await response.json();announce(data.valid?"Digest matches. Content is unchanged relative to the recorded digest.":"Digest mismatch. The displayed receipt was changed after sealing.")}catch(error){announce("Verification failed: "+error.message)}}
function tamper(){if(!currentReceipt)return announce("Generate a receipt first.");currentReceipt=structuredClone(currentReceipt);currentReceipt.action.status=currentReceipt.action.status==="executed"?"denied":"executed";renderReceipt();announce("Tamper test applied to action.status. Verify the digest to detect the mismatch.")}
async function copyJson(){if(!currentReceipt)return announce("Generate a receipt first.");const text=JSON.stringify(currentReceipt,null,2);try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text)}else{const area=document.createElement("textarea");area.value=text;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";document.body.append(area);area.select();if(!document.execCommand("copy"))throw new Error("Browser denied clipboard access");area.remove()}announce("Receipt JSON copied.")}catch(error){announce("Copy failed. Open the JSON tab and select the receipt manually.")}}
function downloadJson(){if(!currentReceipt)return announce("Generate a receipt first.");try{const blob=new Blob([JSON.stringify(currentReceipt,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=currentReceipt.attempt_id+".trust-receipt-demo.json";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce("Receipt download started.")}catch(error){announce("Download failed. Open the JSON tab and save the receipt manually.")}}
function activateTab(next){for(const id of ["summary","json"]){const tab=byId("tab-"+id);const panel=byId("panel-"+id);const selected=id===next;tab.setAttribute("aria-selected",String(selected));tab.tabIndex=selected?0:-1;panel.hidden=!selected}byId("tab-"+next).focus()}
for(const id of ["summary","json"]){byId("tab-"+id).addEventListener("click",()=>activateTab(id));byId("tab-"+id).addEventListener("keydown",(event)=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const next=event.key==="ArrowLeft"||event.key==="Home"?"summary":"json";activateTab(next)})}
byId("gate-form").addEventListener("submit",(event)=>{event.preventDefault();activePreset="custom";renderPresets();evaluate()});byId("verify").addEventListener("click",verify);byId("tamper").addEventListener("click",tamper);byId("copy").addEventListener("click",copyJson);byId("download").addEventListener("click",downloadJson);renderPresets();applyPreset(presets[0]);`;
