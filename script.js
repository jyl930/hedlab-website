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
    const label = (cat.textContent || '').replace(/\[|\]/g,'').trim();
    const list = cat.nextElementSibling;
    if(!list || !list.classList.contains('pub-list')) return;

    list.dataset.category = label;
    list.querySelectorAll('li').forEach(li => {
      li.dataset.category = label;
      const authorTxt = li.querySelector('.authors')?.textContent || '';
      const m = authorTxt.match(/\((20\d{2}|19\d{2})\)/);
      if(m) li.dataset.year = m[1];
    });
  });
}

/* =============================
   Publications: 칩 필터 모듈 (Category + Year)
============================= */
(function(){
  const root = document.querySelector('.publicitions-main, .publications-main');
  if (!root) return;

  let currentCat  = 'all';
  let currentYear = 'all';

  function activeSection(){
    return document.querySelector('.publications-section.active');
  }

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

    let heading = sidebar.querySelector('#pubFiltersTitle');
    if (!heading) {
      heading = document.createElement('h2');
      heading.id = 'pubFiltersTitle';
      heading.textContent = 'Publications Filters';
    }

    const filters = document.createElement('div');
    filters.className = 'pub-filters';
    filters.setAttribute('aria-label', 'Filter publications');

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

  function syncToggleUI(section){
    section.querySelectorAll('.toggle-container').forEach(list=>{
      const btn = list.nextElementSibling && list.nextElementSibling.classList?.contains('toggle-btn')
        ? list.nextElementSibling
        : null;

      if (isFiltered()) {
        list.classList.add('expanded');
        if (btn) {
          btn.dataset.disabled = 'true';
          btn.style.display = 'none';
        }
      } else {
        list.classList.remove('expanded');
        if (btn) {
          btn.dataset.disabled = 'false';
          btn.style.display = '';
        }
      }
    });

    root.classList.toggle('filter-active', isFiltered());
  }

  function buildChips(){
    const section = activeSection();
    if(!section) return;
    annotatePublications(section);

    const { catRow, yearRow, catGroup, yearGroup } = ensureChipContainers();

    const years = new Set();
    const cats  = new Set();

    section.querySelectorAll('.pub-list li').forEach(li=>{
      if(li.dataset.year) years.add(li.dataset.year);
    });

    section.querySelectorAll('.pub-list').forEach(list=>{
      if(list.dataset.category) cats.add(list.dataset.category.trim());
    });

    yearRow.innerHTML = '';
    yearRow.appendChild(makeChip('전체', 'all', 'data-year', currentYear==='all'));
    [...years].sort((a,b)=>b-a).forEach(y=>{
      yearRow.appendChild(makeChip(y, y, 'data-year', currentYear===y));
    });
    yearGroup.style.display = yearRow.children.length ? '' : 'none';

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

    section.querySelectorAll('.pub-list li').forEach(li=>{
      let show = true;
      if(currentYear !== 'all' && li.dataset.year !== currentYear) show = false;
      if(currentCat  !== 'all' && li.dataset.category !== currentCat) show = false;
      showEl(li, show);
    });

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

      if (btn) btn.style.display = isFiltered() && anyVisible ? 'none' : '';
    });

    syncToggleUI(section);
  }

  function rebuild(){
    currentCat = 'all';
    currentYear = 'all';
    buildChips();
    applyFilter();
  }

  document.addEventListener('DOMContentLoaded', rebuild);

  window._pubChipFilter = { rebuild };
})();

/* ============================= */
/* Publications 리스트 토글 */
/* ============================= */
function toggleList(button) {
  const main = document.querySelector('.publications-main');
  if (main && main.classList.contains('filter-active')) return;

  if (button.dataset.disabled === 'true' || button.style.display === 'none') return;

  const list = button.previousElementSibling;
  if (!list) return;
  list.classList.toggle('expanded');
  button.textContent = list.classList.contains('expanded') ? 'Show Less' : 'Show More';
}

/* ============================= */
/* Activities 모달 */
/* ============================= */
function openDetailModal(el) {
  const modal = document.getElementById("detailModal");
  document.getElementById("detailTitle").textContent = el.getAttribute("data-title") || "";
  document.getElementById("detailAuthors").textContent = el.getAttribute("data-authors") || "";
  document.getElementById("detailAbstract").textContent = el.getAttribute("data-abstract") || "";
  modal.style.display = "flex";
}

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

if (backToTopBtn) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) backToTopBtn.style.display = "flex";
    else backToTopBtn.style.display = "none";
  });

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* =============================
   Achievements (Awards) 필터
============================= */
(function(){
  const root = document.querySelector('.achievements-main');
  if (!root) return;

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
    root.querySelectorAll('.award-item').forEach(li=>{
      const ty = li.dataset.type || '';
      const yr = li.dataset.year || '';
      const show =
        (currentType === 'all' || ty === currentType) &&
        (currentYear === 'all' || yr === currentYear);
      li.classList.toggle('hidden', !show);
      li.style.display = show ? '' : 'none';
    });

    root.querySelectorAll('.year-group').forEach(group=>{
      const hasVisible = [...group.querySelectorAll('.award-item')].some(li => li.style.display !== 'none' && !li.classList.contains('hidden'));
      group.classList.toggle('hidden', !hasVisible);
      group.style.display = hasVisible ? '' : 'none';
    });
  }

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

  const initType = [...typeChips].find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.type || 'all';
  const initYear = [...yearChips].find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.year || 'all';

  currentType = initType;
  currentYear = initYear;

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
   새 표기가 생기면 aliases 배열에만 추가하세요.
   period: 개인 카드 상단에 표시되는 연구실 소속 기간입니다.
   ── */
const HED_MEMBERS = {
  "김유진": { en: "Yu Jin Kim",     role: "Ph.D. Student · Lab Leader", period: "2022.03 – Present", aliases: ["yu jin kim",    "yujin kim"]    },
  "이주영": { en: "Ju Young Lee",   role: "Ph.D. Student",              period: "2024.03 – Present", aliases: ["ju young lee",  "juyoung lee"]  },
  "남승희": { en: "Seung Hee Nam",  role: "Master's Student",           period: "2022.03 – Present", aliases: ["seung hee nam", "seunghee nam"] },
  "류혜수": { en: "Hea Soo Ryu",    role: "Master's Student",           period: "2024.03 – Present", aliases: ["hea soo ryu",   "heasoo ryu"]   },
  "신은아": { en: "Eun A Shin",     role: "Master's Student",           period: "2025.03 – Present", aliases: ["eun a shin",    "euna shin"]    },
  "최주하": { en: "Ju Ha Choi",     role: "Master's Student",           period: "2025.09 – Present", aliases: ["ju ha choi",    "juha choi"]    },
  "민서영": { en: "Seo Young Min",  role: "Master's Student",           period: "2026.03 – Present", aliases: ["seo young min", "seoyoung min"] },
  "오다혜": { en: "Da Hye Oh",      role: "Master's Student",           period: "2026.03 – Present", aliases: ["da hye oh",     "dahye oh"]     },
  "이민경": { en: "Min Kyung Lee",  role: "Master's Student",           period: "2026.03 – Present", aliases: ["min kyung lee", "minkyung lee"] },
  "홍준수": { en: "June Soo Hong",  role: "Master's Student",           period: "2026.03 – Present", aliases: ["june soo hong", "junesoo hong"] },
};

/* =====================================================
   개인 단독 실적 — 홈페이지 미등재, 모달에만 표시
   추가 시: authors에 member.html 영문명 그대로 작성
   Achievements는 authors에 한글 이름 작성
   ===================================================== */
const PERSONAL_PUBS = [
  // 예: { title: "제목", authors: "Ju Young Lee(2025), 저널명", year: 2025 },
];

const PERSONAL_ACTS = [
  // ── 김유진 ──
  { title: "Daily life in the sea",
    authors: "Yujin Kim, Sumin Kim, Suah Kim, Soongak Jang",
    year: 2022, venue: "2022 Tokyo life style week, Tokyo, Japan" },

  // ── 김유진, 이주영 공동 ──
  { title: "RE-TUNE : ON, PLAY, PAUSE, STOP, OFF",
    authors: "Yujin Kim, Juyoung Lee, Youlim Hwang, Namhoon Jeong, Soongak Jang",
    year: 2025, venue: "2025 Stockholm Furniture Fair, Stockholm, Sweden" },

  // ── 이주영, 신은아 공동 ──
  { title: "Shell to Shell",
    authors: "Juyoung Lee, Euna Shin, Soongak Jang",
    year: 2026, venue: "GREEN MATERIAL Tokyo 2026, Tokyo, Japan" },
];

const PERSONAL_ACHV = [
  // 예: { type: "우수논문발표상", authors: "이주영", title: "제목", venue: "학회명", year: 2025 },
];

/* ── 정규화: 소문자 + 공백 제거 ── */
function hedNorm(s) {
  return s.toLowerCase().replace(/\s+/g, "");
}

/* ── 영문 authors 텍스트 매칭 ── */
function hedMatch(authorsStr, korName) {
  const member = HED_MEMBERS[korName];
  if (!member) return false;

  const aliasSet = new Set(member.aliases.map(hedNorm));
  const namePart = authorsStr.split("(")[0];

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

  function findPreceding(startEl, selector) {
    let el = startEl;

    while (el) {
      let sib = el.previousElementSibling;

      while (sib) {
        if (sib.matches(selector)) return sib;

        const inner = sib.querySelector(selector);
        if (inner) return inner;

        sib = sib.previousElementSibling;
      }

      el = el.parentElement;
      if (!el || el.matches('section, body, html')) break;
    }

    return null;
  }

  function parseSection(sectionId, titleSelector) {
    const section = doc.getElementById(sectionId);
    if (!section) return;

    section.querySelectorAll("li").forEach(li => {
      const authorEl = li.querySelector(".authors");
      if (!authorEl) return;

      const titleEl = li.querySelector(titleSelector);
      if (!titleEl) return;

      const title   = (titleEl.textContent || titleEl.getAttribute?.("data-title") || "").trim();
      const authors = authorEl.textContent.trim();

      if (!title || !authors) return;

      const catEl = findPreceding(li, ".conf-category");
      const venue = catEl ? catEl.textContent.replace(/[\[\]]/g, "").trim() : "";

      const h3El = findPreceding(li, "h3");
      const year = h3El ? parseInt(h3El.textContent.trim()) || 0 : 0;

      items.push({ title, authors, year, venue });
    });
  }

  parseSection("conferences", ".title-link, strong.title-text");
  parseSection("exhibitions",  "strong.title-text");

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

  items.forEach(it => {
    (m[it.year] = m[it.year] || []).push(it);
  });

  return Object.keys(m)
    .sort((a, b) => b - a)
    .map(y => ({ year: y, items: m[y] }));
}

/* ── 렌더 함수 ── */
function hedRenderPubs(items) {
  const el = document.getElementById("panel-pubs");
  if (!el) return;

  if (!items.length) {
    el.innerHTML = '<p class="hed-empty">등록된 논문이 없습니다.</p>';
    return;
  }

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
  if (!el) return;

  if (!items.length) {
    el.innerHTML = '<p class="hed-empty">등록된 국제학술활동이 없습니다.</p>';
    return;
  }

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
  if (!el) return;

  if (!items.length) {
    el.innerHTML = '<p class="hed-empty">등록된 수상 실적이 없습니다.</p>';
    return;
  }

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
async function openModal(korName, triggerEl) {
  const info = HED_MEMBERS[korName] || { en: korName, role: "Researcher", period: "" };

  const role = triggerEl?.dataset.role || info.role || "Researcher";
  const period = triggerEl?.dataset.period || info.period || "";
  const roleText = period ? `${role} · ${period}` : role;

  const mName = document.getElementById("mName");
  const mRole = document.getElementById("mRole");

  if (mName) mName.textContent = korName + " | " + info.en;
  if (mRole) mRole.textContent = roleText;

  ["panel-pubs", "panel-acts", "panel-achv"].forEach(id => {
    const panel = document.getElementById(id);
    if (panel) panel.innerHTML = '<p class="hed-empty">불러오는 중...</p>';
  });

  const overlay = document.getElementById("hedOverlay");
  if (overlay) overlay.classList.add("open");
  document.body.style.overflow = "hidden";

  document.querySelectorAll(".hed-modal-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".hed-panel").forEach(p => p.classList.remove("active"));

  const firstTab = document.querySelectorAll(".hed-modal-tab")[0];
  const pubsPanel = document.getElementById("panel-pubs");

  if (firstTab) firstTab.classList.add("active");
  if (pubsPanel) pubsPanel.classList.add("active");

  const [allPubs, allActs, allAchv] = await Promise.all([
    hedParsePubs(),
    hedParseActs(),
    hedParseAchv(),
  ]);

  const pubs = [
    ...allPubs.filter(p => hedMatch(p.authors, korName)),
    ...PERSONAL_PUBS.filter(p => hedMatch(p.authors, korName)),
  ];

  const acts = [
    ...allActs.filter(a => hedMatch(a.authors, korName)),
    ...PERSONAL_ACTS.filter(a => hedMatch(a.authors, korName)),
  ];

  const achv = [
    ...allAchv.filter(a => hedMatchKor(a.authors, korName)),
    ...PERSONAL_ACHV.filter(a => hedMatchKor(a.authors, korName)),
  ];

  const cntPubs = document.getElementById("cntPubs");
  const cntActs = document.getElementById("cntActs");
  const cntAchv = document.getElementById("cntAchv");

  if (cntPubs) cntPubs.textContent = pubs.length;
  if (cntActs) cntActs.textContent = acts.length;
  if (cntAchv) cntAchv.textContent = achv.length;

  hedRenderPubs(pubs);
  hedRenderActs(acts);
  hedRenderAchv(achv);
}

/* ── 모달 닫기
   id 있으면 → activities/img 모달
   id 없으면 → 멤버 모달
── */
function closeModal(id) {
  if (id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
    return;
  }

  const overlay = document.getElementById("hedOverlay");
  if (overlay) overlay.classList.remove("open");

  document.body.style.overflow = "";
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById("hedOverlay")) closeModal();
}

/* ── 모달 탭 전환 ── */
function hedSwitchTab(key, btn) {
  document.querySelectorAll(".hed-modal-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".hed-panel").forEach(p => p.classList.remove("active"));

  btn.classList.add("active");

  const panel = document.getElementById("panel-" + key);
  if (panel) panel.classList.add("active");
}

/* ── ESC 닫기 ── */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});