const DB='reading-diary-db', STORE='state';
let state={calendars:[],books:[],logs:[],settings:{}};
let db,view='calendar',activeCal='',cursor=new Date(),coverTarget=null,libraryFilter='all',librarySort='recent';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function load(){db=await openDB();const v=await new Promise(r=>{const q=db.transaction(STORE).objectStore(STORE).get('app');q.onsuccess=()=>r(q.result)});if(v)state=v;let removedLegacyIcons=false;state.calendars.forEach(c=>{if(Object.prototype.hasOwnProperty.call(c,'icon')){delete c.icon;removedLegacyIcons=true}});if(!state.calendars.length){const id=uid();state.calendars=[{id,name:'웹소설',icon:'✦',createdAt:Date.now(),theme:{colors:['#e9cbd8','#c9b9e5'],angle:135,mix:68,coverFit:'cover',accent:'#a77991'}}];activeCal=id;await save()}else activeCal=state.calendars[0].id;state.books.forEach(b=>{if(!b.format)b.format='serial';if(!b.startDate)b.startDate=new Date(b.createdAt||Date.now()).toISOString().slice(0,10);if(!b.placeholderColor)b.placeholderColor=randomPastel()});if(removedLegacyIcons)await save();render()}
function save(){return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(state,'app');t.oncomplete=res;t.onerror=()=>rej(t.error)})}
function randomPastel(){const h=Math.floor(Math.random()*360);return `hsl(${h} 38% 78%)`}
const cal=()=>state.calendars.find(c=>c.id===activeCal)||state.calendars[0];
const books=()=>state.books.filter(b=>b.calendarId===activeCal);
const logs=()=>state.logs.filter(l=>l.calendarId===activeCal);
function switchView(v){view=v;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));render()}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
function render(){if(!cal())return;const theme=cal().theme||{};document.documentElement.style.setProperty('--accent',theme.accent||'#a77991');document.documentElement.style.setProperty('--accent-soft',`${theme.accent||'#a77991'}22`);const main=$('#main');if(view==='calendar')main.innerHTML=calendarView();if(view==='stats')main.innerHTML=statsView();if(view==='library')main.innerHTML=libraryView();if(view==='settings')main.innerHTML=settingsView();bind()}
function calPicker(){return `<select class="calendar-select" id="calSelect">${state.calendars.map(c=>`<option value="${c.id}" ${c.id===activeCal?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`}
function calendarView(){const y=cursor.getFullYear(),m=cursor.getMonth(),first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(),now=new Date(),theme=cal().theme||{},colors=theme.colors||['#e9cbd8','#c9b9e5'],mix=theme.mix??68,fit=theme.coverFit||'cover';let cells='';for(let i=0;i<first;i++)cells+='<div class="day empty"></div>';for(let d=1;d<=last;d++){const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,dayLogs=logs().filter(l=>l.date===date),unique=[...new Set(dayLogs.map(l=>l.bookId))].map(id=>books().find(b=>b.id===id)).filter(Boolean),cols=unique.length>4?3:unique.length>1?2:1;cells+=`<div class="day ${dayLogs.length?'has-logs':''} ${now.toDateString()===new Date(y,m,d).toDateString()?'today':''}" data-date="${date}"><div class="covers" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${unique.map(b=>b.cover?`<img class="cover" src="${b.cover}" alt="${esc(b.title)}">`:`<div class="cover placeholder title-cover" style="background:${esc(b.placeholderColor||'#ded4dc')}"><span>${esc(b.title)}</span></div>`).join('')}</div><div class="day-num">${d}</div></div>`}return `<section class="panel calendar-panel" style="--cal-gradient:linear-gradient(${theme.angle??135}deg,${colors[0]} 0%,${colors[1]} ${mix}%,${colors[1]} 100%);--cover-fit:${fit}"><div class="row between"><div><div class="eyebrow">YOUR READING SPACE</div><div class="month-title">${y}년 ${m+1}월</div></div>${calPicker()}</div><div class="row between" style="margin-top:14px"><div class="muted">읽은 날들을 표지로 모아보세요.</div><div class="month-nav"><button id="prev">‹</button><button id="next">›</button></div></div><div class="weekdays">${['일','월','화','수','목','금','토'].map(x=>`<div>${x}</div>`).join('')}</div><div class="days">${cells}</div><div class="calendar-export"><button class="btn dark" id="pngBtn">달력 이미지 저장 ↓</button></div></section><section class="panel"><div class="row between"><div><b>이 달의 기록</b><div class="muted">${y}년 ${m+1}월</div></div><button class="btn" id="quickAdd">＋ 날짜 지정 기록</button></div><div class="stats-grid" style="margin-top:14px"><div class="stat"><span>독서한 날짜</span><strong>${new Set(logs().filter(l=>l.date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).map(l=>l.date)).size}</strong></div><div class="stat"><span>독서 기록</span><strong>${logs().filter(l=>l.date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).length}</strong></div></div></section>`}
function statsView(){
  const all=state.logs,month=today().slice(0,7),monthLogs=all.filter(l=>l.date.startsWith(month)),days=new Set(all.map(l=>l.date)).size;
  const byCal=state.calendars.map(c=>({c,n:all.filter(l=>l.calendarId===c.id).length}));
  const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-5+i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return {key,n:all.filter(l=>l.date.startsWith(key)).length}});
  const genreCounts={};all.forEach(l=>{const b=state.books.find(x=>x.id===l.bookId);if(b?.genre){b.genre.split(/[,/、]/).map(x=>x.trim()).filter(Boolean).forEach(g=>genreCounts[g]=(genreCounts[g]||0)+1)}});
  const genres=Object.entries(genreCounts).sort((a,b)=>b[1]-a[1]).slice(0,5),genreTotal=genres.reduce((s,x)=>s+x[1],0);
  const palette=['#a77991','#8f9bc7','#82b7a8','#d5ae75','#b69acb'];
  let acc=0;const stops=genres.map((g,i)=>{const from=acc/Math.max(1,genreTotal)*100;acc+=g[1];const to=acc/Math.max(1,genreTotal)*100;return `${palette[i]} ${from}% ${to}%`}).join(',');
  const completed=all.filter(l=>l.status==='completed').length;
  const rated=all.filter(l=>Number(l.rating)>0),avgRating=rated.length?(rated.reduce((s,l)=>s+Number(l.rating),0)/rated.length).toFixed(1):'—';
  const maxMonth=Math.max(1,...months.map(x=>x.n));
  return `<section class="panel"><div class="eyebrow">ALL YOUR READING</div><h2>읽기의 발자취</h2><p class="muted">모든 독서 공간의 기록을 한눈에 모았어요.</p><div class="stats-grid"><div class="stat"><span>전체 작품</span><strong>${state.books.length}</strong></div><div class="stat"><span>전체 기록</span><strong>${all.length}</strong></div><div class="stat"><span>독서한 날짜</span><strong>${days}</strong></div><div class="stat"><span>이번 달 기록</span><strong>${monthLogs.length}</strong></div></div></section>
  <div class="stats-dashboard-grid">
    <section class="panel stats-chart-panel"><b>최근 6개월 읽은 기록</b><p class="muted">월별로 쌓인 독서 기록 수</p>${months.map(x=>`<div class="month-stat-row"><span>${x.key.slice(2)}</span><div class="month-stat-track"><div style="width:${x.n/maxMonth*100}%"></div></div><b>${x.n}</b></div>`).join('')}</section>
    <section class="panel stats-genre-panel"><b>많이 읽은 장르</b><p class="muted">기록에 연결된 작품 장르 기준</p>${genres.length?`<div class="genre-chart-layout"><div class="genre-donut" style="background:conic-gradient(${stops})"><div><strong>${genreTotal}</strong><small>장르 기록</small></div></div><div class="genre-legend">${genres.map((g,i)=>`<div><i style="background:${palette[i]}"></i><span>${esc(g[0])}</span><b>${g[1]}</b></div>`).join('')}</div></div>`:'<div class="empty-state">도서 정보에 장르를 입력하면 장르 통계가 표시돼요.</div>'}</section>
  </div>
  <section class="panel stats-achievement-panel"><b>읽은 보람</b><p class="muted">완독과 별점, 수집한 문장으로 돌아보는 읽기의 결과</p><div class="stats-grid"><div class="stat"><span>완독 작품 기록</span><strong>${completed}</strong></div><div class="stat"><span>평균 별점</span><strong>${avgRating}${avgRating!=='—'?' / 5':''}</strong></div><div class="stat"><span>수집한 문장 갯수</span><strong>${all.reduce((sum,l)=>sum+(Array.isArray(l.quoteEntries)?l.quoteEntries.filter(q=>q.text?.trim()).length:(l.quote?.trim()?1:0)),0)}</strong></div><div class="stat"><span>올해 읽은 날짜</span><strong>${new Set(all.filter(l=>l.date.startsWith(today().slice(0,4))).map(l=>l.date)).size}</strong></div></div></section>
  <section class="panel"><b>독서 공간별 기록</b>${byCal.map(x=>`<div class="row between" style="padding:12px 0;border-bottom:1px solid var(--line)"><span>${esc(x.c.name)}</span><b>${x.n}회</b></div>`).join('')}</section>`;
}
function libraryView(){
  let list=[...books()];
  if(libraryFilter==='five') list=list.filter(b=>Number(b.rating)===5);
  list.sort((a,b)=>librarySort==='oldest'
    ? (a.createdAt||0)-(b.createdAt||0)
    : (b.createdAt||0)-(a.createdAt||0));
  return `<section class="panel">
    <div class="row between"><div><b>작품 서랍</b><div class="muted">${esc(cal().name)}에 등록된 작품 ${books().length}개</div></div><button class="btn dark" id="addBook">＋ 작품 등록</button></div>
  </section>
  <section class="panel library-index">
    <div><b>작품 색인</b><div class="muted">원하는 기준으로 작품을 찾아보세요.</div></div>
    <div class="library-controls">
      <div class="filter-pills"><button class="pill ${libraryFilter==='all'?'selected':''}" data-filter="all">전체 작품</button><button class="pill ${libraryFilter==='five'?'selected':''}" data-filter="five">★ 5점 작품만</button></div>
      <div class="field compact"><label for="librarySort">등록일 정렬</label><select id="librarySort"><option value="recent" ${librarySort==='recent'?'selected':''}>최신 등록순</option><option value="oldest" ${librarySort==='oldest'?'selected':''}>등록 오래된 순</option></select></div>
    </div>
  </section>
  <section class="panel">
    ${list.length?`<div class="book-list">${list.map(b=>`<div class="book-item">${b.cover?`<button type="button" class="book-open-cover" data-openbook="${b.id}" aria-label="${esc(b.title)} 기록 열람"><img class="book-cover" src="${b.cover}"></button>`:`<button type="button" class="book-open-cover" data-openbook="${b.id}" aria-label="${esc(b.title)} 기록 열람"><span class="book-cover placeholder title-cover" style="background:${esc(b.placeholderColor||'#ded4dc')}"><span>${esc(b.title)}</span></span></button>`}<div class="book-info"><strong><button type="button" class="book-title-open" data-openbook="${b.id}">${esc(b.title)}</button></strong><small>${esc(b.author)} · ${b.format==='serial'?'연재':'단행본'} · ${logs().filter(l=>l.bookId===b.id).length}회 기록</small><div>${b.genre?`<span class="chip">${esc(b.genre)}</span>`:''}${b.rating?`<span class="rating-inline">${'★'.repeat(Number(b.rating))}${'☆'.repeat(5-Number(b.rating))}</span>`:''}</div></div><button class="btn small" data-record="${b.id}">기록</button><button class="btn small ghost" data-edit="${b.id}">수정</button></div>`).join('')}</div>`:`<div class="empty-state"><b>${books().length?'조건에 맞는 작품이 없어요.':'아직 서랍이 비어 있어요.'}</b>${books().length?'색인 조건을 바꿔보세요.':'첫 번째 작품을 등록해볼까요?'}</div>`}
  </section>`;
}
function settingsView(){return `<section class="panel"><b>독서 공간 관리</b><p class="muted">각 공간은 작품과 기록을 독립적으로 보관해요.</p>${state.calendars.map(c=>`<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line)"><span>${esc(c.name)} ${c.id===activeCal?'<span class="active-calendar-tag">현재 캘린더</span>':''}</span><button class="btn small" data-rename="${c.id}">이름 변경</button></div>`).join('')}<div class="actions"><button class="btn" id="addCalendar">＋ 독서 공간 추가</button><button class="btn ghost" id="themeBtn">현재 공간 테마</button></div></section><section class="panel"><b>표지 표시 설정</b><p class="muted">현재 독서 공간의 달력에서 표지가 표시되는 방식을 정해요.</p><div class="field"><label for="coverFitSetting">표지 채우기 방식</label><select id="coverFitSetting"><option value="cover" ${(cal().theme?.coverFit||'cover')==='cover'?'selected':''}>칸에 꽉 차게 (가장자리 크롭)</option><option value="contain" ${cal().theme?.coverFit==='contain'?'selected':''}>표지 전체 보이기</option></select></div></section><section class="panel"><b>데이터 관리</b><p class="muted">기록은 이 브라우저에 저장됩니다. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 백업해 주세요.</p><div class="actions"><button class="btn dark" id="exportBtn">전체 백업 내보내기</button><button class="btn" id="importBtn">백업 복원</button></div></section><section class="panel"><b>앱 정보</b><p class="muted">오늘 뭐 읽었어? · 오프라인 사용을 지원하는 개인 독서 다이어리</p><button class="btn ghost" id="installHelp">홈 화면 설치 안내</button></section>`}
function bind(){const cs=$('#calSelect');if(cs)cs.onchange=()=>{activeCal=cs.value;render()};$('#prev')?.addEventListener('click',()=>{cursor.setMonth(cursor.getMonth()-1);render()});$('#next')?.addEventListener('click',()=>{cursor.setMonth(cursor.getMonth()+1);render()});document.querySelectorAll('.day[data-date]').forEach(el=>el.onclick=()=>openDay(el.dataset.date));$('#quickAdd')?.addEventListener('click',()=>datePickerForm(today()));$('#addBook')?.addEventListener('click',()=>bookForm());document.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>logForm(today(),b.dataset.record));document.querySelectorAll('[data-openbook]').forEach(b=>b.onclick=()=>openBook(b.dataset.openbook));document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>bookForm(b.dataset.edit));document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{libraryFilter=b.dataset.filter;render()});$('#librarySort')?.addEventListener('change',e=>{librarySort=e.target.value;render()});$('#addCalendar')?.addEventListener('click',addCalendar);$('#exportBtn')?.addEventListener('click',exportData);$('#importBtn')?.addEventListener('click',()=>$('#restoreInput').click());$('#pngBtn')?.addEventListener('click',exportPNG);$('#themeBtn')?.addEventListener('click',themeForm);$('#coverFitSetting')?.addEventListener('change',async e=>{const c=cal();c.theme={...(c.theme||{}),coverFit:e.target.value};await save();render()});$('#installHelp')?.addEventListener('click',()=>alert('브라우저 메뉴(⋮)에서 “홈 화면에 추가” 또는 “앱 설치”를 선택해 주세요.'));document.querySelectorAll('[data-rename]').forEach(b=>b.onclick=()=>renameCalendar(b.dataset.rename))}
function showModal(html){$('#modalContent').innerHTML=html;$('#modal').showModal()}
function datePickerForm(initial){showModal(`<h2>어느 날짜에 읽었나요?</h2><p class="muted">오늘뿐 아니라 지난 날짜도 자유롭게 선택할 수 있어요.</p><div class="field"><label>기록할 날짜</label><input type="date" id="targetDate" value="${initial}"></div><div class="actions"><button type="button" class="btn dark" id="chooseDate">날짜 선택</button></div>`);$('#chooseDate').onclick=()=>{const date=$('#targetDate').value;if(!date)return alert('날짜를 선택해 주세요.');$('#modal').close();cursor=new Date(date+'T12:00:00');openDay(date);render()}}
function bookForm(id){const b=id?state.books.find(x=>x.id===id):null;showModal(`<h2>${b?'도서 정보 수정':'도서 정보 등록'}</h2><p class="muted book-calendar-context">현재 독서 공간 · <strong>${esc(cal().name)}</strong></p><div class="field"><label>제목 <span class="required">*</span></label><input id="fTitle" required value="${esc(b?.title||'')}" placeholder="작품 제목"></div><div class="field"><label>작가 <span class="required">*</span></label><input id="fAuthor" required value="${esc(b?.author||'')}" placeholder="작가명"></div><div class="field"><label>표지 이미지</label><button type="button" class="btn" id="pickCover">${b?.cover?'표지 변경':'표지 업로드'}</button><span class="muted" id="coverState">${b?.cover?'표지 등록됨':'표지가 없으면 임의의 색상에 제목이 표시돼요.'}</span></div><div class="field"><label>출판사</label><input id="fPublisher" value="${esc(b?.publisher||'')}" placeholder="출판사"></div><div class="field"><label>장르</label><input id="fGenre" value="${esc(b?.genre||'')}" placeholder="로맨스, 판타지, BL, 에세이 등"></div><div class="field"><label>키워드</label><input id="fKeywords" value="${esc(Array.isArray(b?.keywords)?b.keywords.join(', '):(b?.keywords||''))}" placeholder="성장, 회귀, 계약결혼 등 쉼표로 구분"><small class="muted">쉼표(,)로 구분하면 기록 페이지에 해시태그로 표시돼요.</small></div><div class="field"><label>출판 형태</label><div class="radio-row"><label><input type="radio" name="format" value="serial" ${(b?.format||'serial')==='serial'?'checked':''}> 연재</label><label><input type="radio" name="format" value="volume" ${b?.format==='volume'?'checked':''}> 단행본</label></div></div><div class="field" id="platformField"><label>연재처</label><input id="fPlatform" value="${esc(b?.platform||'')}" placeholder="연재 플랫폼"></div><div class="field"><label>이 작품을 읽는 이유</label><textarea id="fReadingReason" placeholder="이 작품을 선택한 이유나 읽으며 얻고 싶은 것을 적어보세요.">${esc(b?.readingReason||'')}</textarea></div><div class="field"><label>읽기 시작한 날짜</label><input type="date" id="fStartDate" value="${b?.startDate||today()}"></div><div class="actions"><button type="button" class="btn dark" id="saveBook">도서 정보 저장</button>${b?'<button type="button" class="btn ghost" id="deleteBook">작품 삭제</button>':''}</div>`);let cover=b?.cover||'';const formatRadios=[...document.querySelectorAll('input[name="format"]')];const updateFormat=()=>{$('#platformField').style.display=document.querySelector('input[name="format"]:checked').value==='serial'?'grid':'none'};formatRadios.forEach(r=>r.addEventListener('change',updateFormat));updateFormat();$('#pickCover').onclick=()=>{coverTarget=data=>{cover=data;$('#coverState').textContent='새 표지가 선택됐어요.'};$('#coverInput').click()};$('#saveBook').onclick=async()=>{const title=$('#fTitle').value.trim(),author=$('#fAuthor').value.trim();if(!title||!author)return alert('제목과 작가는 필수 입력 항목이에요.');const data={title,author,publisher:$('#fPublisher').value.trim(),genre:$('#fGenre').value.trim(),keywords:$('#fKeywords').value.split(',').map(x=>x.trim().replace(/^#+/, '')).filter(Boolean),format:document.querySelector('input[name="format"]:checked').value,platform:$('#fPlatform').value.trim(),readingReason:$('#fReadingReason').value.trim(),startDate:$('#fStartDate').value||today(),cover,placeholderColor:b?.placeholderColor||randomPastel(),updatedAt:Date.now()};if(b)Object.assign(b,data);else state.books.push({id:uid(),calendarId:activeCal,...data,createdAt:Date.now(),rating:null});await save();$('#modal').close();render()};$('#deleteBook')?.addEventListener('click',async()=>{if(confirm('이 작품과 연결된 독서 기록도 모두 삭제할까요?')){state.books=state.books.filter(x=>x.id!==id);state.logs=state.logs.filter(x=>x.bookId!==id);await save();$('#modal').close();render()}})}
$('#coverInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;const data=await new Promise(r=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.readAsDataURL(f)});coverTarget?.(data);e.target.value=''};
function logForm(date,bookId,logId){
  const old=logId?state.logs.find(l=>l.id===logId):null;
  const initialBook=state.books.find(b=>b.id===(old?.bookId||bookId));
  const opts=books().map(b=>`<option value="${b.id}" ${b.id===initialBook?.id?'selected':''}>${esc(b.title)}</option>`).join('');
  const oldQuotes=Array.isArray(old?.quoteEntries)?old.quoteEntries:(old?.quote?.trim()?[{text:old.quote,page:''}]:[]);
  showModal(`<h2>${old?'독서 기록 수정':`${date} 독서 기록`}</h2>
    <div class="field"><label>작품 선택</label><select id="lBook">${opts}</select></div>
    <div class="field"><label>읽기 상태</label><div class="radio-row"><label><input type="radio" name="status" value="reading" ${(old?.status||'reading')==='reading'?'checked':''}> 읽는 중</label><label><input type="radio" name="status" value="completed" ${old?.status==='completed'?'checked':''}> 완독</label></div></div>
    <div id="progressFields"></div>
    <div class="field"><label>오늘의 메모</label><textarea id="lMemo" placeholder="읽으며 떠오른 생각이나 간단한 메모를 남겨보세요.">${esc(old?.memo||'')}</textarea></div>
    <div class="field"><label>인상 깊은 문장 수집</label><div id="quoteEntries"></div><button type="button" class="btn small ghost" id="addQuote">＋ 문장 추가</button></div>
    <section id="completionFields" class="completion-fields" style="display:${old?.status==='completed'?'block':'none'}">
      <h3>완독 노트</h3>
      <div class="field"><label>별점</label><div class="star-rating" id="starRating">${[1,2,3,4,5].map(n=>`<button type="button" class="star ${Number(old?.rating||0)>=n?'on':''}" data-star="${n}" aria-label="${n}점">★</button>`).join('')}</div></div>
      <div class="field"><label>인풋 노트</label><textarea id="lInputNote" placeholder="작품의 구성, 인물, 문체, 서사 장치 등 분석하고 싶은 내용을 기록해보세요.">${esc(old?.inputNote||'')}</textarea></div>
      <div class="field"><label>읽은 소감</label><textarea id="lReview" placeholder="읽고 난 뒤의 감상이나 생각을 자유롭게 적어보세요.">${esc(old?.review||'')}</textarea></div>
    </section>
    <div class="actions"><button type="button" class="btn dark" id="saveLog">${old?'수정 저장':'기록 저장'}</button></div>`);
  let selectedRating=Number(old?.rating||0);
  function setStars(n){selectedRating=n;document.querySelectorAll('[data-star]').forEach(s=>s.classList.toggle('on',Number(s.dataset.star)<=n))}
  document.querySelectorAll('[data-star]').forEach(s=>s.onclick=()=>setStars(Number(s.dataset.star)));

  const quoteRoot=$('#quoteEntries');
  function addQuoteEntry(entry={text:'',page:''}){
    const wrap=document.createElement('div');
    wrap.className='quote-entry';
    wrap.innerHTML=`<div class="quote-entry-head"><span>수집 문장</span><button type="button" class="btn tiny ghost remove-quote">삭제</button></div><div class="quote-page-row"><label>페이지</label><input class="quote-page" type="text" inputmode="numeric" placeholder="페이지" value="${esc(entry.page||'')}"><span>p</span></div><textarea class="quote-text-input" placeholder="인상 깊은 문장이나 문단을 입력하세요.">${esc(entry.text||'')}</textarea>`;
    wrap.querySelector('.remove-quote').onclick=()=>wrap.remove();
    quoteRoot.appendChild(wrap);
  }
  oldQuotes.forEach(q=>addQuoteEntry(q));
  $('#addQuote').onclick=()=>addQuoteEntry();

  function drawProgress(){
    const b=state.books.find(x=>x.id===$('#lBook').value),fmt=b?.format||'serial';
    $('#progressFields').innerHTML=fmt==='volume'
      ? `<div class="field"><label>지금까지 읽은 분량 <span class="required">*</span></label><div class="number-pair"><div class="number-unit"><input id="lVolumes" type="number" min="0" step="1" inputmode="numeric" required value="${old?.volumes??''}" placeholder="권수"><span>권</span></div><div class="number-unit"><input id="lPages" type="number" min="0" step="1" inputmode="numeric" required value="${old?.pages??''}" placeholder="쪽수"><span>p</span></div></div></div>`
      : `<div class="field"><label>지금까지 읽은 분량 <span class="required">*</span></label><div class="number-unit"><input id="lEpisode" type="number" min="0" step="1" inputmode="numeric" required value="${old?.episode??''}" placeholder="회차"><span>화</span></div></div>`;
  }
  drawProgress();
  $('#lBook').onchange=drawProgress;
  document.querySelectorAll('input[name="status"]').forEach(r=>r.onchange=()=>{
    $('#completionFields').style.display=document.querySelector('input[name="status"]:checked').value==='completed'?'block':'none';
  });
  $('#saveLog').onclick=async()=>{
    const b=state.books.find(x=>x.id===$('#lBook').value);
    if(!b)return alert('작품을 선택해 주세요.');
    const fmt=b.format||'serial';
    const requiredIds=fmt==='volume'?['lVolumes','lPages']:['lEpisode'];
    for(const id of requiredIds){const input=$('#'+id);if(!input||input.value.trim()===''){input?.focus();return alert('지금까지 읽은 분량은 필수 입력 항목이에요.');}}
    const status=document.querySelector('input[name="status"]:checked').value;
    const quoteEntries=[...quoteRoot.querySelectorAll('.quote-entry')].map(el=>({page:el.querySelector('.quote-page').value.trim(),text:el.querySelector('.quote-text-input').value.trim()})).filter(q=>q.page||q.text);
    const data={calendarId:activeCal,bookId:b.id,date,status,memo:$('#lMemo').value.trim(),quoteEntries,quote:quoteEntries.map(q=>q.text).filter(Boolean).join('\n'),updatedAt:Date.now()};
    if(fmt==='volume'){data.volumes=Number($('#lVolumes').value);data.pages=Number($('#lPages').value)}
    else data.episode=Number($('#lEpisode').value);
    if(status==='completed'){
      data.rating=selectedRating||null;data.inputNote=$('#lInputNote').value.trim();data.review=$('#lReview').value.trim();
      b.rating=selectedRating||null;b.status='completed';
    }else{data.rating=null;data.inputNote='';data.review='';b.status='reading'}
    if(old)Object.assign(old,data);else state.logs.push({id:uid(),...data,createdAt:Date.now()});
    b.updatedAt=Date.now();await save();$('#modal').close();render();
  };
}
function openDay(date){const ls=logs().filter(l=>l.date===date);showModal(`<h2>${date}의 독서 기록</h2>${ls.length?ls.map(l=>{const b=books().find(x=>x.id===l.bookId);const progress=b?.format==='volume'?`${l.volumes||0}권 · ${l.pages||0}p`:l.episode!=null?`${l.episode}화까지`:l.range||'분량 미입력';return `<div class="log-card"><div class="row between"><div><b>${esc(b?.title||'삭제된 작품')}</b>${b?.author?`<div class="muted">${esc(b.author)}</div>`:''}</div><span class="status-tag">${l.status==='completed'?'완독':'읽는 중'}</span></div><div class="muted">${esc(progress)} ${l.rating?` · ${'★'.repeat(l.rating)}`:''}</div>${b?.keywords?.length?`<div class="book-keywords">${b.keywords.map(k=>`<span>#${esc(k)}</span>`).join(' ')}</div>`:'' }${l.memo?.trim()?`<div class="log-note"><b>오늘의 메모</b><p>${esc(l.memo)}</p></div>`:''}${(l.quoteEntries?.length||l.quote?.trim())?`<div class="log-note"><b>인상 깊은 문장</b>${(l.quoteEntries?.length?l.quoteEntries:[{text:l.quote,page:''}]).filter(q=>q.text?.trim()).map(q=>`<div class="saved-quote"><p class="quote-text">${esc(q.text)}</p>${q.page?`<small>${esc(q.page)}p</small>`:''}</div>`).join('')}</div>`:''}${b?.readingReason?.trim()?`<div class="log-note"><b>이 작품을 읽는 이유</b><p>${esc(b.readingReason)}</p></div>`:''}${l.inputNote?.trim()?`<div class="log-note"><b>인풋 노트</b><p>${esc(l.inputNote)}</p></div>`:''}${l.review?.trim()?`<div class="log-note"><b>읽은 소감</b><p>${esc(l.review)}</p></div>`:''}<div class="actions"><button class="btn small" data-editlog="${l.id}">기록 수정</button><button class="btn small ghost" data-dellog="${l.id}">기록 삭제</button></div></div>`}).join(''):'<div class="empty-state">이날은 아직 기록이 없어요.</div>'}<div class="actions"><button type="button" class="btn dark" id="addLogDay">＋ 작품 기록 추가</button></div>`);$('#addLogDay').onclick=()=>{if(!books().length){$('#modal').close();bookForm();return}logForm(date)};document.querySelectorAll('[data-editlog]').forEach(b=>b.onclick=()=>logForm(date,null,b.dataset.editlog));document.querySelectorAll('[data-dellog]').forEach(b=>b.onclick=async()=>{state.logs=state.logs.filter(l=>l.id!==b.dataset.dellog);await save();$('#modal').close();openDay(date);render()})}

function openBook(bookId){
  const b=state.books.find(x=>x.id===bookId);
  if(!b)return;
  const entries=logs().filter(l=>l.bookId===bookId).sort((a,z)=>z.date.localeCompare(a.date));
  const cover=b.cover?`<img class="detail-cover" src="${b.cover}" alt="${esc(b.title)}">`:`<div class="detail-cover placeholder title-cover" style="background:${esc(b.placeholderColor||'#ded4dc')}"><span>${esc(b.title)}</span></div>`;
  showModal(`<h2>도서 기록</h2><div class="book-detail-head">${cover}<div><h3>${esc(b.title)}</h3><p class="muted">${esc(b.author||'')}</p>${b.genre?`<span class="chip">${esc(b.genre)}</span>`:''}${b.publisher?`<p class="muted">${esc(b.publisher)}</p>`:''}</div></div>
    ${b.keywords?.length?`<div class="book-keywords">${b.keywords.map(k=>`<span>#${esc(k)}</span>`).join(' ')}</div>`:''}
    ${b.readingReason?.trim()?`<div class="log-note"><b>이 작품을 읽는 이유</b><p>${esc(b.readingReason)}</p></div>`:''}
    <h3 class="book-record-heading">독서 기록 ${entries.length}건</h3>
    ${entries.length?entries.map(l=>{const progress=b.format==='volume'?`${l.volumes??0}권 · ${l.pages??0}p`:l.episode!=null?`${l.episode}화까지`:'분량 미입력';return `<article class="log-card book-record-card"><div class="row between"><b>${esc(l.date)}</b><span class="status-tag">${l.status==='completed'?'완독':'읽는 중'}</span></div><div class="muted">${esc(progress)} ${l.rating?` · ${'★'.repeat(l.rating)}`:''}</div>${l.memo?.trim()?`<div class="log-note"><b>오늘의 메모</b><p>${esc(l.memo)}</p></div>`:''}${(l.quoteEntries?.length||l.quote?.trim())?`<div class="log-note"><b>인상 깊은 문장</b>${(l.quoteEntries?.length?l.quoteEntries:[{text:l.quote,page:''}]).filter(q=>q.text?.trim()).map(q=>`<div class="saved-quote"><p class="quote-text">${esc(q.text)}</p>${q.page?`<small>${esc(q.page)}p</small>`:''}</div>`).join('')}</div>`:''}${l.inputNote?.trim()?`<div class="log-note"><b>인풋 노트</b><p>${esc(l.inputNote)}</p></div>`:''}${l.review?.trim()?`<div class="log-note"><b>읽은 소감</b><p>${esc(l.review)}</p></div>`:''}<div class="actions"><button class="btn small" data-book-editlog="${l.id}">기록 수정</button></div></article>`}).join(''):'<div class="empty-state">아직 이 작품의 독서 기록이 없어요.</div>'}
    <div class="actions"><button class="btn dark" id="bookAddRecord">＋ 오늘 기록 추가</button><button class="btn ghost" id="bookEditInfo">도서 정보 수정</button></div>`);
  document.querySelectorAll('[data-book-editlog]').forEach(btn=>btn.onclick=()=>{const log=state.logs.find(x=>x.id===btn.dataset.bookEditlog);if(log)logForm(log.date,bookId,log.id)});
  $('#bookAddRecord').onclick=()=>logForm(today(),bookId);
  $('#bookEditInfo').onclick=()=>bookForm(bookId);
}
function addCalendar(){
  showModal('<h2>새 독서 공간</h2><div class="field"><label>공간 이름</label><input id="newCal" placeholder="예: 만화, 일반도서, 웹소설" required></div><p class="muted">만든 뒤에도 공간 테마를 자유롭게 바꿀 수 있어요.</p><button class="btn dark" id="createCal">만들기</button>');
  $('#createCal').onclick=async()=>{
    const name=$('#newCal').value.trim();if(!name)return;
    const c={id:uid(),name,createdAt:Date.now(),theme:{colors:['#e9cbd8','#c9b9e5'],angle:135,mix:68,coverFit:'cover',accent:'#a77991'}};
    state.calendars.push(c);activeCal=c.id;await save();$('#modal').close();render();
  };
}
function renameCalendar(id){const c=state.calendars.find(x=>x.id===id);const n=prompt('독서 공간 이름',c.name);if(n?.trim()){c.name=n.trim();save().then(render)}}
function themeForm(){
  const c=cal(),t=c.theme||{},colors=t.colors||['#e9cbd8','#c9b9e5'];
  const presets={
    lavender:{name:'라벤더 드림',colors:['#d9c8ec','#a99bd4'],angle:135,mix:58,accent:'#8066ad'},
    peach:{name:'피치 크림',colors:['#f5c6b8','#e99583'],angle:135,mix:62,accent:'#c96f5d'},
    mint:{name:'민트 블루',colors:['#b8e2d8','#8fc6d5'],angle:135,mix:60,accent:'#398f91'},
    mauve:{name:'모브 나이트',colors:['#9d829f','#554b70'],angle:135,mix:55,accent:'#76547f'},
    lemon:{name:'레몬 소르베',colors:['#f5e7a6','#c8d9a2'],angle:135,mix:60,accent:'#8b9c42'}
  };
  const selected=Object.keys(presets).find(k=>JSON.stringify(presets[k].colors)===JSON.stringify(colors)&&presets[k].accent===(t.accent||'#a77991'))||'custom';
  showModal(`<h2>공간 테마</h2>
    <div class="field"><label>테마 프리셋</label><select id="themePreset"><option value="custom">직접 설정</option>${Object.entries(presets).map(([k,v])=>`<option value="${k}" ${selected===k?'selected':''}>${v.name}</option>`).join('')}</select><small class="muted">프리셋을 선택하면 배경과 강조색이 함께 적용돼요. 이후 개별 색상도 조정할 수 있어요.</small></div>
    <div class="field"><label>배경 컬러 1</label><input type="color" id="t1" value="${colors[0]}"></div>
    <div class="field"><label>배경 컬러 2</label><input type="color" id="t2" value="${colors[1]}"></div>
    <div class="field"><label>색상 배합 <span id="mixLabel">${t.mix??68}%</span></label><input type="range" id="tmix" min="30" max="90" step="5" value="${t.mix??68}"></div>
    <div class="field"><label>그라데이션 방향</label><select id="ta"><option value="135" ${Number(t.angle??135)===135?'selected':''}>대각선</option><option value="90" ${Number(t.angle)===90?'selected':''}>가로</option><option value="180" ${Number(t.angle)===180?'selected':''}>세로</option></select></div>
    <div class="field"><label>앱 강조색</label><input type="color" id="tAccent" value="${t.accent||'#a77991'}"><small class="muted">버튼, 선택 메뉴, 팝업 테두리 등에 적용돼요.</small></div>
    <div class="theme-preview" id="themePreview"></div><button class="btn dark" id="saveTheme">테마 저장</button>`);
  const preview=()=>{
    const a=$('#t1').value,b=$('#t2').value,m=Number($('#tmix').value);
    $('#mixLabel').textContent=m+'%';
    $('#themePreview').style.background=`linear-gradient(${Number($('#ta').value)}deg,${a} 0%,${b} ${m}%,${b} 100%)`;
    $('#themePreview').style.borderBottom=`5px solid ${$('#tAccent').value}`;
  };
  $('#themePreset').onchange=e=>{
    const preset=presets[e.target.value];if(!preset)return;
    $('#t1').value=preset.colors[0];$('#t2').value=preset.colors[1];$('#tmix').value=preset.mix;$('#ta').value=String(preset.angle);$('#tAccent').value=preset.accent;preview();
  };
  ['t1','t2','tmix','ta','tAccent'].forEach(id=>$('#'+id).addEventListener('input',()=>{$('#themePreset').value='custom';preview()}));
  preview();
  $('#saveTheme').onclick=async()=>{
    c.theme={...c.theme,colors:[$('#t1').value,$('#t2').value],angle:Number($('#ta').value),mix:Number($('#tmix').value),accent:$('#tAccent').value};
    await save();$('#modal').close();render();
  };
}
function exportData(){const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString(),app:'오늘 뭐 읽었어?'} ,null,2)],{type:'application/json'});download(blob,`오늘뭐읽었어-백업-${today()}.json`)}function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('#restoreInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const v=JSON.parse(await f.text());if(!Array.isArray(v.calendars)||!Array.isArray(v.books)||!Array.isArray(v.logs))throw Error();if(confirm('현재 데이터를 백업 파일의 데이터로 교체할까요?')){state={calendars:v.calendars,books:v.books,logs:v.logs,settings:v.settings||{}};activeCal=state.calendars[0]?.id;await save();render();alert('복원이 완료됐어요.')}}catch(err){alert('올바른 백업 파일이 아닙니다.')}e.target.value=''};
async function exportPNG(){const c=cal(),y=cursor.getFullYear(),m=cursor.getMonth(),first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(),cellW=220,cellH=310,sideMargin=150,topMargin=70,rows=Math.ceil((first+last)/7),canvas=document.createElement('canvas');canvas.width=7*cellW+sideMargin*2;canvas.height=170+rows*cellH+topMargin;const ctx=canvas.getContext('2d'),theme=c.theme||{},colors=theme.colors||['#e9cbd8','#c9b9e5'],mix=theme.mix??68,fit=theme.coverFit||'cover',g=ctx.createLinearGradient(0,0,canvas.width,canvas.height);g.addColorStop(0,colors[0]);g.addColorStop(mix/100,colors[1]);g.addColorStop(1,colors[1]);ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#574553';ctx.font='bold 48px sans-serif';const exportMonth=`${y}.${String(m+1).padStart(2,'0')}`;const exportHeading=`${exportMonth} | ${c.name}`;ctx.fillText(exportHeading,sideMargin+28,75);ctx.font='20px sans-serif';ctx.fillStyle='#8b7583';ctx.fillText('오늘 뭐 읽었어?  /  MY READING ARCHIVE',sideMargin+30,115);['일','월','화','수','목','금','토'].forEach((x,i)=>{ctx.fillStyle='#856f7d';ctx.font='bold 20px sans-serif';ctx.fillText(x,sideMargin+i*cellW+20,155)});for(let d=1;d<=last;d++){const idx=first+d-1,col=idx%7,row=Math.floor(idx/7),x=sideMargin+col*cellW+8,y0=170+row*cellH,w=cellW-16,h=cellH-10,date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,ls=logs().filter(l=>l.date===date),ids=[...new Set(ls.map(l=>l.bookId))],items=ids.map(id=>books().find(z=>z.id===id)).filter(Boolean);ctx.fillStyle='#ffffffb8';ctx.beginPath();ctx.roundRect(x,y0,w,h,16);ctx.fill();if(items.length){const cols=items.length>4?3:items.length>1?2:1,rowsIn=Math.ceil(items.length/cols),tw=w/cols,th=h/rowsIn;for(let i=0;i<items.length;i++){const item=items[i],cx=x+(i%cols)*tw,cy=y0+Math.floor(i/cols)*th;if(item.cover){const img=await loadImg(item.cover);drawCover(ctx,img,cx,cy,tw,th,fit)}else{ctx.fillStyle=item.placeholderColor||'#d9c5d2';ctx.fillRect(cx,cy,tw,th);ctx.fillStyle='#51434c';ctx.font='bold 15px sans-serif';ctx.fillText(item.title.slice(0,12),cx+8,cy+28)}ctx.fillStyle='#00000030';ctx.fillRect(cx,cy,tw,th)}}ctx.fillStyle=items.length?'#fff':'#735e6b';ctx.font='bold 20px sans-serif';ctx.shadowColor=items.length?'#00000088':'transparent';ctx.shadowBlur=items.length?4:0;ctx.fillText(String(d),x+12,y0+27);ctx.shadowBlur=0}const n=logs().filter(l=>l.date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`));ctx.fillStyle='#6f5968';ctx.font='18px sans-serif';ctx.fillText(`이달에 읽은 날짜 : ${new Set(n.map(l=>l.date)).size}일`,sideMargin+30,canvas.height-18);canvas.toBlob(blob=>download(blob,`독서달력-${c.name}-${y}-${m+1}.png`))}
function drawCover(ctx,img,x,y,w,h,fit){if(fit==='contain'){const r=Math.min(w/img.width,h/img.height),dw=img.width*r,dh=img.height*r;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);return}const ir=img.width/img.height,cr=w/h;let sx=0,sy=0,sw=img.width,sh=img.height;if(ir>cr){sw=img.height*cr;sx=(img.width-sw)/2}else{sh=img.width/cr;sy=(img.height-sh)/2}ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);ctx.restore()}
function loadImg(src){return new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res({width:65,height:92});i.src=src})}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));load();
