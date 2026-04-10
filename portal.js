// ============================================================
//  HMBG Member Portal — portal.js
//  Firebase Auth (Google) + Firestore
//  Roles: pending | member | leader | executive
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, query, where, orderBy, getDocs,
  addDoc, serverTimestamp, deleteDoc, onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

// ── FIREBASE CONFIG ──
const firebaseConfig = {
  apiKey: "AIzaSyCSEv72UaRDe1WAkufvdiu-BErUbEVcNBA",
  authDomain: "hmbg-portal.firebaseapp.com",
  projectId: "hmbg-portal",
  storageBucket: "hmbg-portal.firebasestorage.app",
  messagingSenderId: "420999050290",
  appId: "1:420999050290:web:0393f5b6726ded719ff82b",
  measurementId: "G-24TXXDWBSF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── STATE ──
let currentUser    = null; // Firebase Auth user
let currentProfile = null; // Firestore user doc
let currentTeam    = null; // Firestore team doc
let allTeams       = [];   // 팀 목록
let currentFeedView = 'all'; // 'all' | 'team'
let feedUnsubscribe = null;
let currentEditId   = null; // null = 새 제출 | string = 수정 중인 제출 ID

// ── DOM REFS ──
const screens = {
  login:   document.getElementById('screen-login'),
  pending: document.getElementById('screen-pending'),
  portal:  document.getElementById('screen-portal'),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SCREEN MANAGER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   TOAST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let toastTimer;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   AUTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-google-login').addEventListener('click', async () => {
  const err = document.getElementById('login-error');
  err.hidden = true;
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (e) {
    err.hidden = false;
    err.textContent = '로그인 실패: ' + (e.message || '다시 시도해주세요.');
  }
});

['btn-logout-pending', 'btn-logout-portal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', async () => {
    if (feedUnsubscribe) feedUnsubscribe();
    await signOut(auth);
  });
});

// ── AUTH STATE LISTENER ──
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null; currentProfile = null; currentTeam = null;
    showScreen('login');
    return;
  }
  currentUser = user;

  // Firestore 사용자 문서 확인/생성
  const userRef = doc(db, 'users', user.uid);
  let snap = await getDoc(userRef);

  if (!snap.exists()) {
    // 최초 로그인 → pending 상태로 생성
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: 'pending',
      teamId: null,
      createdAt: serverTimestamp(),
    });
    snap = await getDoc(userRef);
  }

  currentProfile = snap.data();

  if (currentProfile.role === 'pending') {
    document.getElementById('pending-user-email').textContent = user.email;
    showScreen('pending');
    return;
  }

  // 승인된 회원 → 포털 진입
  await loadPortal();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   PORTAL INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function loadPortal() {
  showScreen('portal');

  // Nav user info
  const navAvatar = document.getElementById('portal-user-avatar');
  const photoUrl  = currentProfile.customPhotoURL || currentUser.photoURL || '';
  navAvatar.src   = photoUrl;
  navAvatar.alt   = currentUser.displayName || '프로필';
  document.getElementById('portal-user-name').textContent = currentProfile.displayName || currentUser.displayName || '회원';
  document.getElementById('portal-user-role').textContent = roleLabel(currentProfile.role);

  // 권한별 패널 표시
  const isExec   = currentProfile.role === 'executive';
  const isLeader = currentProfile.role === 'leader';
  document.getElementById('sidebar-admin-card').hidden  = !isExec;
  document.getElementById('sidebar-leader-card').hidden = !(isLeader && !isExec);

  // 팀 목록 로드
  allTeams = await loadAllTeams();

  // 내 팀 정보
  await loadMyTeamSidebar();

  // 사이드바 프로필 초기화
  updateSidebarProfile();

  // 피드 초기 로드
  setupFeedListeners();
  initWeekSelect();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   TEAMS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function loadAllTeams() {
  const snap = await getDocs(collection(db, 'teams'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadMyTeamSidebar() {
  const teamNameEl    = document.getElementById('sidebar-team-name');
  const teamBadgeEl   = document.getElementById('sidebar-team-badge');
  const teamMembersEl = document.getElementById('sidebar-team-members');

  if (!currentProfile.teamId) {
    teamNameEl.textContent  = '팀 미배정';
    teamBadgeEl.textContent = '-';
    teamMembersEl.innerHTML = '';
    currentTeam = null;
    return;
  }

  const teamDoc = await getDoc(doc(db, 'teams', currentProfile.teamId));
  if (!teamDoc.exists()) return;
  currentTeam = { id: teamDoc.id, ...teamDoc.data() };

  const abbr = currentTeam.name.slice(0, 3).toUpperCase();
  teamBadgeEl.textContent = abbr;
  teamNameEl.textContent  = currentTeam.name;

  // 팀원 목록
  const membersSnap = await getDocs(
    query(collection(db, 'users'), where('teamId', '==', currentProfile.teamId))
  );
  teamMembersEl.innerHTML = '';
  membersSnap.forEach(d => {
    const m   = d.data();
    const row = document.createElement('div');
    row.className = `sidebar-member-row${m.role === 'leader' ? ' sidebar-member-leader' : ''}`;
    row.innerHTML = `<div class="sidebar-member-dot"></div><span>${m.displayName || m.email}${m.uid === currentUser.uid ? ' (나)' : ''}${m.role === 'leader' ? ' ⭐' : ''}</span>`;
    teamMembersEl.appendChild(row);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   FEED — REAL-TIME LISTENER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function setupFeedListeners() {
  const isExec = currentProfile.role === 'executive';

  // View toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFeedView = btn.dataset.view;
      loadFeed();
    });
  });

  // 내 팀 뷰 비활성화 조건
  const viewTeamBtn = document.getElementById('view-my-team');
  if (!currentProfile.teamId) {
    viewTeamBtn.disabled = true;
    viewTeamBtn.title    = '팀에 배정된 후 사용 가능합니다';
  }

  loadFeed();
}

async function loadFeed() {
  const loading  = document.getElementById('feed-loading');
  const empty    = document.getElementById('feed-empty');
  const timeline = document.getElementById('feed-timeline');

  loading.style.display  = 'flex';
  empty.hidden           = true;
  timeline.innerHTML     = '';

  if (feedUnsubscribe) feedUnsubscribe();

  const isExec = currentProfile.role === 'executive';
  let q;

  if (currentFeedView === 'team' && currentProfile.teamId) {
    // 내 팀 피드
    q = query(
      collection(db, 'submissions'),
      where('teamId', '==', currentProfile.teamId),
      orderBy('createdAt', 'desc')
    );
  } else if (isExec) {
    // 임원진: 전체 피드
    q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
  } else {
    // 일반회원: 자기 팀 + 자신의 글만
    if (!currentProfile.teamId) {
      q = query(
        collection(db, 'submissions'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'submissions'),
        where('teamId', '==', currentProfile.teamId),
        orderBy('createdAt', 'desc')
      );
    }
  }

  feedUnsubscribe = onSnapshot(q, (snap) => {
    loading.style.display = 'none';
    timeline.innerHTML  = '';

    if (snap.empty) {
      empty.hidden = false;
      return;
    }

    // 주차별로 그룹핑
    const grouped = {};
    snap.forEach(d => {
      const data = d.data();
      const key  = data.weekLabel || '미분류';
      if (!grouped[key]) grouped[key] = { label: key, order: data.weekOrder || 0, items: [] };
      grouped[key].items.push({ id: d.id, ...data });
    });

    // 주차 역순 정렬
    const sorted = Object.values(grouped).sort((a, b) => b.order - a.order);
    sorted.forEach(group => renderWeekGroup(group, timeline));
  }, (err) => {
    console.error('Feed error:', err);
    loading.style.display = 'none';
    showToast('피드를 불러오는 중 오류가 발생했습니다.', 'error');
  });
}

// ── WEEK GROUP RENDER ──
function renderWeekGroup(group, container) {
  const section = document.createElement('div');
  section.className = 'week-group';
  section.setAttribute('role', 'listitem');

  section.innerHTML = `
    <div class="week-header">
      <div class="week-label">${escapeHtml(group.label)}</div>
      <div class="week-divider"></div>
      <div class="week-count">${group.items.length}개 제출</div>
    </div>
    <div class="week-submissions"></div>
  `;

  const submissionsEl = section.querySelector('.week-submissions');
  group.items.forEach(item => submissionsEl.appendChild(renderSubmissionCard(item)));

  container.appendChild(section);
}

// ── SUBMISSION CARD RENDER ──
function renderSubmissionCard(item) {
  const card = document.createElement('article');
  card.className = 'submission-card';

  const avatarHtml = item.userPhotoURL
    ? `<img src="${escapeHtml(item.userPhotoURL)}" alt="${escapeHtml(item.userName)}" class="submission-avatar" loading="lazy" />`
    : `<div class="submission-avatar-fallback">${(item.userName || '?')[0]}</div>`;

  const teamBadge = item.teamName
    ? `<span class="submission-team-badge">${escapeHtml(item.teamName)}</span>`
    : '';

  const descHtml = item.description
    ? `<p class="submission-desc">${escapeHtml(item.description)}</p>`
    : '';

  const linksHtml = (item.links || []).map(l => `
    <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="submission-link">
      <span class="link-icon">${linkIcon(l.type)}</span>
      ${escapeHtml(l.label || l.type)}
    </a>
  `).join('');

  const timeStr = item.createdAt?.toDate
    ? formatDate(item.createdAt.toDate())
    : '';

  const canEdit = currentUser?.uid === item.userId || currentProfile?.role === 'executive';
  const actionsHtml = canEdit ? `
    <div class="submission-actions">
      <button type="button" class="btn-edit-submission" aria-label="수정">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        수정
      </button>
      <button type="button" class="btn-delete-submission" aria-label="삭제">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        삭제
      </button>
    </div>
  ` : '';

  card.innerHTML = `
    <div class="submission-header">
      ${avatarHtml}
      <div class="submission-meta">
        <div class="submission-author">${escapeHtml(item.userName || '알 수 없음')}</div>
        <div class="submission-time">${timeStr}</div>
      </div>
      ${teamBadge}
    </div>
    <div class="submission-title">${escapeHtml(item.title)}</div>
    ${descHtml}
    ${linksHtml ? `<div class="submission-links">${linksHtml}</div>` : ''}
    ${actionsHtml}
  `;

  if (canEdit) {
    card.querySelector('.btn-edit-submission')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(item);
    });
    card.querySelector('.btn-delete-submission')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteSubmission(item.id, item.title);
    });
  }

  return card;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SUBMIT MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initWeekSelect() {
  const sel = document.getElementById('submit-week');
  sel.innerHTML = '<option value="">주차를 선택하세요</option>';

  // 현재 날짜 기준 최근 8주 생성
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);

    const year  = d.getFullYear();
    const month = d.getMonth() + 1;
    // 해당 월의 몇 번째 주인지 계산
    const firstDay = new Date(year, d.getMonth(), 1);
    const weekNum  = Math.ceil((d.getDate() + firstDay.getDay()) / 7);
    const label    = `${year}년 ${month}월 ${weekNum}주차`;
    // 정렬용 순서 값 (연월주 숫자)
    const order = year * 10000 + month * 100 + weekNum;

    const opt = document.createElement('option');
    opt.value          = JSON.stringify({ label, order });
    opt.textContent    = label;
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  }
}

document.getElementById('btn-open-submit').addEventListener('click', () => openNewSubmitModal());
document.getElementById('btn-close-submit').addEventListener('click', () => resetSubmitModal());
document.getElementById('btn-cancel-submit').addEventListener('click', () => resetSubmitModal());

// Textarea char count
document.getElementById('submit-desc').addEventListener('input', function () {
  document.getElementById('desc-char-count').textContent = `${this.value.length} / 500`;
});

// Link management — btn-add-link uses addLinkRow helper
document.getElementById('btn-add-link').addEventListener('click', () => {
  const container = document.getElementById('links-container');
  if (container.children.length >= 5) { showToast('링크는 최대 5개까지 추가할 수 있습니다.'); return; }
  addLinkRow(container);
});

// Form submit
document.getElementById('form-submit').addEventListener('submit', async (e) => {
  e.preventDefault();

  const errEl   = document.getElementById('submit-error');
  const spinner = document.getElementById('submit-spinner');
  const btnText = document.getElementById('submit-btn-text');

  errEl.hidden = true;

  const weekRaw   = document.getElementById('submit-week').value;
  const title     = document.getElementById('submit-title').value.trim();
  const desc      = document.getElementById('submit-desc').value.trim();

  if (!weekRaw)  { showError(errEl, '주차를 선택해주세요.'); return; }
  if (!title)    { showError(errEl, '제목을 입력해주세요.'); return; }

  // 링크 수집
  const links = [];
  document.querySelectorAll('#links-container .link-row').forEach(row => {
    const type = row.querySelector('.link-type').value;
    const url  = row.querySelector('.link-url').value.trim();
    if (url) links.push({ type, url, label: linkLabel(type) });
  });

  const weekData = JSON.parse(weekRaw);

  const isEditing = !!currentEditId;
  spinner.hidden = false; btnText.textContent = isEditing ? '수정 중...' : '제출 중...';
  document.getElementById('btn-submit-work').disabled = true;

  try {
    if (isEditing) {
      await updateDoc(doc(db, 'submissions', currentEditId), {
        weekLabel:   weekData.label,
        weekOrder:   weekData.order,
        title,
        description: desc,
        links,
        updatedAt: serverTimestamp(),
      });
      showToast('작업물이 수정되었습니다! ✏️', 'success');
    } else {
      await addDoc(collection(db, 'submissions'), {
        userId:       currentUser.uid,
        userName:     currentUser.displayName,
        userPhotoURL: currentUser.photoURL,
        teamId:       currentProfile.teamId || null,
        teamName:     currentTeam?.name || null,
        weekLabel:    weekData.label,
        weekOrder:    weekData.order,
        title,
        description: desc,
        links,
        createdAt: serverTimestamp(),
      });
      showToast('작업물이 제출되었습니다! 🎉', 'success');
    }
    resetSubmitModal();
  } catch (err) {
    showError(errEl, `${isEditing ? '수정' : '제출'} 중 오류가 발생했습니다: ` + err.message);
  } finally {
    spinner.hidden = true; btnText.textContent = isEditing ? '수정하기' : '제출하기';
    document.getElementById('btn-submit-work').disabled = false;
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   ADMIN: USER MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-admin-users')?.addEventListener('click', async () => {
  openModal('modal-admin-users');
  await loadAdminUsers('pending');
});
document.getElementById('btn-close-admin-users')?.addEventListener('click', () => closeModal('modal-admin-users'));

// Tab switch
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
    loadAdminUsers(tab.dataset.tab);
  });
});

async function loadAdminUsers(tabName) {
  const listEl   = document.getElementById('admin-users-list');
  const loadEl   = document.getElementById('admin-loading');
  loadEl.style.display  = 'flex';
  listEl.innerHTML = '';

  let q;
  if (tabName === 'pending') {
    q = query(collection(db, 'users'), where('role', '==', 'pending'));
  } else {
    q = query(collection(db, 'users'));
  }

  const snap = await getDocs(q);
  loadEl.style.display = 'none';

  if (snap.empty) {
    listEl.innerHTML = `<p style="color:var(--text-3);font-size:.85rem;text-align:center;padding:var(--sp-6);">사용자가 없습니다.</p>`;
    return;
  }

  snap.forEach(d => {
    const u = d.data();
    const row = document.createElement('div');
    row.className = 'admin-user-row';
    row.id        = `admin-row-${d.id}`;

    const team = allTeams.find(t => t.id === u.teamId);

    row.innerHTML = `
      <img src="${escapeHtml(u.photoURL || '')}" alt="${escapeHtml(u.displayName || '')}" class="admin-user-img" onerror="this.style.display='none'" />
      <div class="admin-user-info">
        <div class="admin-user-name">${escapeHtml(u.displayName || '이름 없음')}</div>
        <div class="admin-user-email">${escapeHtml(u.email)}${team ? ` · ${escapeHtml(team.name)}` : ''}</div>
      </div>
      <div class="admin-user-controls">
        <span class="role-badge role-${u.role}">${roleLabel(u.role)}</span>
        ${tabName === 'pending'
          ? `<button class="btn-approve" data-uid="${d.id}">승인</button>
             <button class="btn-reject"  data-uid="${d.id}">거절</button>`
          : `<select class="role-select" data-uid="${d.id}">
               <option value="member"    ${u.role==='member'    ? 'selected':''}>회원</option>
               <option value="leader"    ${u.role==='leader'    ? 'selected':''}>팀장</option>
               <option value="executive" ${u.role==='executive' ? 'selected':''}>임원</option>
             </select>
             <select class="role-select" data-uid="${d.id}" data-type="team">
               <option value="">팀 없음</option>
               ${allTeams.map(t => `<option value="${t.id}" ${u.teamId===t.id?'selected':''}>${escapeHtml(t.name)}</option>`).join('')}
             </select>`
        }
      </div>
    `;

    // Approve
    row.querySelector('.btn-approve')?.addEventListener('click', async () => {
      await updateDoc(doc(db, 'users', d.id), { role: 'member' });
      row.remove(); showToast(`${u.displayName} 승인 완료`, 'success');
    });
    // Reject
    row.querySelector('.btn-reject')?.addEventListener('click', async () => {
      if (!confirm(`${u.displayName}을(를) 거절하시겠습니까?`)) return;
      await deleteDoc(doc(db, 'users', d.id)); row.remove();
      showToast(`${u.displayName} 거절됨`);
    });
    // Role change
    row.querySelector('select.role-select:not([data-type])')?.addEventListener('change', async function () {
      await updateDoc(doc(db, 'users', d.id), { role: this.value });
      showToast('역할 변경 완료', 'success');
    });
    // Team change
    row.querySelector('select[data-type="team"]')?.addEventListener('change', async function () {
      await updateDoc(doc(db, 'users', d.id), { teamId: this.value || null });
      showToast('팀 변경 완료', 'success');
    });

    listEl.appendChild(row);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   ADMIN: TEAM MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-admin-teams')?.addEventListener('click', async () => {
  openModal('modal-admin-teams');
  await loadAdminTeams();
});
document.getElementById('btn-close-admin-teams')?.addEventListener('click', () => closeModal('modal-admin-teams'));

document.getElementById('btn-create-team')?.addEventListener('click', async () => {
  const input = document.getElementById('new-team-name');
  const name  = input.value.trim();
  if (!name) return;

  await addDoc(collection(db, 'teams'), {
    name, createdAt: serverTimestamp(), leaderId: null,
  });
  allTeams = await loadAllTeams();
  input.value = '';
  await loadAdminTeams();
  showToast(`팀 "${name}" 생성 완료`, 'success');
});

async function loadAdminTeams() {
  const listEl = document.getElementById('teams-list');
  listEl.innerHTML = '';
  allTeams = await loadAllTeams();

  if (!allTeams.length) {
    listEl.innerHTML = `<p style="color:var(--text-3);font-size:.85rem;text-align:center;padding:var(--sp-5);">팀이 없습니다.</p>`;
    return;
  }

  for (const team of allTeams) {
    // 팀원 수 조회
    const membersSnap = await getDocs(
      query(collection(db, 'users'), where('teamId', '==', team.id))
    );
    const row = document.createElement('div');
    row.className = 'team-row';
    row.innerHTML = `
      <span class="team-row-name">${escapeHtml(team.name)}</span>
      <span class="team-row-count">팀원 ${membersSnap.size}명</span>
      <button class="btn-delete-team" data-tid="${team.id}">삭제</button>
    `;
    row.querySelector('.btn-delete-team').addEventListener('click', async () => {
      if (!confirm(`팀 "${team.name}"을 삭제하시겠습니까?\n팀원들의 팀 배정이 초기화됩니다.`)) return;
      // 팀원들의 teamId 초기화
      membersSnap.forEach(async (md) => {
        await updateDoc(doc(db, 'users', md.id), { teamId: null });
      });
      await deleteDoc(doc(db, 'teams', team.id));
      allTeams = await loadAllTeams();
      row.remove();
      showToast(`팀 "${team.name}" 삭제됨`);
    });
    listEl.appendChild(row);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   TEAM LEADER: INVITE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-invite-member')?.addEventListener('click', async () => {
  openModal('modal-invite');
  await loadInviteList();
});
document.getElementById('btn-close-invite')?.addEventListener('click', () => closeModal('modal-invite'));

async function loadInviteList() {
  const listEl = document.getElementById('invite-users-list');
  listEl.innerHTML = '';

  // 팀 미배정 + 승인된 회원 목록
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', 'in', ['member', 'leader']))
  );

  const unassigned = snap.docs.filter(d => !d.data().teamId && d.id !== currentUser.uid);

  if (!unassigned.length) {
    listEl.innerHTML = `<p style="color:var(--text-3);font-size:.85rem;text-align:center;padding:var(--sp-5);">초대할 회원이 없습니다.</p>`;
    return;
  }

  unassigned.forEach(d => {
    const u   = d.data();
    const row = document.createElement('div');
    row.className = 'admin-user-row';
    row.innerHTML = `
      <img src="${escapeHtml(u.photoURL || '')}" alt="" class="admin-user-img" onerror="this.style.display='none'" />
      <div class="admin-user-info">
        <div class="admin-user-name">${escapeHtml(u.displayName || '이름 없음')}</div>
        <div class="admin-user-email">${escapeHtml(u.email)}</div>
      </div>
      <div class="admin-user-controls">
        <button class="btn-approve" data-uid="${d.id}">초대</button>
      </div>
    `;
    row.querySelector('.btn-approve').addEventListener('click', async () => {
      await updateDoc(doc(db, 'users', d.id), { teamId: currentProfile.teamId });
      row.remove();
      await loadMyTeamSidebar();
      showToast(`${u.displayName} 팀 초대 완료 🎉`, 'success');
    });
    listEl.appendChild(row);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   MODAL HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openModal(id) {
  const m = document.getElementById(id);
  m.hidden = false;
  m.addEventListener('click', modalOverlayClose);
  // 접근성: 모달 내 첫 번째 포커스 가능 요소로 이동
  setTimeout(() => {
    const focusable = m.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
  }, 50);
}

function closeModal(id) {
  const m = document.getElementById(id);
  m.hidden = true;
  m.removeEventListener('click', modalOverlayClose);
}

function modalOverlayClose(e) {
  if (e.target === e.currentTarget) closeModal(e.currentTarget.id);
}

// ESC key
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  ['modal-submit','modal-admin-users','modal-admin-teams','modal-invite','modal-profile'].forEach(id => {
    if (!document.getElementById(id)?.hidden) closeModal(id);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   PROFILE MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openProfileModal() {
  const p = currentProfile;
  document.getElementById('profile-photo-url').value = p.customPhotoURL || '';
  document.getElementById('profile-nickname').value  = p.displayName || currentUser.displayName || '';
  document.getElementById('profile-job-role').value  = p.jobRole || '';
  document.getElementById('profile-bio').value       = p.bio || '';
  document.getElementById('profile-portfolio').value = p.portfolioUrl || '';
  document.getElementById('bio-char-count').textContent = `${(p.bio || '').length} / 200`;
  document.getElementById('profile-error').hidden = true;
  updatePhotoPreview();
  openModal('modal-profile');
}

function updatePhotoPreview() {
  const url = document.getElementById('profile-photo-url').value.trim();
  document.getElementById('profile-preview-img').src = url || currentUser?.photoURL || '';
}

function updateSidebarProfile() {
  const name    = currentProfile.displayName || currentUser?.displayName || '회원';
  const photo   = currentProfile.customPhotoURL || currentUser?.photoURL || '';
  const jobRole = currentProfile.jobRole || roleLabel(currentProfile.role);
  const bio     = currentProfile.bio || '';
  const port    = currentProfile.portfolioUrl || '';

  document.getElementById('sidebar-profile-name').textContent    = name;
  document.getElementById('sidebar-profile-jobrole').textContent = jobRole;
  document.getElementById('sidebar-profile-avatar').src          = photo;

  const bioEl = document.getElementById('sidebar-profile-bio');
  bioEl.textContent = bio;
  bioEl.style.display = bio ? 'block' : 'none';

  const portEl = document.getElementById('sidebar-profile-portfolio');
  if (port) {
    portEl.href        = port;
    portEl.textContent = '🔗 포트폴리오 보기';
    portEl.hidden      = false;
  } else {
    portEl.hidden = true;
  }
}

document.getElementById('btn-open-profile')?.addEventListener('click', () => openProfileModal());
document.getElementById('btn-close-profile')?.addEventListener('click', () => closeModal('modal-profile'));
document.getElementById('btn-cancel-profile')?.addEventListener('click', () => closeModal('modal-profile'));

// Photo URL 실시간 미리보기
document.getElementById('profile-photo-url')?.addEventListener('input', updatePhotoPreview);
// Bio 글자수
document.getElementById('profile-bio')?.addEventListener('input', function () {
  document.getElementById('bio-char-count').textContent = `${this.value.length} / 200`;
});

document.getElementById('form-profile')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const errEl   = document.getElementById('profile-error');
  const spinner = document.getElementById('profile-spinner');
  const btnText = document.getElementById('profile-btn-text');
  errEl.hidden  = true;

  const nickname = document.getElementById('profile-nickname').value.trim();
  if (!nickname) { showError(errEl, '닉네임을 입력해주세요.'); return; }

  const customPhotoURL = document.getElementById('profile-photo-url').value.trim();
  const jobRole        = document.getElementById('profile-job-role').value.trim();
  const bio            = document.getElementById('profile-bio').value.trim();
  const portfolioUrl   = document.getElementById('profile-portfolio').value.trim();

  spinner.hidden = false; btnText.textContent = '저장 중...';
  document.getElementById('btn-save-profile').disabled = true;

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      displayName: nickname, customPhotoURL, jobRole, bio, portfolioUrl,
      updatedAt: serverTimestamp(),
    });

    // currentProfile 업데이트
    Object.assign(currentProfile, { displayName: nickname, customPhotoURL, jobRole, bio, portfolioUrl });

    // Nav 갱신
    document.getElementById('portal-user-name').textContent = nickname;
    document.getElementById('portal-user-avatar').src = customPhotoURL || currentUser.photoURL || '';

    // 사이드바 갱신
    updateSidebarProfile();

    closeModal('modal-profile');
    showToast('프로필이 저장되었습니다! 🍔', 'success');
  } catch (err) {
    showError(errEl, '저장 중 오류: ' + err.message);
  } finally {
    spinner.hidden = true; btnText.textContent = '저장하기';
    document.getElementById('btn-save-profile').disabled = false;
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SUBMIT MODAL HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openNewSubmitModal() {
  currentEditId = null;
  document.getElementById('modal-submit-title').textContent = '작업물 제출';
  document.getElementById('submit-btn-text').textContent    = '제출하기';
  document.getElementById('form-submit').reset();
  document.getElementById('desc-char-count').textContent = '0 / 500';
  const container = document.getElementById('links-container');
  container.innerHTML = '';
  addLinkRow(container);
  openModal('modal-submit');
}

function openEditModal(item) {
  currentEditId = item.id;
  document.getElementById('modal-submit-title').textContent = '작업물 수정';
  document.getElementById('submit-btn-text').textContent    = '수정하기';

  // 주차 선택 — 기존 옵션에서 일치하는 것 찾기, 없으면 추가
  const sel = document.getElementById('submit-week');
  let found = false;
  for (const opt of sel.options) {
    if (!opt.value) continue;
    try {
      if (JSON.parse(opt.value).label === item.weekLabel) { opt.selected = true; found = true; break; }
    } catch {}
  }
  if (!found) {
    const opt = new Option(item.weekLabel, JSON.stringify({ label: item.weekLabel, order: item.weekOrder || 0 }), true, true);
    sel.add(opt, 1);
  }

  document.getElementById('submit-title').value = item.title || '';
  document.getElementById('submit-desc').value  = item.description || '';
  document.getElementById('desc-char-count').textContent = `${(item.description || '').length} / 500`;

  const container = document.getElementById('links-container');
  container.innerHTML = '';
  if (item.links?.length) {
    item.links.forEach(link => addLinkRow(container, link.type, link.url));
  } else {
    addLinkRow(container);
  }

  openModal('modal-submit');
}

function resetSubmitModal() {
  currentEditId = null;
  closeModal('modal-submit');
}

function addLinkRow(container, type = 'github', url = '') {
  if (container.children.length >= 5) return;
  const types  = ['github','notion','drive','youtube','itch','other'];
  const labels = ['GitHub','Notion','Google Drive','YouTube','itch.io','기타'];
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = `
    <select class="form-input link-type" aria-label="링크 종류">
      ${types.map((t,i) => `<option value="${t}"${t === type ? ' selected' : ''}>${labels[i]}</option>`).join('')}
    </select>
    <input type="url" class="form-input link-url" placeholder="https://" value="${escapeHtml(url)}" aria-label="링크 URL" />
    <button type="button" class="btn-remove-link" aria-label="링크 삭제">×</button>
  `;
  row.querySelector('.btn-remove-link').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

async function handleDeleteSubmission(id, title) {
  if (!confirm(`"${title}"\n이 작업물을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
  try {
    await deleteDoc(doc(db, 'submissions', id));
    showToast('작업물이 삭제되었습니다.', 'success');
  } catch (err) {
    showToast('삭제 중 오류: ' + err.message, 'error');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function roleLabel(role) {
  const map = { pending: '승인 대기', member: '회원', leader: '팀장', executive: '임원' };
  return map[role] || role;
}

function linkIcon(type) {
  const map = { github: '🐙', notion: '📝', drive: '📂', youtube: '▶️', itch: '🎮', other: '🔗' };
  return map[type] || '🔗';
}

function linkLabel(type) {
  const map = { github: 'GitHub', notion: 'Notion', drive: 'Google Drive', youtube: 'YouTube', itch: 'itch.io', other: '링크' };
  return map[type] || '링크';
}

function formatDate(date) {
  const now  = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60)        return '방금 전';
  if (diff < 3600)      return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400)     return `${Math.floor(diff/3600)}시간 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showError(el, msg) {
  el.textContent = msg; el.hidden = false;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
