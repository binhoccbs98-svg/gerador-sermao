/**
 * ═══════════════════════════════════════════════════
 *  GERADOR DE SERMÃO v2.5
 * ═══════════════════════════════════════════════════
 */

// ─── ESTADO ───────────────────────────────────────
const S = {
  dados: null, biblia: {}, carregado: false,
  abas: [], abaAtiva: null,
  notas: [], notaAtiva: null, notasAbertas: true,
  modo: 'referencia',
  favoritos: {}, marcadores: {}, destaques: {}, anotacoes: {}, temas: {},
};

const STORAGE_KEY = 'sermao_v25';
const NOTAS_KEY   = 'sermao_notas_v25';
const NOTAS_W_KEY = 'sermao_notas_w';

const LIVROS_AT = new Set(['Gênesis','Êxodo','Levítico','Números','Deuteronômio','Josué','Juízes','Rute','1 Samuel','2 Samuel','1 Reis','2 Reis','1 Crônicas','2 Crônicas','Esdras','Neemias','Ester','Jó','Salmos','Provérbios','Eclesiastes','Cantares','Isaías','Jeremias','Lamentações','Ezequiel','Daniel','Oséias','Joel','Amós','Obadias','Jonas','Miquéias','Naum','Habacuque','Sofonias','Ageu','Zacarias','Malaquias']);
const LIVROS_NT = new Set(['Mateus','Marcos','Lucas','João','Atos','Romanos','1 Coríntios','2 Coríntios','Gálatas','Efésios','Filipenses','Colossenses','1 Tessalonicenses','2 Tessalonicenses','1 Timóteo','2 Timóteo','Tito','Filemom','Hebreus','Tiago','1 Pedro','2 Pedro','1 João','2 João','3 João','Judas','Apocalipse']);

const ABREVS = {'Gn':'Gênesis','Gên':'Gênesis','Ex':'Êxodo','Êx':'Êxodo','Lv':'Levítico','Nm':'Números','Dt':'Deuteronômio','Js':'Josué','Jz':'Juízes','Rt':'Rute','1Sm':'1 Samuel','2Sm':'2 Samuel','1Rs':'1 Reis','2Rs':'2 Reis','1Cr':'1 Crônicas','2Cr':'2 Crônicas','Ed':'Esdras','Ne':'Neemias','Et':'Ester','Jó':'Jó','Sl':'Salmos','Pv':'Provérbios','Ec':'Eclesiastes','Ct':'Cantares','Is':'Isaías','Jr':'Jeremias','Lm':'Lamentações','Ez':'Ezequiel','Dn':'Daniel','Os':'Oséias','Jl':'Joel','Am':'Amós','Ab':'Obadias','Jn':'Jonas','Mq':'Miquéias','Na':'Naum','Hc':'Habacuque','Sf':'Sofonias','Ag':'Ageu','Zc':'Zacarias','Ml':'Malaquias','Mt':'Mateus','Mc':'Marcos','Lc':'Lucas','Jo':'João','At':'Atos','Rm':'Romanos','1Co':'1 Coríntios','2Co':'2 Coríntios','Gl':'Gálatas','Ef':'Efésios','Fp':'Filipenses','Cl':'Colossenses','1Ts':'1 Tessalonicenses','2Ts':'2 Tessalonicenses','1Tm':'1 Timóteo','2Tm':'2 Timóteo','Tt':'Tito','Fm':'Filemom','Hb':'Hebreus','Tg':'Tiago','1Pe':'1 Pedro','2Pe':'2 Pedro','1Jo':'1 João','2Jo':'2 João','3Jo':'3 João','Jd':'Judas','Ap':'Apocalipse'};

// ─── PERSISTÊNCIA ─────────────────────────────────
function salvarDados() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({favoritos:S.favoritos,marcadores:S.marcadores,destaques:S.destaques,anotacoes:S.anotacoes,temas:S.temas})); } catch{}
}
function carregarDados() {
  try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); S.favoritos=d.favoritos||{}; S.marcadores=d.marcadores||{}; S.destaques=d.destaques||{}; S.anotacoes=d.anotacoes||{}; S.temas=d.temas||{}; } catch{}
}

// ─── BÍBLIA ───────────────────────────────────────
async function carregarBiblia() {
  try {
    const r = await fetch('./data/referencias.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    S.dados = await r.json();
    S.biblia = S.dados.biblia || {};
    S.carregado = true;
    return true;
  } catch(e) { console.error('❌',e); return false; }
}
function refs()       { return S.dados?.referencias || {}; }
function textoDe(ref) { return S.biblia[ref] || null; }

// ─── NORMALIZAÇÃO ─────────────────────────────────
function expandir(t) { for(const[ab,n] of Object.entries(ABREVS)) if(ab.toLowerCase()===t.toLowerCase()) return n; return t.charAt(0).toUpperCase()+t.slice(1); }
function normalizar(e) {
  if(!e?.trim()) return '';
  let t=e.trim(); const m=t.match(/^([A-Za-zÀ-ú\d]+)\s+(.+)$/);
  if(!m){const m2=t.match(/^([A-Za-zÀ-ú]+)(\d+.+)$/);if(m2)t=m2[1]+' '+m2[2];return expandir(t);}
  return `${expandir(m[1])} ${m[2]}`;
}
function analisar(e) {
  const n=normalizar(e); if(!n) return null;
  if(/\d+:\d+/.test(n)){const m=n.match(/^(.+?)\s+(\d+):(\d+)$/);if(m)return{tipo:'versiculo',livro:m[1],cap:+m[2],ver:+m[3],ref:n};}
  const m=n.match(/^(.+?)\s+(\d+)$/);
  if(m) return{tipo:'capitulo',livro:m[1],cap:+m[2]};
  return{tipo:'capitulo',livro:n,cap:1};
}
function capVersos(livro,cap) {
  const p=`${livro} ${cap}:`, lista=[];
  for(const[k,v] of Object.entries(S.biblia)) if(k.startsWith(p)) lista.push({ref:k,n:+k.split(':')[1],txt:v});
  return lista.sort((a,b)=>a.n-b.n);
}
function similares(livro) {
  const r=refs(),l=livro.toLowerCase();
  return Object.keys(r).filter(k=>k.toLowerCase().includes(l)).slice(0,4);
}

// ─── BUSCA POR PALAVRAS ───────────────────────────
function buscarPalavras(termo,exata,filtro) {
  if(!termo.trim()||!S.carregado) return [];
  const tl=termo.trim().toLowerCase(), res=[];
  for(const[ref,texto] of Object.entries(S.biblia)){
    if(filtro){
      const liv=ref.replace(/\s+\d+:\d+$/,'');
      if(filtro==='AT'&&!LIVROS_AT.has(liv)) continue;
      if(filtro==='NT'&&!LIVROS_NT.has(liv)) continue;
      if(filtro!=='AT'&&filtro!=='NT'&&liv!==filtro) continue;
    }
    const ok=exata?texto.toLowerCase().includes(tl):tl.split(/\s+/).every(p=>texto.toLowerCase().includes(p));
    if(ok) res.push({ref,texto});
    if(res.length>=500) break;
  }
  return res;
}

// ─── UTILS ────────────────────────────────────────
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function destacar(texto,termo,exata){
  if(!termo) return esc(texto);
  try{const ps=exata?[termo]:termo.trim().split(/\s+/);let r=esc(texto);for(const p of ps){const re=new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');r=r.replace(re,m=>`<mark>${m}</mark>`);}return r;}catch{return esc(texto);}
}

// ─── SISTEMA DE ABAS ──────────────────────────────
let _id=0;
function abrirAba(params){
  const label=params.label||params.ref||`${params.livro} ${params.cap}`;
  const existe=S.abas.find(a=>a.label===label);
  if(existe){ativarAba(existe.id);return;}
  const id=++_id;
  const{icone,html}=gerarHTML(params);
  S.abas.push({id,label,icone,html});
  renderAbas();
  ativarAba(id);
}
function fecharAba(id){
  const idx=S.abas.findIndex(a=>a.id===id); if(idx<0) return;
  S.abas.splice(idx,1);
  document.getElementById(`painel-${id}`)?.remove();
  if(S.abaAtiva===id){S.abaAtiva=null;const p=S.abas[Math.min(idx,S.abas.length-1)];p?ativarAba(p.id):mostrarBoasVindas();}
  renderAbas();
}
function ativarAba(id){
  document.getElementById(`painel-${S.abaAtiva}`)?.classList.remove('ativo');
  S.abaAtiva=id;
  const cont=document.getElementById('abas-content');
  let painel=document.getElementById(`painel-${id}`);
  if(!painel){
    const aba=S.abas.find(a=>a.id===id); if(!aba) return;
    document.getElementById('boas-vindas')?.remove();
    painel=document.createElement('div');
    painel.id=`painel-${id}`;painel.className='painel-aba';
    painel.innerHTML=aba.html;
    cont.appendChild(painel);
    setTimeout(()=>aplicarEstilos(painel),0);
  }
  painel.classList.add('ativo');
  renderAbas();
}
function mostrarBoasVindas(){
  const c=document.getElementById('abas-content');
  if(!document.getElementById('boas-vindas')){
    const d=document.createElement('div');d.id='boas-vindas';d.className='boas-vindas';
    d.innerHTML=`<div class="bv-icone">✝</div><h2 class="bv-titulo">Gerador de Sermão</h2><p class="bv-texto">Busque por referência, capítulo ou palavras. Use a sidebar para favoritos, marcadores e temáticos.</p><div class="bv-dicas"><div class="dica-card"><span>📖</span><strong>Capítulos</strong><p>"Sl 23" mostra completo</p></div><div class="dica-card"><span>🔗</span><strong>Referências</strong><p>"Jo 3:16" abre refs cruzadas</p></div><div class="dica-card"><span>🔍</span><strong>Palavras</strong><p>Busque frases na Bíblia</p></div><div class="dica-card"><span>⭐</span><strong>Favoritos</strong><p>Salve versículos</p></div><div class="dica-card"><span>🔖</span><strong>Marcadores</strong><p>Marque com cor</p></div><div class="dica-card"><span>📚</span><strong>Temáticos</strong><p>Listas por tema</p></div></div>`;
    c.appendChild(d);
  }
}
function renderAbas(){
  const lista=document.getElementById('abas-lista'),vazia=document.getElementById('abas-vazia'); if(!lista) return;
  if(!S.abas.length){lista.innerHTML='';vazia?.classList.remove('hidden');return;}
  vazia?.classList.add('hidden');
  lista.innerHTML=S.abas.map(a=>`<div class="aba ${a.id===S.abaAtiva?'ativa':''}" onclick="ativarAba(${a.id})"><span class="aba-ic">${a.icone}</span><span class="aba-txt" title="${esc(a.label)}">${esc(a.label)}</span><button class="aba-x" onclick="event.stopPropagation();fecharAba(${a.id})">✕</button></div>`).join('');
}

// Aplica destaques/marcadores/anotações em versos do container
function aplicarEstilos(container){
  container?.querySelectorAll('.verso[data-ref]').forEach(el=>{
    const ref=el.dataset.ref;
    if(S.destaques[ref]) el.style.background=S.destaques[ref];
    if(S.marcadores[ref]){el.style.borderLeft=`3px solid ${S.marcadores[ref]}`;el.style.paddingLeft='6px';}
    if(S.anotacoes[ref]&&!el.nextElementSibling?.classList.contains('verso-anotacao')){
      const div=document.createElement('div');div.className='verso-anotacao';div.dataset.anotRef=ref;div.textContent=S.anotacoes[ref];el.after(div);
    }
  });
}
function reaplicarTudo(){ document.querySelectorAll('.painel-aba').forEach(p=>aplicarEstilos(p)); }

// ─── GERAÇÃO DE HTML ──────────────────────────────
function gerarHTML(params){
  if(params.tipo==='capitulo')  return htmlCapitulo(params);
  if(params.tipo==='versiculo') return htmlVersiculo(params);
  if(params.tipo==='palavra')   return htmlPalavras(params);
  if(params.tipo==='especial')  return htmlEspecial(params);
  return{icone:'?',html:''};
}

function htmlCapitulo({livro,cap}){
  const titulo=`${livro} ${cap}`;
  const versos=capVersos(livro,cap);
  if(!versos.length) return{icone:'📖',html:`<div class="capitulo-wrap">${htmlVazio(`"${titulo}" não encontrado`,similares(livro))}</div>`};
  const refsMap=refs();
  const comRefs=versos.filter(v=>refsMap[v.ref]).length;
  const linhas=versos.map(v=>{
    const temRef=!!refsMap[v.ref];
    const onclick=temRef?`onclick="abrirVersiculo('${v.ref.replace(/'/g,"\\'")}') "`:'';
    return `<div class="verso link" data-ref="${esc(v.ref)}" ${onclick}><span class="verso-n">${v.n}</span><span class="verso-t">${esc(v.txt)}</span><div class="verso-acoes"><button class="verso-ac-btn" onclick="event.stopPropagation();toggleFav('${v.ref.replace(/'/g,"\\'")}')" title="Favorito">⭐</button><button class="verso-ac-btn" onclick="event.stopPropagation();abrirPopup('${v.ref.replace(/'/g,"\\'")}') " title="Anotar/Destacar">✏️</button></div></div>`;
  }).join('');
  return{icone:'📖',html:`<div class="capitulo-wrap"><div class="card"><div class="card-topo"><span class="tag-label">✦ Capítulo Completo</span><h2 class="card-ref">${esc(titulo)}</h2><p class="card-meta">${versos.length} versículos · ${comRefs} com refs · ⭐ favoritar · ✏️ anotar/destacar</p></div><div class="cap-versos">${linhas}</div><div class="card-acoes"><button class="btn-ac" onclick="copiarCapitulo('${esc(titulo)}')">📋 Copiar</button><button class="btn-ac" onclick="exportarCapitulo('${esc(titulo)}')">📄 Exportar</button></div></div></div>`};
}

function htmlVersiculo({ref}){
  const dadosRef=refs()[ref], tp=textoDe(ref);
  if(!dadosRef) return{icone:'🔗',html:`<div class="resultado-wrap">${htmlVazio(`"${ref}" não encontrado nas refs cruzadas`,similares(ref.split(' ')[0]))}</div>`};
  const lista=Array.isArray(dadosRef)?dadosRef:(dadosRef.referencias_cruzadas||[]);
  const dest=lista.filter(r=>r.votos>=100), dem=lista.filter(r=>r.votos<100);
  const mCap=ref.match(/^(.+?)\s+(\d+):/);
  const btnCap=mCap?`<button class="btn-ac" onclick="abrirCapitulo('${mCap[1].replace(/'/g,"\\'")}',${mCap[2]})">📖 Ver Capítulo</button>`:'';
  const renderItem=(r,n)=>{
    const mRC=r.ref.match(/^(.+?)\s+(\d+):/);
    const btnRC=mRC?`<button class="ref-ver-cap" onclick="event.stopPropagation();abrirCapitulo('${mRC[1].replace(/'/g,"\\'")}',${mRC[2]})" title="Ver capítulo">📖</button>`:'';
    const txtH=r.texto?`<span class="ref-txt">"${esc(r.texto)}"</span>`:`<span class="ref-txt ref-txt-aus">— texto não disponível</span>`;
    return `<li class="ref-item" onclick="abrirVersiculo('${r.ref.replace(/'/g,"\\'")}') "><span class="ref-n">${n}</span><div class="ref-body"><span class="ref-nome">${esc(r.ref)} ${btnRC}</span>${txtH}<span class="ref-votos ${r.votos>=100?'hi':''}">${r.votos>=100?'⭐ ':''}${r.votos} confirmações</span></div><span class="ref-arrow">›</span></li>`;
  };
  const secD=dest.length?`<div class="card-secao"><h3 class="sec-titulo">Mais Relevantes <span class="sec-badge">${dest.length}</span></h3><ul class="refs-lista">${dest.map((r,i)=>renderItem(r,i+1)).join('')}</ul></div>`:'';
  const secDm=dem.length?`<div class="card-secao"><h3 class="sec-titulo">Outras Referências <span class="sec-badge">${dem.length}</span></h3><ul class="refs-lista" style="max-height:400px;overflow-y:auto">${dem.map((r,i)=>renderItem(r,dest.length+i+1)).join('')}</ul></div>`:'';
  const favTxt=S.favoritos[ref]?'⭐ Favoritado':'☆ Favoritar';
  const favCls=S.favoritos[ref]?'btn-ac fav-ativo':'btn-ac';
  return{icone:'🔗',html:`<div class="resultado-wrap"><div class="card"><div class="card-topo"><span class="tag-label">✦ Referências Cruzadas</span><h2 class="card-ref">${esc(ref)}</h2>${tp?`<p class="card-texto">"${esc(tp)}"</p>`:''}<p class="card-meta">${lista.length} referências · Almeida RC</p></div>${secD}${secDm}<div class="card-acoes">${btnCap}<button class="${favCls}" id="fav-btn-${ref.replace(/[\s:]/g,'-')}" onclick="toggleFav('${ref.replace(/'/g,"\\'")}') ">${favTxt}</button><button class="btn-ac" onclick="abrirPopup('${ref.replace(/'/g,"\\'")}') ">✏️ Anotar</button><button class="btn-ac" onclick="copiarRefs('${ref.replace(/'/g,"\\'")}') ">📋 Copiar</button><button class="btn-ac" onclick="exportarEstudo('${ref.replace(/'/g,"\\'")}') ">📄 Exportar</button></div></div></div>`};
}

function htmlPalavras({termo,exata,filtroLivro}){
  const res=buscarPalavras(termo,exata,filtroLivro);
  const lbl=filtroLivro==='AT'?'no AT':filtroLivro==='NT'?'no NT':filtroLivro?`em ${filtroLivro}`:'na Bíblia';
  if(!res.length) return{icone:'🔍',html:`<div class="palavras-wrap"><div class="card"><div class="card-topo"><span class="tag-label">✦ Busca por Palavras</span><h2 class="card-ref">"${esc(termo)}"</h2><p class="card-meta">Nenhum resultado ${lbl}.</p></div></div></div>`};
  const itens=res.map(({ref,texto})=>{
    const mC=ref.match(/^(.+?)\s+(\d+):/);
    const btnC=mC?`<button class="pal-btn-cap" onclick="event.stopPropagation();abrirCapitulo('${mC[1].replace(/'/g,"\\'")}',${mC[2]})" title="Ver capítulo">📖</button>`:'';
    return `<li class="palavra-item" onclick="abrirVersiculo('${ref.replace(/'/g,"\\'")}') "><div class="palavra-ref"><span>${esc(ref)}</span><span style="display:flex;gap:5px;align-items:center">${btnC}<span class="palavra-ref-arrow">›</span></span></div><p class="palavra-trecho">${destacar(texto,termo,exata)}</p></li>`;
  }).join('');
  return{icone:'🔍',html:`<div class="palavras-wrap"><div class="card"><div class="card-topo"><span class="tag-label">✦ Busca por Palavras</span><h2 class="card-ref">"${esc(termo)}"</h2><p class="card-meta">${res.length}${res.length===500?'+':''} versículos ${lbl}</p></div><ul class="palavras-lista" style="max-height:70vh;overflow-y:auto">${itens}</ul></div></div>`};
}

function htmlEspecial({subtipo}){
  if(subtipo==='favoritos')  return htmlFavoritos();
  if(subtipo==='marcadores') return htmlMarcadores();
  if(subtipo==='tematicos')  return htmlTematicos();
  return{icone:'?',html:''};
}

function htmlFavoritos(){
  const favs=Object.keys(S.favoritos).filter(k=>S.favoritos[k]);
  if(!favs.length) return{icone:'⭐',html:`<div class="especial-wrap">${htmlVazio('Nenhum favorito ainda',[],`Clique em ⭐ ao lado de qualquer versículo para favoritar.`)}</div>`};
  const itens=favs.map(ref=>{
    const txt=textoDe(ref),cor=S.marcadores[ref]||'var(--ouro-esc)';
    return `<li class="especial-item"><div class="ei-marcador" style="background:${cor}"></div><div class="ei-corpo" onclick="abrirVersiculo('${ref.replace(/'/g,"\\'")}') "><div class="ei-ref">${esc(ref)}</div>${txt?`<div class="ei-txt">"${esc(txt)}"</div>`:''} ${S.anotacoes[ref]?`<div class="ei-nota">📝 ${esc(S.anotacoes[ref].substring(0,80))}${S.anotacoes[ref].length>80?'...':''}</div>`:''}</div><div class="ei-acoes"><button class="ei-btn" onclick="abrirPopup('${ref.replace(/'/g,"\\'")}') " title="Editar">✏️</button><button class="ei-btn" onclick="toggleFav('${ref.replace(/'/g,"\\'")}')" style="color:var(--erro)" title="Remover">✕</button></div></li>`;
  }).join('');
  return{icone:'⭐',html:`<div class="especial-wrap"><div class="card"><div class="card-topo"><span class="tag-label">✦ Favoritos</span><h2 class="card-ref">Versículos Favoritos</h2><p class="card-meta">${favs.length} versículo${favs.length!==1?'s':''}</p></div><ul class="especial-lista">${itens}</ul><div class="card-acoes"><button class="btn-ac" onclick="exportarFavoritos()">📄 Exportar todos</button></div></div></div>`};
}

function htmlMarcadores(){
  const marcados=Object.entries(S.marcadores).filter(([,v])=>v);
  if(!marcados.length) return{icone:'🔖',html:`<div class="especial-wrap">${htmlVazio('Nenhum marcador ainda',[],`Clique em ✏️ em qualquer versículo de um capítulo para marcar.`)}</div>`};
  const itens=marcados.map(([ref,cor])=>{
    const txt=textoDe(ref);
    return `<li class="especial-item"><div class="ei-marcador" style="background:${cor}"></div><div class="ei-corpo" onclick="abrirVersiculo('${ref.replace(/'/g,"\\'")}') "><div class="ei-ref">${esc(ref)}</div>${txt?`<div class="ei-txt">"${esc(txt)}"</div>`:''} ${S.anotacoes[ref]?`<div class="ei-nota">📝 ${esc(S.anotacoes[ref].substring(0,80))}</div>`:''}</div><div class="ei-acoes"><button class="ei-btn" onclick="abrirPopup('${ref.replace(/'/g,"\\'")}') " title="Editar">✏️</button><button class="ei-btn" onclick="removerMarcador('${ref.replace(/'/g,"\\'")}')" style="color:var(--erro)" title="Remover">✕</button></div></li>`;
  }).join('');
  return{icone:'🔖',html:`<div class="especial-wrap"><div class="card"><div class="card-topo"><span class="tag-label">✦ Marcadores</span><h2 class="card-ref">Versículos Marcados</h2><p class="card-meta">${marcados.length} marcador${marcados.length!==1?'es':''}</p></div><ul class="especial-lista">${itens}</ul></div></div>`};
}

function htmlTematicos(){
  const temas=Object.entries(S.temas);
  const cards=temas.length?temas.map(([tema,verss])=>{
    const itens=verss.map(ref=>{const txt=textoDe(ref);return `<li class="tema-item"><span class="tema-item-ref" onclick="abrirVersiculo('${ref.replace(/'/g,"\\'")}') ">${esc(ref)}</span>${txt?`<span class="tema-item-txt">${esc(txt.substring(0,70))}${txt.length>70?'...':''}</span>`:''}<button class="tema-item-del" onclick="removerDoTema('${tema.replace(/'/g,"\\'")}','${ref.replace(/'/g,"\\'")}') " title="Remover">✕</button></li>`;}).join('');
    return `<div class="tema-card"><div class="tema-header" onclick="toggleTema(this)"><span class="tema-nome">📚 ${esc(tema)}</span><span class="tema-count">${verss.length} versículo${verss.length!==1?'s':''} ▾</span></div><ul class="tema-lista">${itens}</ul></div>`;
  }).join(''):`<div class="estado-vazio" style="min-height:20vh"><p>Nenhuma lista temática ainda. Crie uma abaixo e adicione versículos via ✏️.</p></div>`;
  return{icone:'📚',html:`<div class="especial-wrap"><div class="card"><div class="card-topo"><span class="tag-label">✦ Temáticos</span><h2 class="card-ref">Listas Temáticas</h2><p class="card-meta">${temas.length} tema${temas.length!==1?'s':''}</p></div><div class="temas-grid">${cards}</div><div class="novo-tema-area"><input type="text" class="novo-tema-inp" id="novo-tema-inp" placeholder="Nome do novo tema..."/><button class="novo-tema-btn" onclick="criarTema()">＋ Criar</button></div></div></div>`};
}

function htmlVazio(msg,sugestoes=[],detalhe=''){
  const sug=sugestoes.map(s=>`<button class="sugestao-btn" onclick="buscarTexto('${s.replace(/'/g,"\\'")}') ">${esc(s)}</button>`).join('');
  return `<div class="estado-vazio"><span class="estado-vazio-ic">📖</span><h3>Não encontrado</h3><p>${msg}</p>${detalhe?`<p style="margin-top:4px;font-size:.75rem">${detalhe}</p>`:''} ${sug?`<div class="estado-sugs">${sug}</div>`:''}</div>`;
}

// ─── POPUP ────────────────────────────────────────
let _popupRef=null;

function abrirPopup(ref){
  _popupRef=ref;
  const txt=textoDe(ref);
  document.getElementById('popup-ref-label').textContent=ref;
  document.getElementById('popup-texto-verso').textContent=txt?`"${txt}"`:'—';
  document.getElementById('popup-anotacao').value=S.anotacoes[ref]||'';
  const favBtn=document.getElementById('popup-fav-btn');
  favBtn.textContent=S.favoritos[ref]?'⭐ Favoritado':'☆ Favorito';
  favBtn.classList.toggle('ativo',!!S.favoritos[ref]);
  document.querySelectorAll('#popup-cores .cor-btn').forEach(b=>b.classList.toggle('selecionada',b.dataset.cor===(S.destaques[ref]||'')));
  document.querySelectorAll('.cor-marcador').forEach(b=>b.classList.toggle('selecionada',b.dataset.cor===(S.marcadores[ref]||'')));
  const sel=document.getElementById('popup-tema-sel');
  sel.innerHTML='<option value="">+ Adicionar a tema</option>'+Object.keys(S.temas).map(t=>`<option value="${esc(t)}" ${(S.temas[t]||[]).includes(ref)?'disabled':''} >${esc(t)}</option>`).join('');
  document.getElementById('popup-overlay').classList.remove('hidden');
}

function fecharPopup(){document.getElementById('popup-overlay').classList.add('hidden');_popupRef=null;}

function salvarPopup(){
  if(!_popupRef) return;
  const ref=_popupRef;
  // Anotação
  const anot=document.getElementById('popup-anotacao').value.trim();
  if(anot) S.anotacoes[ref]=anot; else delete S.anotacoes[ref];
  // Destaque
  const dBtn=document.querySelector('#popup-cores .cor-btn.selecionada');
  const dCor=dBtn?dBtn.dataset.cor:'';
  if(dCor) S.destaques[ref]=dCor; else delete S.destaques[ref];
  // Marcador
  const mBtn=document.querySelector('.cor-marcador.selecionada');
  const mCor=mBtn?mBtn.dataset.cor:'';
  if(mCor) S.marcadores[ref]=mCor; else delete S.marcadores[ref];
  // Tema
  const tema=document.getElementById('popup-tema-sel').value;
  if(tema&&S.temas[tema]&&!S.temas[tema].includes(ref)) S.temas[tema].push(ref);
  salvarDados();
  reaplicarTudo();
  // Atualiza anotação inline
  document.querySelectorAll(`.verso-anotacao[data-anotRef="${CSS.escape(ref)}"]`).forEach(el=>el.remove());
  if(anot){
    document.querySelectorAll(`.verso[data-ref="${CSS.escape(ref)}"]`).forEach(el=>{
      const div=document.createElement('div');div.className='verso-anotacao';div.dataset.anotRef=ref;div.textContent=anot;el.after(div);
    });
  }
  fecharPopup();
}

// ─── FAVORITOS / MARCADORES / TEMÁTICOS ──────────
function toggleFav(ref,btn){
  S.favoritos[ref]=!S.favoritos[ref];
  if(!S.favoritos[ref]) delete S.favoritos[ref];
  salvarDados();
  if(btn) btn.classList.toggle('fav-ativo',!!S.favoritos[ref]);
  const bId=document.getElementById(`fav-btn-${ref.replace(/[\s:]/g,'-')}`);
  if(bId){bId.textContent=S.favoritos[ref]?'⭐ Favoritado':'☆ Favoritar';bId.classList.toggle('fav-ativo',!!S.favoritos[ref]);}
  const pFav=document.getElementById('popup-fav-btn');
  if(pFav&&_popupRef===ref){pFav.textContent=S.favoritos[ref]?'⭐ Favoritado':'☆ Favorito';pFav.classList.toggle('ativo',!!S.favoritos[ref]);}
}

function removerMarcador(ref){
  delete S.marcadores[ref];salvarDados();reaplicarTudo();
  recarregarEspecial('🔖 Marcadores','marcadores');
}

function criarTema(){
  const inp=document.getElementById('novo-tema-inp');
  const nome=inp?.value.trim(); if(!nome||S.temas[nome]) return;
  S.temas[nome]=[];salvarDados();inp.value='';
  recarregarEspecial('📚 Temáticos','tematicos');
}

function removerDoTema(tema,ref){
  if(!S.temas[tema]) return;
  S.temas[tema]=S.temas[tema].filter(r=>r!==ref);salvarDados();
  recarregarEspecial('📚 Temáticos','tematicos');
}

function toggleTema(h){
  const l=h.nextElementSibling,c=h.querySelector('.tema-count');
  const ab=l.style.display!=='none';l.style.display=ab?'none':'block';
  if(c) c.textContent=c.textContent.replace(ab?'▾':'▴',ab?'▴':'▾');
}

function recarregarEspecial(label,subtipo){
  const aba=S.abas.find(a=>a.label===label); if(!aba) return;
  const{html}=htmlEspecial({subtipo});aba.html=html;
  const p=document.getElementById(`painel-${aba.id}`);if(p) p.innerHTML=html;
}

// ─── AÇÕES GLOBAIS ────────────────────────────────
function buscarTexto(texto){
  const inp=document.getElementById('input-referencia');if(inp) inp.value=texto;
  realizarBusca(texto);
}
function realizarBusca(t){
  if(!S.carregado) return;
  const inp=document.getElementById('input-referencia');
  const texto=t??inp?.value?.trim();
  if(!texto){inp&&(inp.style.boxShadow='0 0 0 2px var(--erro)');setTimeout(()=>inp&&(inp.style.boxShadow=''),1500);return;}
  const a=analisar(texto);if(!a) return;
  abrirAba({...a,label:a.ref||`${a.livro} ${a.cap}`});
}
function realizarBuscaPalavra(){
  if(!S.carregado) return;
  const termo=document.getElementById('input-palavra')?.value?.trim(); if(!termo) return;
  const exata=document.getElementById('filtro-exata')?.checked||false;
  const filtro=document.getElementById('filtro-livro')?.value||'';
  abrirAba({tipo:'palavra',termo,exata,filtroLivro:filtro,label:`"${termo}"${filtro?` · ${filtro}`:''}`});
}
function abrirVersiculo(ref){ abrirAba({tipo:'versiculo',ref,label:ref}); }
function abrirCapitulo(livro,cap){ abrirAba({tipo:'capitulo',livro,cap:+cap,label:`${livro} ${cap}`}); }
function abrirView(subtipo){
  const labels={favoritos:'⭐ Favoritos',marcadores:'🔖 Marcadores',tematicos:'📚 Temáticos'};
  const icones={favoritos:'⭐',marcadores:'🔖',tematicos:'📚'};
  const label=labels[subtipo];
  const aba=S.abas.find(a=>a.label===label);
  if(aba){const{html}=htmlEspecial({subtipo});aba.html=html;const p=document.getElementById(`painel-${aba.id}`);if(p)p.innerHTML=html;ativarAba(aba.id);return;}
  const{html}=htmlEspecial({subtipo});const id=++_id;
  S.abas.push({id,label,icone:icones[subtipo],html});renderAbas();ativarAba(id);
}

// ─── EXPORTAR ─────────────────────────────────────
async function _copiar(texto){
  try{await navigator.clipboard.writeText(texto);alert('✅ Copiado!');}
  catch{const el=document.createElement('textarea');el.value=texto;document.body.appendChild(el);el.select();document.execCommand('copy');document.body.removeChild(el);alert('✅ Copiado!');}
}
function _download(nome,c){const b=new Blob([c],{type:'text/plain;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=nome;a.click();URL.revokeObjectURL(u);}

function copiarRefs(ref){const d=refs()[ref];if(!d) return;const l=Array.isArray(d)?d:(d.referencias_cruzadas||[]);_copiar(`${ref}\n\n`+l.map((r,i)=>`${i+1}. ${r.ref}${r.texto?`\n   "${r.texto}"`:''}`).join('\n\n'));}
function copiarCapitulo(titulo){const m=titulo.match(/^(.+)\s+(\d+)$/);if(!m) return;_copiar(`${titulo}\n${'='.repeat(40)}\n\n`+capVersos(m[1],+m[2]).map(x=>`${x.n} ${x.txt}`).join('\n'));}
function exportarEstudo(ref){
  const d=refs()[ref];if(!d) return;
  const l=Array.isArray(d)?d:(d.referencias_cruzadas||[]);const tp=textoDe(ref);
  _download(`estudo-${ref.replace(/[\s:]/g,'-')}.txt`,[`ESTUDO — ${new Date().toLocaleDateString('pt-BR')}`,'='.repeat(55),'','📖 REFERÊNCIA',ref,tp?`\n"${tp}"\n`:'',`🔗 REFERÊNCIAS CRUZADAS (${l.length})`,'─'.repeat(45),l.map((r,i)=>`${i+1}. ${r.ref} [${r.votos}]${r.texto?`\n   "${r.texto}"`:''}`).join('\n\n'),'','='.repeat(55),'Gerador de Sermão v2.5 · Almeida RC · OpenBible.info CC-BY'].join('\n'));
}
function exportarCapitulo(titulo){
  const m=titulo.match(/^(.+)\s+(\d+)$/);if(!m) return;
  _download(`${titulo.replace(/\s/g,'-')}.txt`,`${titulo.toUpperCase()}\n${'='.repeat(55)}\n\n`+capVersos(m[1],+m[2]).map(x=>`${x.n}  ${x.txt}`).join('\n')+`\n\n${'='.repeat(55)}\nAlmeida RC · Gerador de Sermão v2.5`);
}
function exportarFavoritos(){
  const favs=Object.keys(S.favoritos).filter(k=>S.favoritos[k]);
  _download('favoritos.txt',`FAVORITOS — ${new Date().toLocaleDateString('pt-BR')}\n${'='.repeat(55)}\n\n`+favs.map(ref=>{const txt=textoDe(ref),anot=S.anotacoes[ref];return `${ref}${txt?`\n"${txt}"`:''} ${anot?`\n📝 ${anot}`:''}`;}).join('\n\n'+'─'.repeat(40)+'\n\n'));
}

// ─── NOTAS ────────────────────────────────────────
function notasCarregar(){try{S.notas=JSON.parse(localStorage.getItem(NOTAS_KEY)||'[]');}catch{S.notas=[];}if(!S.notas.length) notaNova(false);else{notasRenderTabs();notasAtivar(S.notas[0].id);}}
function notasSalvar(){try{localStorage.setItem(NOTAS_KEY,JSON.stringify(S.notas));}catch{}}
function notaNova(focar=true){const id=Date.now().toString();S.notas.unshift({id,titulo:'',corpo:'',data:new Date().toLocaleDateString('pt-BR')});notasSalvar();notasRenderTabs();notasAtivar(id);if(focar)setTimeout(()=>document.getElementById('nota-titulo')?.focus(),50);}
function notasAtivar(id){const n=S.notas.find(x=>x.id===id);if(!n)return;S.notaAtiva=id;const t=document.getElementById('nota-titulo'),e=document.getElementById('nota-editor');if(t)t.value=n.titulo;if(e)e.value=n.corpo;notasContador();notasRenderTabs();}
let _nTimer=null;
function notasAutoSalvar(){clearTimeout(_nTimer);_nTimer=setTimeout(notasAtualizar,700);}
function notasAtualizar(){if(!S.notaAtiva)return;const n=S.notas.find(x=>x.id===S.notaAtiva);if(!n)return;n.titulo=document.getElementById('nota-titulo')?.value||'';n.corpo=document.getElementById('nota-editor')?.value||'';n.data=new Date().toLocaleDateString('pt-BR');notasSalvar();notasRenderTabs();const st=document.getElementById('nota-status');if(st){st.textContent='Salvo ✓';setTimeout(()=>st.textContent='—',1800);}}
function notasExcluir(id){S.notas=S.notas.filter(n=>n.id!==id);notasSalvar();if(S.notaAtiva===id){S.notaAtiva=null;S.notas.length?notasAtivar(S.notas[0].id):notaNova(false);}notasRenderTabs();}
function notasExportar(){const n=S.notas.find(x=>x.id===S.notaAtiva);if(!n)return;const t=n.titulo||'Nota';_download(`${t.replace(/[^\wÀ-ú\s]/g,'').replace(/\s+/g,'-')||'nota'}.txt`,`${t}\n${n.data}\n${'='.repeat(50)}\n\n${n.corpo}\n\n${'='.repeat(50)}\nGerador de Sermão v2.5`);}
function notasContador(){const e=document.getElementById('nota-editor'),c=document.getElementById('nota-palavras');if(!e||!c)return;const n=e.value.trim().split(/\s+/).filter(Boolean).length;c.textContent=`${n} palavra${n!==1?'s':''}`;}
function notasRenderTabs(){const el=document.getElementById('notas-tabs');if(!el)return;el.innerHTML=S.notas.map(n=>`<div class="nota-tab ${n.id===S.notaAtiva?'ativa':''}" onclick="notasAtivar('${n.id}')"><span title="${esc(n.titulo||'Sem título')}">${esc((n.titulo||'Sem título').substring(0,13))}</span><button class="nota-tab-x" onclick="event.stopPropagation();notasExcluir('${n.id}')">✕</button></div>`).join('');}
function toggleNotas(){S.notasAbertas=!S.notasAbertas;const p=document.getElementById('notas-painel'),dv=document.getElementById('notas-divisor'),b=document.getElementById('btn-reabrir-notas');if(S.notasAbertas){p?.classList.remove('minimizado');dv?.classList.remove('minimizado');b?.classList.add('hidden');}else{p?.classList.add('minimizado');dv?.classList.add('minimizado');b?.classList.remove('hidden');}}

// ─── REDIMENSIONAMENTO ────────────────────────────
function iniciarRedim(){
  const dv=document.getElementById('notas-divisor'),painel=document.getElementById('notas-painel');
  if(!dv||!painel) return;
  const w=parseInt(localStorage.getItem(NOTAS_W_KEY));
  if(w&&w>150&&w<700) painel.style.width=w+'px';
  let arr=false,xIni=0,wIni=0;
  const start=x=>{if(!S.notasAbertas)return;arr=true;xIni=x;wIni=painel.getBoundingClientRect().width;dv.classList.add('arrastando');document.body.style.cursor='col-resize';document.body.style.userSelect='none';};
  const move=x=>{if(!arr)return;const nw=Math.max(150,Math.min(700,wIni+(xIni-x)));painel.style.width=nw+'px';};
  const end=()=>{if(!arr)return;arr=false;dv.classList.remove('arrastando');document.body.style.cursor='';document.body.style.userSelect='';localStorage.setItem(NOTAS_W_KEY,Math.round(painel.getBoundingClientRect().width));};
  dv.addEventListener('mousedown',e=>{start(e.clientX);e.preventDefault();});
  document.addEventListener('mousemove',e=>move(e.clientX));
  document.addEventListener('mouseup',end);
  dv.addEventListener('touchstart',e=>{start(e.touches[0].clientX);e.preventDefault();},{passive:false});
  document.addEventListener('touchmove',e=>{move(e.touches[0].clientX);e.preventDefault();},{passive:false});
  document.addEventListener('touchend',end);
}

// ─── INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded',async()=>{
  console.log('🚀 Gerador de Sermão v2.5');
  carregarDados();
  const ok=await carregarBiblia();
  if(!ok){document.getElementById('abas-content').innerHTML=`<div class="estado-vazio"><span class="estado-vazio-ic">⚠️</span><h3>Erro ao carregar dados</h3><p>Use: <code>npx serve</code></p></div>`;}

  // Busca
  document.getElementById('btn-buscar')?.addEventListener('click',()=>realizarBusca());
  document.getElementById('input-referencia')?.addEventListener('keydown',e=>{if(e.key==='Enter')realizarBusca();});
  document.getElementById('btn-buscar-palavra')?.addEventListener('click',realizarBuscaPalavra);
  document.getElementById('input-palavra')?.addEventListener('keydown',e=>{if(e.key==='Enter')realizarBuscaPalavra();});

  // Sugestões + modo + nav
  document.querySelectorAll('.sugestao-btn').forEach(b=>b.addEventListener('click',()=>buscarTexto(b.dataset.ref)));
  document.querySelectorAll('.modo-tab').forEach(b=>b.addEventListener('click',()=>setModo(b.dataset.modo)));
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>abrirView(b.dataset.view)));

  // Notas
  notasCarregar();
  document.getElementById('btn-nova-nota')?.addEventListener('click',()=>notaNova(true));
  document.getElementById('btn-exportar-nota')?.addEventListener('click',notasExportar);
  document.getElementById('btn-toggle-notas')?.addEventListener('click',toggleNotas);
  document.getElementById('btn-reabrir-notas')?.addEventListener('click',toggleNotas);
  document.getElementById('nota-titulo')?.addEventListener('input',notasAutoSalvar);
  document.getElementById('nota-editor')?.addEventListener('input',()=>{notasContador();notasAutoSalvar();});

  // Popup
  document.getElementById('popup-fechar')?.addEventListener('click',fecharPopup);
  document.getElementById('popup-cancelar')?.addEventListener('click',fecharPopup);
  document.getElementById('popup-salvar')?.addEventListener('click',salvarPopup);
  document.getElementById('popup-overlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)fecharPopup();});

  // Cores destaque
  document.querySelectorAll('#popup-cores .cor-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.dataset.cor==='custom'){document.getElementById('cor-picker').click();return;}
      document.querySelectorAll('#popup-cores .cor-btn').forEach(b=>b.classList.remove('selecionada'));
      btn.classList.add('selecionada');
    });
  });
  document.getElementById('cor-picker')?.addEventListener('change',e=>{
    const cor=e.target.value+'40';
    const cb=document.querySelector('#popup-cores .cor-custom');
    if(cb){cb.dataset.cor=cor;cb.style.background=cor;document.querySelectorAll('#popup-cores .cor-btn').forEach(b=>b.classList.remove('selecionada'));cb.classList.add('selecionada');}
  });

  // Cores marcador
  document.querySelectorAll('.cor-marcador').forEach(btn=>{
    btn.addEventListener('click',()=>{document.querySelectorAll('.cor-marcador').forEach(b=>b.classList.remove('selecionada'));btn.classList.add('selecionada');});
  });

  // Favorito no popup
  document.getElementById('popup-fav-btn')?.addEventListener('click',()=>{
    if(_popupRef)toggleFav(_popupRef);
    const btn=document.getElementById('popup-fav-btn');
    btn.textContent=S.favoritos[_popupRef]?'⭐ Favoritado':'☆ Favorito';
    btn.classList.toggle('ativo',!!S.favoritos[_popupRef]);
  });

  // Modo
  function setModo(modo){
    S.modo=modo;
    document.querySelectorAll('.modo-tab').forEach(b=>b.classList.toggle('active',b.dataset.modo===modo));
    document.getElementById('busca-ref-area')?.classList.toggle('hidden',modo!=='referencia');
    document.getElementById('busca-palavra-area')?.classList.toggle('hidden',modo!=='palavra');
    document.getElementById('secao-sugestoes')?.classList.toggle('hidden',modo!=='referencia');
    setTimeout(()=>document.getElementById(modo==='referencia'?'input-referencia':'input-palavra')?.focus(),40);
  }

  iniciarRedim();
  console.log('✅ Pronto!');
});
