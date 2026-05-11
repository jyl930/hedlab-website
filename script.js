/* ============================= */
/* 탭 전환 (Publications / Activities 공용) */
/* ============================= */
function switchTab(tabName) {
  const isActivities = document.querySelector('.activities-main') !== null;
 
  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll(
    isActivities ? '.activities-section' : '.publications-section'
  );
 
  // 초기화
  tabs.forEach(t => t.classList.remove('active'));
  sections.forEach(s => s.classList.remove('active'));
 
  // 클릭된 탭 활성화
  const activeTab = document.querySelector(`.tab-menu .tab[onclick*="${tabName}"]`);
  if (activeTab) activeTab.classList.add('active');
 
  // 섹션 활성화
  const target = document.getElementById(tabName);
  if (target) target.classList.add('active');
 
  // Publications 탭일 경우 chip 재구성
  if (!isActivities && window._pubChipFilter && typeof window._pubChipFilter.rebuild === 'function') {
    window._pubChipFilter.rebuild();
  }
}
 
 
/* =============================
   Publications: 데이터 어노테이션
   - li에 data-year / data-category 부여
============================= */
function annotatePublications(section){
  if(!section) return;
  const categories = section.querySelectorAll('.pub-category');
  categories.forEach(cat => {
    const label = (cat.textContent || '').replace(/\[|\]/g,'').trim(); // "[XXX]" → "XXX"
    const list = cat.nextElementSibling;
    if(!list || !list.classList.contains('pub-list')) return;
 
    list.dataset.category = label;
    list.querySelectorAll('li').forEach(li => {
      li.dataset.category = label;
      const authorTxt = li.querySelector('.authors')?.textContent || '';
      const m = authorTxt.match(/\((20\d{2}|19\d{2})\)/);  // (2025) 또는 (2013)
      if(m) li.dataset.year = m[1];
    });
  });
}
 
/* =============================
   Publications: 칩 필터 모듈 (Category + Year)
   - Achievements와 동일 칩 UX
   - Past 탭은 카테고리칩 자동 숨김
   - ★ Show More/Less와 충돌 방지: 필터 중엔 강제 펼침 + 토글 버튼 숨김
============================= */
(function(){
  const root = document.querySelector('.publicitions-main, .publications-main'); // 오타 대비
  if (!root) return;
 
  let currentCat  = 'all';
  let currentYear = 'all';
 
  function activeSection(){
    return document.querySelector('.publications-section.active');
  }
 
  // 칩 컨테이너 보장 (없으면 생성)
  function ensureChipContainers(){
    let catRow = root.querySelector('#pubCatChips');
    let yearRow = root.querySelector('#pubYearChips');
    let catGroup, yearGroup;
 
    if (catRow && yearRow) {
      catGroup = catRow.closest('.filter-group');
      yearGroup = yearRow.closest('.filter-group');
      return { catRow, yearRow, catGroup, yearGroup };
    }
    const sidebar = root.querySelector('.pub-sidebar') || root;
    const afterNode = sidebar.querySelector('.tab-menu') || sidebar.firstElementChild;
 
      // ★ 제목 생성 (없으면)
    let heading = sidebar.querySelector('#pubFiltersTitle');
    if (!heading) {
      heading = document.createElement('h2');
      heading.id = 'pubFiltersTitle';
      heading.textContent = 'Publications Filters';
    }
 
    const filters = document.createElement('div');
    filters.className = 'pub-filters';
    filters.setAttribute('aria-label', 'Filter publications');
 
    // Category
    catGroup = document.createElement('div');
    catGroup.className = 'filter-group';
    catGroup.setAttribute('role', 'group');
    catGroup.setAttribute('aria-label', 'Category');
    const catLabel = document.createElement('span');
    catLabel.className = 'filter-label';
    catLabel.textContent = 'Category';
    catRow = document.createElement('div');
    catRow.className = 'chip-row';
    catRow.id = 'pubCatChips';
    catGroup.appendChild(catLabel);
    catGroup.appendChild(catRow);
 
    // Year
    yearGroup = document.createElement('div');
    yearGroup.className = 'filter-group';
    yearGroup.setAttribute('role', 'group');
    yearGroup.setAttribute('aria-label', 'Year');
    const yearLabel = document.createElement('span');
    yearLabel.className = 'filter-label';
    yearLabel.textContent = 'Year';
    yearRow = document.createElement('div');
    yearRow.className = 'chip-row';
    yearRow.id = 'pubYearChips';
    yearGroup.appendChild(yearLabel);
    yearGroup.appendChild(yearRow);
 
    filters.appendChild(catGroup);
    filters.appendChild(yearGroup);
 
    if (afterNode && afterNode.parentNode) {
      afterNode.parentNode.insertBefore(filters, afterNode.nextSibling);
    } else {
      sidebar.prepend(filters);
    }
    return { catRow, yearRow, catGroup, yearGroup };
  }
 
  function makeChip(label, value, attr, active=false){
    const btn = document.createElement('button');
    btn.className = 'chip' + (active ? ' active' : '');
    btn.textContent = label;
    btn.setAttribute(attr, value);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    return btn;
  }
 
  function setRowActive(row, attr, value){
    row.querySelectorAll('.chip').forEach(btn=>{
      const isActive = btn.getAttribute(attr) === value;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.classList.toggle('active', isActive);
    });
  }
 
  function isFiltered(){
    return currentCat !== 'all' || currentYear !== 'all';
  }
 
  // 필터 중 토글 버튼/리스트 상태 동기화
  function syncToggleUI(section){
    section.querySelectorAll('.toggle-container').forEach(list=>{
      // 리스트 바로 다음이 토글 버튼(span.toggle-btn) 구조를 가정
      const btn = list.nextElementSibling && list.nextElementSibling.classList?.contains('toggle-btn')
        ? list.nextElementSibling
        : null;
 
      if (isFiltered()) {
        // 필터 켜짐: 리스트를 강제 펼치고, 토글 버튼은 숨김
        list.classList.add('expanded');
        if (btn) {
          btn.dataset.disabled = 'true';
          btn.style.display = 'none';
        }
      } else {
        // 필터 꺼짐: 강제 펼침 해제, 토글 버튼 다시 표시
        list.classList.remove('expanded');
        if (btn) {
          btn.dataset.disabled = 'false';
          btn.style.display = '';
          // 버튼 텍스트는 기존 상태 유지 (사용자가 다시 토글)
        }
      }
    });
    // 루트에 상태 클래스(선택) — CSS에서 쓰고 있다면 호환
    root.classList.toggle('filter-active', isFiltered());
  }
 
  function buildChips(){
    const section = activeSection();
    if(!section) return;
    annotatePublications(section);
 
    const { catRow, yearRow, catGroup, yearGroup } = ensureChipContainers();
 
    // 세트 수집
    const years = new Set();
    const cats  = new Set();
 
    section.querySelectorAll('.pub-list li').forEach(li=>{
      if(li.dataset.year) years.add(li.dataset.year);
    });
    section.querySelectorAll('.pub-list').forEach(list=>{
      if(list.dataset.category) cats.add(list.dataset.category.trim());
    });
 
    // Year chips
    yearRow.innerHTML = '';
    yearRow.appendChild(makeChip('전체', 'all', 'data-year', currentYear==='all'));
    [...years].sort((a,b)=>b-a).forEach(y=>{
      yearRow.appendChild(makeChip(y, y, 'data-year', currentYear===y));
    });
    yearGroup.style.display = yearRow.children.length ? '' : 'none';
 
    // Category chips (숫자연도처럼 보이는 레이블 제거 → Past 보호)
    const catArr = [...cats].filter(c => !/^\d{4}/.test(c));
    catRow.innerHTML = '';
    if (catArr.length === 0) {
      catGroup.style.display = 'none';
      currentCat = 'all';
    } else {
      catGroup.style.display = '';
      catRow.appendChild(makeChip('전체', 'all', 'data-category', currentCat==='all'));
      catArr.sort((a,b)=>a.localeCompare(b)).forEach(c=>{
        catRow.appendChild(makeChip(c, c, 'data-category', currentCat===c));
      });
    }
 
    // 이벤트 위임(중복 방지)
    if (!catRow._bound) {
      catRow.addEventListener('click', (e)=>{
        const btn = e.target.closest('.chip');
        if(!btn) return;
        currentCat = btn.getAttribute('data-category') || 'all';
        setRowActive(catRow, 'data-category', currentCat);
        applyFilter();
      });
      catRow._bound = true;
    }
    if (!yearRow._bound) {
      yearRow.addEventListener('click', (e)=>{
        const btn = e.target.closest('.chip');
        if(!btn) return;
        currentYear = btn.getAttribute('data-year') || 'all';
        setRowActive(yearRow, 'data-year', currentYear);
        applyFilter();
      });
      yearRow._bound = true;
    }
  }
 
  function showEl(el, show){
    if(!el) return;
    el.classList.toggle('hidden', !show);
    el.style.display = show ? '' : 'none';
  }
 
  function applyFilter(){
    const section = activeSection();
    if(!section) return;
 
    // 항목 필터
    section.querySelectorAll('.pub-list li').forEach(li=>{
      let show = true;
      if(currentYear !== 'all' && li.dataset.year !== currentYear) show = false;
      if(currentCat  !== 'all' && li.dataset.category !== currentCat) show = false;
      showEl(li, show);
    });
 
    // 비어있는 카테고리 블록 숨김 + 토글 버튼 동기화
    section.querySelectorAll('.pub-list').forEach(list=>{
      const anyVisible = [...list.querySelectorAll('li')].some(li => li.style.display !== 'none' && !li.classList.contains('hidden'));
      showEl(list, anyVisible);
      const header = list.previousElementSibling;
      if(header && header.classList.contains('pub-category')){
        showEl(header, anyVisible);
      }
      const btn = list.nextElementSibling && list.nextElementSibling.classList?.contains('toggle-btn')
        ? list.nextElementSibling
        : null;
      if (btn) btn.style.display = isFiltered() && anyVisible ? 'none' : ''; // 필터 중엔 버튼 숨김
    });
 
    // 토글 상태 최종 동기화
    syncToggleUI(section);
  }
 
  function rebuild(){
    // 필터 초기화
    currentCat = 'all';
    currentYear = 'all';
    buildChips();
    applyFilter(); // 초기엔 필터 off 상태 → 토글 정상 작동
  }
 
  // 초기 진입
  document.addEventListener('DOMContentLoaded', rebuild);
 
  // 외부(탭 전환)에서 호출 가능하도록 노출
  window._pubChipFilter = { rebuild };
})();
 
/* ============================= */
/* Publications 리스트 토글 */
/* ============================= */
function toggleList(button) {
  // 필터가 켜져 있으면 토글 무시 (강제 펼침 유지)
  const main = document.querySelector('.publications-main');
  if (main && main.classList.contains('filter-active')) return;
 
  // 버튼이 숨김/비활성 상태면 무시
  if (button.dataset.disabled === 'true' || button.style.display === 'none') return;
 
  const list = button.previousElementSibling;
  if (!list) return;
  list.classList.toggle('expanded');
  button.textContent = list.classList.contains('expanded') ? 'Show Less' : 'Show More';
}
 
/* ============================= */
/* Activities 모달 */
/* ============================= */
 
// (1) 제목 클릭 → 상세 모달
function openDetailModal(el) {
  const modal = document.getElementById("detailModal");
  document.getElementById("detailTitle").textContent = el.getAttribute("data-title") || "";
  document.getElementById("detailAuthors").textContent = el.getAttribute("data-authors") || "";
  document.getElementById("detailAbstract").textContent = el.getAttribute("data-abstract") || "";
  modal.style.display = "flex";
}
 
// (2) 이미지 클릭 → 단순 이미지 모달
function openImgModal(img) {
  const modal = document.getElementById("imgModal");
  document.getElementById("modalImg").src = img.src;
  modal.style.display = "flex";
}
 
/* ============================= */
/* 헤더 스크롤 시 그림자 효과 */
/* ============================= */
document.addEventListener("scroll", () => {
  const header = document.querySelector(".subpage-header");
  if (header) {
    if (window.scrollY > 0) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
});
 
/* ============================= */
/* 네비게이션 active 상태 자동 반영 */
/* ============================= */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const filename = path.split('/').pop();
 
  const menuMap = {
    'member.html': 'menu-member',
    'publications.html': 'menu-publications',
    'activities.html': 'menu-activities',
    'achievements.html': 'menu-achievements',
    'contact.html': 'menu-contact'
  };
 
  const targetClass = menuMap[filename];
  if (targetClass) {
    const activeLink = document.querySelector(`.${targetClass}`);
    if (activeLink) activeLink.classList.add('active');
  }
});
 
/* ============================= */
/* 맨 위로 이동 버튼 */
/* ============================= */
const backToTopBtn = document.getElementById("backToTop");
 
window.addEventListener("scroll", () => {
  if (window.scrollY > 400) backToTopBtn.style.display = "flex";
  else backToTopBtn.style.display = "none";
});
 
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
 
/* =============================
   Achievements (Awards) 필터
   - 칩(data-type, data-year)로 필터
   - 비어 있는 year-group 자동 숨김
============================= */
(function(){
  const root = document.querySelector('.achievements-main');
  if (!root) return; // 이 페이지가 아니면 종료
 
  let currentType = 'all';
  let currentYear = 'all';
 
  const typeChips = root.querySelectorAll('#typeChips .chip');
  const yearChips = root.querySelectorAll('#yearChips .chip');
 
  function setPressed(chips, attr, value){
    chips.forEach(btn=>{
      const v = btn.getAttribute(attr);
      const active = v === value;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.classList.toggle('active', active);
    });
  }
 
  function filterAwards(){
    // 항목 표시/숨김
    root.querySelectorAll('.award-item').forEach(li=>{
      const ty = li.dataset.type || '';
      const yr = li.dataset.year || '';
      const show =
        (currentType === 'all' || ty === currentType) &&
        (currentYear === 'all' || yr === currentYear);
      li.classList.toggle('hidden', !show);
      li.style.display = show ? '' : 'none';
    });
 
    // 비어 있는 연도 그룹 숨김
    root.querySelectorAll('.year-group').forEach(group=>{
      const hasVisible = [...group.querySelectorAll('.award-item')].some(li => li.style.display !== 'none' && !li.classList.contains('hidden'));
      group.classList.toggle('hidden', !hasVisible);
      group.style.display = hasVisible ? '' : 'none';
    });
  }
 
  // 이벤트 바인딩
  typeChips.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentType = btn.dataset.type || 'all';
      setPressed(typeChips, 'data-type', currentType);
      filterAwards();
    });
  });
 
  yearChips.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentYear = btn.dataset.year || 'all';
      setPressed(yearChips, 'data-year', currentYear);
      filterAwards();
    });
  });
 
  // 초기 상태(aria-pressed="true"를 기본값으로 읽음)
  const initType = [...typeChips].find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.type || 'all';
  const initYear = [...yearChips].find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.year || 'all';
  currentType = initType; currentYear = initYear;
  setPressed(typeChips, 'data-type', currentType);
  setPressed(yearChips, 'data-year', currentYear);
  filterAwards();
})();
 
 
/* =====================================================
   MEMBER MODAL — fetch 자동 파싱 버전
   publications.html / activities.html / achievements.html
   을 직접 읽어서 데이터를 추출합니다.
   실적 업데이트 시 각 HTML 파일만 수정하면 됩니다.
   ===================================================== */
 
/* ── 멤버 정의
   aliases: 각 HTML 파일 authors 텍스트에 실제로 등장하는
   영문명 표기만 등록합니다. (member.html 영문명 기준)
   새 표기가 생기면 aliases 배열에만 추가하세요.          ── */
const HED_MEMBERS = {
  "김유진": { en: "Yu Jin Kim",     role: "Ph.D. Student · Lab Leader", aliases: ["yu jin kim",    "yujin kim"]    },
  "이주영": { en: "Ju Young Lee",   role: "Ph.D. Student",               aliases: ["ju young lee",  "juyoung lee"]  },
  "남승희": { en: "Seung Hee Nam",  role: "Master's Student",            aliases: ["seung hee nam", "seunghee nam"] },
  "류혜수": { en: "Hea Soo Ryu",    role: "Master's Student",            aliases: ["hea soo ryu",   "heasoo ryu"]   },
  "신은아": { en: "Eun A Shin",     role: "Master's Student",            aliases: ["eun a shin",    "euna shin"]    },
  "최주하": { en: "Ju Ha Choi",     role: "Master's Student",            aliases: ["ju ha choi",    "juha choi"]    },
  "민서영": { en: "Seo Young Min",  role: "Master's Student",            aliases: ["seo young min", "seoyoung min"] },
  "오다혜": { en: "Da Hye Oh",      role: "Master's Student",            aliases: ["da hye oh",     "dahye oh"]     },
  "이민경": { en: "Min Kyung Lee",  role: "Master's Student",            aliases: ["min kyung lee", "minkyung lee"] },
  "홍준수": { en: "June Soo Hong",  role: "Master's Student",            aliases: ["june soo hong", "junesoo hong"] },
};
 
/* ── 정규화: 소문자 + 공백 제거 ── */
function hedNorm(s) {
  return s.toLowerCase().replace(/\s+/g, "");
}
 
/* ── 영문 authors 텍스트 매칭 ── */
function hedMatch(authorsStr, korName) {
  const member = HED_MEMBERS[korName];
  if (!member) return false;
  const aliasSet = new Set(member.aliases.map(hedNorm));
  const namePart = authorsStr.split("(")[0]; // 연도·저널 이전까지
  return namePart.split(",").some(t => aliasSet.has(hedNorm(t.trim())));
}
 
/* ── 한글 authors 텍스트 매칭 (Achievements용) ── */
function hedMatchKor(authorsStr, korName) {
  return authorsStr.split(",").map(s => s.trim()).includes(korName);
}
 
/* ── HTML 파일 fetch + 파싱 캐시 ── */
const HED_CACHE = {};
async function hedFetch(path) {
  if (HED_CACHE[path]) return HED_CACHE[path];
  const res  = await fetch(path);
  const text = await res.text();
  const doc  = new DOMParser().parseFromString(text, "text/html");
  HED_CACHE[path] = doc;
  return doc;
}
 
/* ── publications.html 파싱 ── */
async function hedParsePubs() {
  const doc   = await hedFetch("publications.html");
  const items = [];
 
  doc.querySelectorAll(".pub-list li").forEach(li => {
    const authorEl = li.querySelector(".authors");
    if (!authorEl) return;
    const authors   = authorEl.textContent.trim();
    const title     = (li.querySelector("a")?.textContent || li.childNodes[0]?.textContent || "").trim();
    const yearMatch = authors.match(/\((20\d{2}|19\d{2})\)/);
    const year      = yearMatch ? parseInt(yearMatch[1]) : 0;
    if (title && authors) items.push({ title, authors, year });
  });
 
  return items;
}
 
/* ── activities.html 파싱 (conferences + exhibitions 모두) ── */
async function hedParseActs() {
  const doc   = await hedFetch("activities.html");
  const items = [];
 
  /* conferences 섹션 */
  const confSection = doc.getElementById("conferences");
  if (confSection) {
    let currentYear  = 0;
    let currentVenue = "";
 
    confSection.childNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.tagName === "H3") {
        currentYear = parseInt(node.textContent.trim()) || currentYear;
        return;
      }
      if (node.classList?.contains("conf-category")) {
        currentVenue = node.textContent.replace(/\[|\]/g, "").trim();
        return;
      }
      if (node.tagName === "UL") {
        node.querySelectorAll("li").forEach(li => {
          const titleEl  = li.querySelector(".title-link") || li.querySelector("strong.title-text");
          const authorEl = li.querySelector(".authors");
          if (!authorEl) return;
          const title   = (titleEl?.textContent || titleEl?.getAttribute("data-title") || "").trim();
          const authors = authorEl.textContent.trim();
          if (title && authors) items.push({ title, authors, year: currentYear, venue: currentVenue, type: "conference" });
        });
      }
    });
  }
 
  /* exhibitions 섹션 */
  const exhSection = doc.getElementById("exhibitions");
  if (exhSection) {
    let currentYear  = 0;
    let currentVenue = "";
 
    exhSection.childNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.tagName === "H3") {
        currentYear = parseInt(node.textContent.trim()) || currentYear;
        return;
      }
      if (node.classList?.contains("conf-category")) {
        currentVenue = node.textContent.replace(/\[|\]/g, "").trim();
        return;
      }
      if (node.tagName === "UL") {
        node.querySelectorAll("li").forEach(li => {
          const titleEl  = li.querySelector("strong.title-text");
          const authorEl = li.querySelector(".authors");
          if (!titleEl || !authorEl) return;
          const title   = titleEl.textContent.trim();
          const authors = authorEl.textContent.trim();
          if (title && authors) items.push({ title, authors, year: currentYear, venue: currentVenue, type: "exhibition" });
        });
      }
    });
  }
 
  return items;
}
 
/* ── achievements.html 파싱 ── */
async function hedParseAchv() {
  const doc   = await hedFetch("achievements.html");
  const items = [];
 
  doc.querySelectorAll(".award-item").forEach(item => {
    const badgeEl = item.querySelector(".badge");
    const titleEl = item.querySelector(".title");
    const authEl  = item.querySelector(".authors");
    const venueEl = item.querySelector(".venue");
    const year    = parseInt(item.dataset.year) || 0;
    if (!authEl) return;
    items.push({
      type:    badgeEl?.textContent.trim() || "",
      title:   titleEl?.textContent.trim() || "",
      authors: authEl.textContent.trim(),
      venue:   venueEl?.textContent.trim() || "",
      year,
    });
  });
 
  return items;
}
 
/* ── 연도별 그룹핑 ── */
function hedGroupByYear(items) {
  const m = {};
  items.forEach(it => { (m[it.year] = m[it.year] || []).push(it); });
  return Object.keys(m).sort((a, b) => b - a).map(y => ({ year: y, items: m[y] }));
}
 
/* ── 렌더 함수 ── */
function hedRenderPubs(items) {
  const el = document.getElementById("panel-pubs");
  if (!items.length) { el.innerHTML = '<p class="hed-empty">등록된 논문이 없습니다.</p>'; return; }
  el.innerHTML = hedGroupByYear(items).map(g => `
    <div class="hed-year">${g.year}</div>
    ${g.items.map(p => `
      <div class="hed-pub">
        <div class="hed-pub-title">${p.title}</div>
        <div class="hed-pub-meta">${p.authors}</div>
      </div>`).join("")}
  `).join("");
}
 
function hedRenderActs(items) {
  const el = document.getElementById("panel-acts");
  if (!items.length) { el.innerHTML = '<p class="hed-empty">등록된 국제학술활동이 없습니다.</p>'; return; }
  el.innerHTML = hedGroupByYear(items).map(g => `
    <div class="hed-year">${g.year}</div>
    ${g.items.map(a => `
      <div class="hed-act">
        <span class="hed-act-venue">${a.venue}</span>
        <div class="hed-act-title">${a.title}</div>
        <div class="hed-act-authors">${a.authors}</div>
      </div>`).join("")}
  `).join("");
}
 
function hedRenderAchv(items) {
  const el = document.getElementById("panel-achv");
  if (!items.length) { el.innerHTML = '<p class="hed-empty">등록된 수상 실적이 없습니다.</p>'; return; }
  el.innerHTML = hedGroupByYear(items).map(g => `
    <div class="hed-year">${g.year}</div>
    ${g.items.map(a => `
      <div class="hed-achv">
        <span class="hed-achv-badge">${a.type}</span>
        <div>
          <div class="hed-achv-title">${a.title}</div>
          <div class="hed-achv-meta">${a.authors}${a.venue ? " · " + a.venue : ""}</div>
        </div>
      </div>`).join("")}
  `).join("");
}
 
/* ── 모달 열기 ── */
async function openModal(korName) {
  const info = HED_MEMBERS[korName] || { en: korName, role: "연구원" };
  document.getElementById("mName").textContent = korName + " | " + info.en;
  document.getElementById("mRole").textContent = info.role;
 
  // 로딩 표시
  ["panel-pubs", "panel-acts", "panel-achv"].forEach(id => {
    document.getElementById(id).innerHTML = '<p class="hed-empty">불러오는 중...</p>';
  });
  document.getElementById("hedOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
 
  // 탭 초기화
  document.querySelectorAll(".hed-modal-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".hed-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".hed-modal-tab")[0].classList.add("active");
  document.getElementById("panel-pubs").classList.add("active");
 
  // 세 파일 동시 fetch
  const [allPubs, allActs, allAchv] = await Promise.all([
    hedParsePubs(),
    hedParseActs(),
    hedParseAchv(),
  ]);
 
  const pubs = allPubs.filter(p => hedMatch(p.authors, korName));
  const acts = allActs.filter(a => hedMatch(a.authors, korName));
  const achv = allAchv.filter(a => hedMatchKor(a.authors, korName));
 
  document.getElementById("cntPubs").textContent = pubs.length;
  document.getElementById("cntActs").textContent = acts.length;
  document.getElementById("cntAchv").textContent = achv.length;
 
  hedRenderPubs(pubs);
  hedRenderActs(acts);
  hedRenderAchv(achv);
}
 
/* ── 모달 닫기
   id 있으면 → activities/img 모달 (기존 동작 유지)
   id 없으면 → 멤버 모달                              ── */
function closeModal(id) {
  if (id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
    return;
  }
  document.getElementById("hedOverlay").classList.remove("open");
  document.body.style.overflow = "";
}
 
function handleOverlayClick(e) {
  if (e.target === document.getElementById("hedOverlay")) closeModal();
}
 
/* ── 모달 탭 전환 (기존 switchTab과 이름 구분) ── */
function hedSwitchTab(key, btn) {
  document.querySelectorAll(".hed-modal-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".hed-panel").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("panel-" + key).classList.add("active");
}
 
/* ── ESC 닫기 ── */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});