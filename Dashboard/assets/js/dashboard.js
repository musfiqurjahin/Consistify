import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut as fbSignOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBBu-UtD6PoCYmy1cPcHb-LJpa-YH6tZc",
    authDomain: "consistify-by-j4h1n.firebaseapp.com",
    projectId: "consistify-by-j4h1n",
    storageBucket: "consistify-by-j4h1n.firebasestorage.app",
    messagingSenderId: "695514845432",
    appId: "1:695514845432:web:cc0c974d462fc1f3cbab0d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── STATE ──
let currentUser = null, viewUid = null, isPublicView = false, userProfile = {}, habits = [], viewYear, viewMonth;
let selectedIcon = "✦", selectedIconEdit = "✦", pendingDeleteId = null, habitUnsub = null, pendingEditId = null;
let monthlyChartInst = null, yearlyChartInst = null, weeklyChartInst = null, habMonthlyChartInst = null;
let calYear = new Date().getFullYear(), activeTab = 'overview', selectedYearForChart = new Date().getFullYear();
let currentCheckmark = "✓";
let reorderSortable = null;

const CHECKMARK_PRESETS = ["✓", "✔", "✅", "☑", "★", "♥", "◉", "✦", "🔥", "💎", "⚡", "🌟"];

const EMOJI_CATEGORIES = {
    "Health & Fitness": ["🏃", "🧘", "💪", "🚴", "🏊", "🤸", "🥗", "💊", "🥤", "😴", "🧘‍♀️", "🏋️", "⚽", "🎾", "🧗", "🥦", "🫀", "🦷", "👁️", "🚶"],
    "Mind & Learning": ["📚", "✍️", "🧠", "🎯", "💡", "🔬", "🎓", "📖", "🗺️", "🧩", "🔭", "📝", "🖊️", "💭", "🤔", "📰", "🗃️", "🧮", "🔍", "📐"],
    "Creative": ["🎨", "🎵", "🎸", "📸", "🎭", "✏️", "🖌️", "🎬", "🎤", "🎹", "🎺", "🎻", "📷", "🖋️", "🎙️", "🖼️", "🎠", "🎡", "🎢", "🎪"],
    "Work & Focus": ["💼", "⏰", "📊", "🗓️", "📋", "💻", "📱", "🔧", "⚙️", "📌", "🗂️", "✅", "🔑", "📡", "💰", "📈", "🎰", "⚡", "🔋", "🌐"],
    "Lifestyle": ["🌱", "🌿", "♻️", "🌍", "🍵", "☕", "🧹", "🏠", "🛁", "🌅", "🌙", "⭐", "🌺", "🌸", "🍀", "🏡", "🛌", "🍽️", "🛒", "🚿"],
    "Symbols": ["✦", "◆", "▲", "●", "★", "◉", "⬡", "⬟", "✿", "❋", "♦", "♠", "♣", "♥", "⚡", "🔥", "💎", "🎯", "🏆", "🌟"]
};

// ── HELPERS ──
function today() { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() } }
function dateKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getStreak(habit) { const t = today(); let s = 0; const d = new Date(t.y, t.m, t.d); while (true) { const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate()); if (!habit.done || !habit.done[k]) break; s++; d.setDate(d.getDate() - 1) } return s }
function getBestStreak(habit) { if (!habit.done) return 0; const keys = Object.keys(habit.done).sort(); if (!keys.length) return 0; let best = 1, cur = 1; for (let i = 1; i < keys.length; i++) { const a = new Date(keys[i - 1]), b = new Date(keys[i]); const diff = (b - a) / (1000 * 60 * 60 * 24); if (diff === 1) { cur++; best = Math.max(best, cur) } else cur = 1 } return best }
function monthPct(habit, y, m) { const t = today(); const cap = (y === t.y && m === t.m) ? t.d : daysInMonth(y, m); if (cap <= 0) return 0; let done = 0; for (let d = 1; d <= cap; d++) { if (habit.done && habit.done[dateKey(y, m, d)]) done++ } return Math.round(done / cap * 100) }
function perfectWeeks(habit) { if (!habit.done) return 0; let count = 0; for (let w = 0; w < 12; w++) { let allDone = true; for (let d = 0; d < 7; d++) { const dt = new Date(); dt.setDate(dt.getDate() - (w * 7 + d)); const k = dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate()); if (!habit.done[k]) { allDone = false; break } } if (allDone) count++ } return count }
function calcAge(dob) { if (!dob) return null; const b = new Date(dob), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a }
function formatTime12(t) { if (!t) return ''; const [h, m] = t.split(':'); const hh = parseInt(h); const ampm = hh >= 12 ? 'PM' : 'AM'; return `${hh % 12 || 12}:${m}${ampm}` }

window.openModal = (id) => document.getElementById(id).classList.add('open');
window.closeModal = (id) => document.getElementById(id).classList.remove('open');
function closeDropdown() { document.getElementById('profileDropdown').classList.remove('open') }
function showToast(msg, dur = 2500) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), dur) }

// ── THEME ──
function applyTheme(th) {
    document.body.setAttribute('data-theme', th);
    const icon = document.getElementById('themeIcon');
    icon.className = th === 'dark' ? 'fa fa-sun' : 'fa fa-moon';
    localStorage.setItem('consistify-theme', th);
}
window.toggleTheme = () => {
    const cur = document.body.getAttribute('data-theme') || 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
};
// Init theme
(() => { const saved = localStorage.getItem('consistify-theme') || 'light'; applyTheme(saved) })();

// ── CLOCK ──
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('navClock').textContent = `${h}:${mi}:${s}`;
    document.getElementById('navClockDate').textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    document.getElementById('fsTimeH').textContent = `${h}:${mi}`;
    document.getElementById('fsTimeSec').textContent = s;
    document.getElementById('fsDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
setInterval(updateClock, 1000); updateClock();
window.toggleFullscreenClock = (open) => {
    const el = document.getElementById('clockFullscreen');
    if (open === undefined) open = !el.classList.contains('open');
    el.classList.toggle('open', open);
};

// ── CALENDAR DROPDOWN ──
function buildCalMonths() {
    const t = today();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const cont = document.getElementById('calMonths');
    document.getElementById('calYear').textContent = calYear;
    cont.innerHTML = '';
    months.forEach((mn, mi) => {
        const cell = document.createElement('div');
        cell.className = 'cal-month-cell';
        if (calYear === viewYear && mi === viewMonth) cell.classList.add('active');
        if (calYear === t.y && mi === t.m) cell.classList.add('current-month');
        cell.textContent = mn;
        cell.onclick = (e) => { e.stopPropagation(); viewYear = calYear; viewMonth = mi; document.getElementById('calDropdown').classList.remove('open'); render() };
        cont.appendChild(cell);
    });
}
window.toggleCalDropdown = () => {
    const dd = document.getElementById('calDropdown');
    dd.classList.toggle('open');
    if (dd.classList.contains('open')) { calYear = viewYear; buildCalMonths() }
};
window.calShiftYear = (dir) => { calYear += dir; buildCalMonths() };

// ── URL ──
const urlParams = new URLSearchParams(window.location.search);
viewUid = urlParams.get('view');
if (viewUid) isPublicView = true;

onAuthStateChanged(auth, async user => {
    if (isPublicView) { currentUser = null; await loadPublicView(); return }
    if (!user) { window.location.href = '../Login/'; return }
    currentUser = user;
    await loadUserProfile();
    setupNavAvatar();
    subscribeHabits();
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('fab').style.display = 'flex';
    const t = today(); setView(t.y, t.m);
    loadPrefs();
    buildCheckmarkPresets();
});

async function loadPublicView() {
    document.getElementById('publicBadge').style.display = 'block';
    document.getElementById('addDrawer').style.display = 'none';
    document.getElementById('avatarBtn').style.display = 'none';
    document.getElementById('addHint').style.display = 'none';
    const profDoc = await getDoc(doc(db, 'users', viewUid));
    if (!profDoc.exists()) { document.getElementById('habitList').innerHTML = '<div style="text-align:center;padding:4rem;color:var(--muted);">Tracker not found.</div>'; document.getElementById('loadingScreen').style.display = 'none'; return }
    userProfile = profDoc.data();
    document.title = `${userProfile.displayName || 'User'}'s Consistify`;
    const vb = document.getElementById('viewerBar');
    vb.style.display = 'flex';
    document.getElementById('viewerNameEl').textContent = userProfile.displayName || 'User';
    const va = document.getElementById('viewerAvatarEl');
    if (userProfile.photoURL) va.innerHTML = `<img src="${userProfile.photoURL}"/>`;
    else va.textContent = (userProfile.displayName || 'U')[0].toUpperCase();
    await loadHabitsOnce(viewUid);
    document.getElementById('loadingScreen').style.display = 'none';
    const t = today(); setView(t.y, t.m);
}

async function loadUserProfile() {
    const ref = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        const username = currentUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
        userProfile = { displayName: currentUser.displayName || 'User', email: currentUser.email, photoURL: currentUser.photoURL || '', username, bio: '', about: '', location: '', dob: '', social: {}, createdAt: serverTimestamp() };
        await setDoc(ref, userProfile);
    } else { userProfile = snap.data(); if (!userProfile.social) userProfile.social = {} }
}

function setupNavAvatar() {
    const btn = document.getElementById('avatarBtn');
    btn.style.display = 'flex';
    if (userProfile.photoURL) btn.innerHTML = `<img src="${userProfile.photoURL}" alt="avatar"/>`;
    else btn.textContent = (userProfile.displayName || 'U')[0].toUpperCase();
}

function subscribeHabits() {
    if (habitUnsub) habitUnsub();
    const q = query(collection(db, 'users', currentUser.uid, 'habits'), orderBy('order', 'asc'));
    habitUnsub = onSnapshot(q, snap => {
        habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Fallback sort by createdAt if no order
        habits.sort((a, b) => {
            if (a.order != null && b.order != null) return a.order - b.order;
            if (a.order != null) return -1; if (b.order != null) return 1;
            return 0;
        });
        render();
    });
}

async function loadHabitsOnce(uid) {
    const q = query(collection(db, 'users', uid, 'habits'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── FAB / DRAWER ──
window.toggleAddDrawer = () => {
    const drawer = document.getElementById('addDrawer');
    const fab = document.getElementById('fab');
    drawer.classList.toggle('open');
    fab.classList.toggle('open');
    if (drawer.classList.contains('open')) setTimeout(() => document.getElementById('habitInput').focus(), 350);
};

// ── ADD HABIT ──
window.addHabit = async () => {
    const input = document.getElementById('habitInput');
    const name = input.value.trim();
    if (!name || !currentUser) return;
    const timeFrom = document.getElementById('habitTimeFrom').value || '';
    const timeTo = document.getElementById('habitTimeTo').value || '';
    const id = Date.now().toString();
    const ref = doc(db, 'users', currentUser.uid, 'habits', id);
    await setDoc(ref, { name, icon: selectedIcon, done: {}, createdAt: serverTimestamp(), order: habits.length, timeFrom, timeTo });
    input.value = '';
    document.getElementById('habitTimeFrom').value = '';
    document.getElementById('habitTimeTo').value = '';
    showToast('Habit added! ✦');
    document.getElementById('addDrawer').classList.remove('open');
    document.getElementById('fab').classList.remove('open');
};
document.getElementById('habitInput').addEventListener('keydown', e => { if (e.key === 'Enter') window.addHabit() });

// ── TOGGLE DAY ──
window.toggleDay = async (habitId, y, m, d) => {
    if (isPublicView || !currentUser) return;
    const t = today();
    if (y > t.y || (y === t.y && m > t.m) || (y === t.y && m === t.m && d > t.d)) return;
    const habit = habits.find(h => h.id === habitId); if (!habit) return;
    const k = dateKey(y, m, d);
    const newDone = { ...(habit.done || {}) };
    if (newDone[k]) delete newDone[k]; else newDone[k] = true;
    const ref = doc(db, 'users', currentUser.uid, 'habits', habitId);
    await updateDoc(ref, { done: newDone });
};

// ── EDIT HABIT ──
window.promptEdit = (habitId) => {
    const h = habits.find(h => h.id === habitId); if (!h) return;
    pendingEditId = habitId;
    selectedIconEdit = h.icon || '✦';
    document.getElementById('eh-name').value = h.name || '';
    document.getElementById('selectedIconPreviewEdit').textContent = selectedIconEdit;
    document.getElementById('eh-timeFrom').value = h.timeFrom || '';
    document.getElementById('eh-timeTo').value = h.timeTo || '';
    openModal('editHabitModal');
};
window.clearEditTime = () => {
    document.getElementById('eh-timeFrom').value = '';
    document.getElementById('eh-timeTo').value = '';
};
window.saveEditHabit = async () => {
    if (!pendingEditId || !currentUser) return;
    const name = document.getElementById('eh-name').value.trim();
    if (!name) { showToast('Name cannot be empty'); return }
    const timeFrom = document.getElementById('eh-timeFrom').value || '';
    const timeTo = document.getElementById('eh-timeTo').value || '';
    await updateDoc(doc(db, 'users', currentUser.uid, 'habits', pendingEditId), { name, icon: selectedIconEdit, timeFrom, timeTo });
    closeModal('editHabitModal');
    showToast('Habit updated!');
};

// ── DELETE ──
window.promptDelete = (habitId) => {
    const h = habits.find(h => h.id === habitId); if (!h) return;
    pendingDeleteId = habitId;
    document.getElementById('del-habitName').textContent = `"${h.name}"`;
    document.getElementById('confirmInput').value = '';
    document.getElementById('btnConfirmDel').disabled = true;
    openModal('deleteModal');
};
window.checkConfirmInput = () => {
    const v = document.getElementById('confirmInput').value;
    document.getElementById('btnConfirmDel').disabled = (v.toLowerCase() !== 'confirm');
};
window.executeDelete = async () => {
    if (!pendingDeleteId || !currentUser) return;
    await deleteDoc(doc(db, 'users', currentUser.uid, 'habits', pendingDeleteId));
    pendingDeleteId = null; closeModal('deleteModal'); showToast('Habit deleted.');
};

// ── REORDER ──
window.openReorderModal = () => {
    closeDropdown();
    const list = document.getElementById('reorderList');
    list.innerHTML = '';
    habits.forEach(h => {
        const item = document.createElement('div');
        item.className = 'reorder-item';
        item.setAttribute('data-id', h.id);
        item.innerHTML = `<span class="reorder-handle"><i class="fa fa-grip-vertical"></i></span><span class="reorder-icon">${h.icon}</span><span class="reorder-name">${h.name}</span>`;
        list.appendChild(item);
    });
    if (reorderSortable) reorderSortable.destroy();
    reorderSortable = Sortable.create(list, {
        animation: 150,
        handle: '.reorder-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: async () => {
            const items = list.querySelectorAll('.reorder-item');
            const updates = [];
            items.forEach((item, idx) => {
                const id = item.getAttribute('data-id');
                updates.push(updateDoc(doc(db, 'users', currentUser.uid, 'habits', id), { order: idx }));
            });
            await Promise.all(updates);
            showToast('Order saved!');
        }
    });
    openModal('reorderModal');
};

// ── HABIT ANALYTICS ──
window.openHabitAnalytics = (habitId) => {
    const h = habits.find(h => h.id === habitId); if (!h) return;
    document.getElementById('hab-icon-lg').textContent = h.icon;
    document.getElementById('hab-name').textContent = h.name;
    const keys = h.done ? Object.keys(h.done).sort() : [];
    document.getElementById('hab-since').textContent = keys.length ? `Since ${new Date(keys[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'No data yet';
    document.getElementById('hab-streak').textContent = getStreak(h);
    document.getElementById('hab-best').textContent = getBestStreak(h);
    const t = today();
    document.getElementById('hab-pct').textContent = monthPct(h, t.y, t.m) + '%';
    document.getElementById('hab-total').textContent = keys.length;
    const firstDate = keys.length ? new Date(keys[0]) : new Date();
    const totalDays = Math.max(1, Math.ceil((new Date() - firstDate) / (1000 * 60 * 60 * 24)));
    document.getElementById('hab-alltime-pct').textContent = Math.round(keys.length / totalDays * 100) + '%';
    document.getElementById('hab-perfect').textContent = perfectWeeks(h);
    const grid = document.getElementById('hab-30day');
    grid.innerHTML = '';
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    dayNames.forEach(dn => { const c = document.createElement('div'); c.className = 'sg-cell'; c.style.cssText = 'background:none;color:var(--muted);font-size:0.5rem;font-weight:500;'; c.textContent = dn; grid.appendChild(c) });
    for (let i = 29; i >= 0; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i);
        const k = dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
        const done = !!(h.done && h.done[k]);
        const isT = (i === 0);
        const c = document.createElement('div');
        c.className = 'sg-cell' + (done ? ' done' : '') + (isT ? ' today' : '');
        c.title = dt.toLocaleDateString();
        if (done) c.textContent = currentCheckmark;
        grid.appendChild(c);
    }
    const mLabels = [], mData = [];
    for (let i = 5; i >= 0; i--) {
        let my = t.y, mm = t.m - i; if (mm < 0) { mm += 12; my-- }
        mLabels.push(new Date(my, mm, 1).toLocaleDateString('en-US', { month: 'short' }));
        mData.push(monthPct(h, my, mm));
    }
    if (habMonthlyChartInst) habMonthlyChartInst.destroy();
    const ctx = document.getElementById('habMonthlyChart').getContext('2d');
    habMonthlyChartInst = new Chart(ctx, { type: 'bar', data: { labels: mLabels, datasets: [{ label: '%', data: mData, backgroundColor: 'rgba(201,168,76,0.3)', borderColor: '#c9a84c', borderWidth: 1.5, borderRadius: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, ticks: { font: { family: 'DM Mono', size: 9 }, color: '#8a8070', callback: v => v + '%' }, grid: { color: 'rgba(14,14,14,0.05)' } }, x: { ticks: { font: { family: 'DM Mono', size: 9 }, color: '#8a8070' }, grid: { display: false } } } } });
    openModal('habitAnalyticsModal');
};

// ── EMOJI PICKER (add) ──
function buildEmojiContent(filter = '', targetIcon, onSelect) {
    const cont = document.getElementById('emojiContent'); cont.innerHTML = '';
    for (const [cat, emojis] of Object.entries(EMOJI_CATEGORIES)) {
        if (filter && !cat.toLowerCase().includes(filter.toLowerCase()) && !emojis.some(() => true)) continue;
        const catEl = document.createElement('div'); catEl.className = 'emoji-category'; catEl.textContent = cat;
        const grid = document.createElement('div'); grid.className = 'emoji-grid';
        emojis.forEach(e => {
            if (filter && !cat.toLowerCase().includes(filter.toLowerCase())) return;
            const el = document.createElement('div');
            el.className = 'emoji-item' + (e === targetIcon ? ' selected' : '');
            el.textContent = e; el.onclick = () => onSelect(e);
            grid.appendChild(el);
        });
        if (grid.children.length) { cont.appendChild(catEl); cont.appendChild(grid) }
    }
}

let _emojiMode = 'add';
window.openEmojiPicker = (evt) => {
    _emojiMode = 'add';
    evt.stopPropagation();
    const popup = document.getElementById('emojiPopup');
    const btn = document.getElementById('iconPickerBtn');
    const rect = btn.getBoundingClientRect();
    popup.style.left = Math.max(8, rect.left) + 'px';
    popup.style.top = (rect.bottom + 6) + 'px';
    popup.classList.toggle('open');
    if (popup.classList.contains('open')) { buildEmojiContent('', selectedIcon, selectIconAdd); document.getElementById('emojiSearch').value = ''; document.getElementById('emojiSearch').focus() }
};
window.openEmojiPickerEdit = (evt) => {
    _emojiMode = 'edit';
    evt.stopPropagation();
    const popup = document.getElementById('emojiPopup');
    const btn = document.getElementById('iconPickerBtnEdit');
    const rect = btn.getBoundingClientRect();
    popup.style.left = Math.max(8, rect.left) + 'px';
    popup.style.top = (rect.bottom + 6) + 'px';
    popup.classList.toggle('open');
    if (popup.classList.contains('open')) { buildEmojiContent('', selectedIconEdit, selectIconEdit); document.getElementById('emojiSearch').value = ''; document.getElementById('emojiSearch').focus() }
};
window.filterEmojis = () => {
    const q = document.getElementById('emojiSearch').value;
    if (_emojiMode === 'edit') buildEmojiContent(q, selectedIconEdit, selectIconEdit);
    else buildEmojiContent(q, selectedIcon, selectIconAdd);
};
function selectIconAdd(icon) { selectedIcon = icon; document.getElementById('selectedIconPreview').textContent = icon; document.getElementById('emojiPopup').classList.remove('open') }
function selectIconEdit(icon) { selectedIconEdit = icon; document.getElementById('selectedIconPreviewEdit').textContent = icon; document.getElementById('emojiPopup').classList.remove('open') }

document.addEventListener('click', e => {
    if (!e.target.closest('#emojiPopup') && !e.target.closest('#iconPickerBtn') && !e.target.closest('#iconPickerBtnEdit')) document.getElementById('emojiPopup').classList.remove('open');
    if (!e.target.closest('#profileDropdown') && !e.target.closest('#avatarBtn')) document.getElementById('profileDropdown').classList.remove('open');
    if (!e.target.closest('.month-picker-wrap')) document.getElementById('calDropdown').classList.remove('open');
});

// ── CHECKMARK PRESETS ──
function buildCheckmarkPresets() {
    const cont = document.getElementById('ckPresets');
    if (!cont) return;
    cont.innerHTML = '';
    CHECKMARK_PRESETS.forEach(ck => {
        const btn = document.createElement('button');
        btn.className = 'ck-preset' + (ck === currentCheckmark ? ' active' : '');
        btn.textContent = ck; btn.title = ck;
        btn.onclick = () => { currentCheckmark = ck; localStorage.setItem('consistify-checkmark', ck); buildCheckmarkPresets(); render(); showToast('Checkmark updated!') };
        cont.appendChild(btn);
    });
    const customInput = document.getElementById('ckCustomInput');
    if (customInput) customInput.value = '';
}
window.applyCustomCheckmark = () => {
    const v = document.getElementById('ckCustomInput').value.trim();
    if (!v) { showToast('Enter a symbol first'); return }
    currentCheckmark = v;
    localStorage.setItem('consistify-checkmark', v);
    buildCheckmarkPresets();
    render();
    showToast('Checkmark updated!');
};

// ── PROFILE DROPDOWN ──
window.toggleProfileDropdown = () => {
    const pd = document.getElementById('profileDropdown'); pd.classList.toggle('open');
    if (pd.classList.contains('open')) {
        const av = document.getElementById('pdAvatar');
        if (userProfile.photoURL) av.innerHTML = `<img src="${userProfile.photoURL}"/>`;
        else av.textContent = (userProfile.displayName || 'U')[0].toUpperCase();
        document.getElementById('pdName').textContent = userProfile.displayName || 'User';
        document.getElementById('pdEmail').textContent = userProfile.email || '';
    }
};
window.signOut = async () => { await fbSignOut(auth); window.location.href = '../Login/' };

// ── ANALYTICS TABS ──
window.switchTab = (tab) => {
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach((b, i) => { const tabs = ['overview', 'monthly', 'yearly', 'habits']; b.classList.toggle('active', tabs[i] === tab) });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
};

// ── VIEW PROFILE ──
window.openViewProfile = () => {
    closeDropdown();
    const uid = currentUser ? currentUser.uid : viewUid;
    populateProfileModal('vp', userProfile, uid);
    const url = `${window.location.origin}${window.location.pathname}?view=${uid}`;
    document.getElementById('vp-shareUrl').value = url;
    buildAnalytics();
    openModal('viewProfileModal');
};

function populateProfileModal(prefix, profile, uid) {
    const av = document.getElementById(prefix + '-avatar');
    if (profile.photoURL) av.innerHTML = `<img src="${profile.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    else av.textContent = (profile.displayName || 'U')[0].toUpperCase();
    document.getElementById(prefix + '-name').textContent = profile.displayName || 'User';
    document.getElementById(prefix + '-username').textContent = `@${profile.username || 'username'}`;
    const bioEl = document.getElementById(prefix + '-bio');
    if (bioEl) bioEl.textContent = profile.bio || '';
    // Meta row
    const metaRow = document.getElementById(prefix + '-meta-row');
    if (metaRow) {
        metaRow.innerHTML = '';
        const age = calcAge(profile.dob);
        const joinDate = profile.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;
        const metas = [
            joinDate ? { icon: 'fa fa-calendar-plus', text: `Joined ${joinDate}` } : null,
            age != null ? { icon: 'fa fa-cake-candles', text: `${age} years old` } : null,
            profile.location ? { icon: 'fa fa-location-dot', text: profile.location } : null,
            profile.about ? { icon: 'fa fa-graduation-cap', text: profile.about } : null,
        ].filter(Boolean);
        metas.forEach(m => {
            const span = document.createElement('div');
            span.className = 'profile-meta-item';
            span.innerHTML = `<i class="${m.icon}"></i>${m.text}`;
            metaRow.appendChild(span);
        });
    }
    // Social links
    const socialLinks = document.getElementById(prefix + '-social-links');
    if (socialLinks) {
        socialLinks.innerHTML = '';
        const soc = profile.social || {};
        const icons = { twitter: { icon: 'fa-brands fa-x-twitter', color: '#000' }, instagram: { icon: 'fa-brands fa-instagram', color: '#e1306c' }, github: { icon: 'fa-brands fa-github', color: 'var(--ink)' }, linkedin: { icon: 'fa-brands fa-linkedin', color: '#0a66c2' }, youtube: { icon: 'fa-brands fa-youtube', color: '#ff0000' }, website: { icon: 'fa fa-link', color: 'var(--gold-dark)' } };
        Object.entries(icons).forEach(([k, v]) => {
            if (soc[k]) {
                const a = document.createElement('a');
                a.className = 'social-link-btn';
                a.href = soc[k]; a.target = '_blank'; a.rel = 'noopener'; a.title = k;
                a.innerHTML = `<i class="${v.icon}" style="color:${v.color};"></i>`;
                socialLinks.appendChild(a);
            }
        });
    }
    // UID
    const uidEl = document.getElementById(prefix + '-uid');
    if (uidEl && uid) uidEl.textContent = uid;
}

window.copyUID = () => {
    const uid = currentUser ? currentUser.uid : viewUid;
    if (uid) navigator.clipboard.writeText(uid).then(() => showToast('UID copied!'));
};

// ── PUBLIC PROFILE MODAL ──
window.openPublicProfile = () => {
    populateProfileModal('pp', userProfile, viewUid);
    openModal('publicProfileModal');
};

// ── ANALYTICS ──
function buildAnalytics() {
    const t = today();
    let totalDone = 0, totalCap = 0, bestSt = 0, allTimeDone = 0;
    const activeDays = new Set();
    habits.forEach(h => {
        for (let d = 1; d <= t.d; d++) { totalCap++; if (h.done && h.done[dateKey(t.y, t.m, d)]) totalDone++ }
        const s = getStreak(h); if (s > bestSt) bestSt = s;
        if (h.done) Object.keys(h.done).forEach(k => { allTimeDone++; activeDays.add(k) });
    });
    const rate = totalCap > 0 ? Math.round(totalDone / totalCap * 100) : 0;
    document.getElementById('an-monthRate').textContent = rate + '%';
    document.getElementById('an-bestStreak').textContent = bestSt;
    document.getElementById('an-totalDone').textContent = totalDone;
    document.getElementById('an-allDone').textContent = allTimeDone;
    let globalBest = 0; habits.forEach(h => { const b = getBestStreak(h); if (b > globalBest) globalBest = b });
    document.getElementById('an-allStreak').textContent = globalBest;
    document.getElementById('an-habCount').textContent = habits.length;
    document.getElementById('an-activeDays').textContent = activeDays.size;

    // Heatmap
    const hm = document.getElementById('yearlyHeatmap'); hm.innerHTML = '';
    const start = new Date(); start.setDate(start.getDate() - 363);
    for (let i = 0; i < 364; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        let count = 0; habits.forEach(h => { if (h.done && h.done[k]) count++ });
        const lvl = count === 0 ? '' : (count <= Math.ceil(habits.length * 0.25) ? 'l1' : (count <= Math.ceil(habits.length * 0.5) ? 'l2' : (count <= Math.ceil(habits.length * 0.75) ? 'l3' : 'l4')));
        const cell = document.createElement('div'); cell.className = 'hm-cell' + (lvl ? ' ' + lvl : ''); cell.title = `${d.toLocaleDateString()}: ${count} habits`; hm.appendChild(cell);
    }

    // Monthly
    const monthLabels = [], monthData = [];
    for (let i = 5; i >= 0; i--) {
        let my = t.y, mm = t.m - i; if (mm < 0) { mm += 12; my-- }
        monthLabels.push(new Date(my, mm, 1).toLocaleDateString('en-US', { month: 'short' }));
        let done = 0, cap = 0;
        const capD = (my === t.y && mm === t.m) ? t.d : daysInMonth(my, mm);
        habits.forEach(h => { for (let d = 1; d <= capD; d++) { cap++; if (h.done && h.done[dateKey(my, mm, d)]) done++ } });
        monthData.push(cap > 0 ? Math.round(done / cap * 100) : 0);
    }
    if (monthlyChartInst) monthlyChartInst.destroy();
    const ctx1 = document.getElementById('monthlyChart').getContext('2d');
    monthlyChartInst = new Chart(ctx1, { type: 'bar', data: { labels: monthLabels, datasets: [{ label: 'Consistency %', data: monthData, backgroundColor: 'rgba(201,168,76,0.3)', borderColor: '#c9a84c', borderWidth: 1.5, borderRadius: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#8a8070', callback: v => v + '%' }, grid: { color: 'rgba(14,14,14,0.05)' } }, x: { ticks: { font: { family: 'DM Mono', size: 10 }, color: '#8a8070' }, grid: { display: false } } } } });

    // Weekly
    const wLabels = ['Wk1', 'Wk2', 'Wk3', 'Wk4'], wData = [0, 0, 0, 0];
    for (let w = 0; w < 4; w++) { let done = 0, cap = 0; for (let d = w * 7 + 1; d <= Math.min((w + 1) * 7, t.d); d++) { habits.forEach(h => { cap++; if (h.done && h.done[dateKey(t.y, t.m, d)]) done++ }) } wData[w] = cap > 0 ? Math.round(done / cap * 100) : 0 }
    if (weeklyChartInst) weeklyChartInst.destroy();
    const ctxW = document.getElementById('weeklyChart').getContext('2d');
    weeklyChartInst = new Chart(ctxW, { type: 'line', data: { labels: wLabels, datasets: [{ label: '%', data: wData, borderColor: '#8a6b22', backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1.5, pointRadius: 4, pointBackgroundColor: '#c9a84c', fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#8a8070', callback: v => v + '%' }, grid: { color: 'rgba(14,14,14,0.05)' } }, x: { ticks: { font: { family: 'DM Mono', size: 10 }, color: '#8a8070' }, grid: { display: false } } } } });

    // Year selector
    buildYearSelector();

    // Per-habit
    const bd = document.getElementById('habitBreakdown'); bd.innerHTML = '';
    habits.forEach(h => {
        let done = 0; for (let d = 1; d <= t.d; d++) { if (h.done && h.done[dateKey(t.y, t.m, d)]) done++ }
        const pct = t.d > 0 ? Math.round(done / t.d * 100) : 0;
        const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin-bottom:0.6rem;';
        row.innerHTML = `<span style="font-size:1rem;width:20px;text-align:center;">${h.icon}</span><span style="font-size:0.75rem;flex:1;">${h.name}</span><div style="flex:2;height:5px;background:var(--cream);border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:var(--gold);border-radius:2px;transition:width 0.5s;"></div></div><span style="font-size:0.68rem;color:var(--muted);min-width:30px;text-align:right;">${pct}%</span>`;
        bd.appendChild(row);
    });

    // Streak leaderboard
    const sl = document.getElementById('streakLeaderboard'); sl.innerHTML = '';
    const ranked = [...habits].map(h => ({ ...h, streak: getStreak(h) })).sort((a, b) => b.streak - a.streak);
    ranked.forEach((h, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;padding:0.6rem;background:var(--cream);border-radius:3px;';
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        row.innerHTML = `<span style="font-size:0.75rem;color:var(--muted);width:16px;">${medal || '#' + (i + 1)}</span><span style="font-size:1rem;">${h.icon}</span><span style="font-size:0.75rem;flex:1;">${h.name}</span><span style="font-size:0.75rem;color:var(--gold-dark);font-family:'DM Serif Display',serif;">${h.streak}d</span>`;
        sl.appendChild(row);
    });
}

// ── YEAR SELECTOR ──
function buildYearSelector() {
    const sel = document.getElementById('yearSelector');
    if (!sel) return;
    sel.innerHTML = '';
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    years.forEach(yr => {
        const btn = document.createElement('button');
        btn.className = 'year-pill' + (yr === selectedYearForChart ? ' active' : '');
        btn.textContent = yr;
        btn.onclick = () => { selectedYearForChart = yr; buildYearChart(yr); buildYearSelector() };
        sel.appendChild(btn);
    });
    buildYearChart(selectedYearForChart);
}

function buildYearChart(yr) {
    const t = today();
    const yLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yData = yLabels.map((_, mi) => {
        const capD = (yr === t.y && mi === t.m) ? t.d : ((yr === t.y && mi > t.m) ? 0 : daysInMonth(yr, mi));
        if (capD === 0) return 0;
        let done = 0, cap = 0; habits.forEach(h => { for (let d = 1; d <= capD; d++) { cap++; if (h.done && h.done[dateKey(yr, mi, d)]) done++ } });
        return cap > 0 ? Math.round(done / cap * 100) : 0;
    });
    if (yearlyChartInst) yearlyChartInst.destroy();
    const ctx2 = document.getElementById('yearlyChart').getContext('2d');
    yearlyChartInst = new Chart(ctx2, { type: 'line', data: { labels: yLabels, datasets: [{ label: `${yr} Consistency %`, data: yData, borderColor: '#8a6b22', backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1.5, pointRadius: 3, pointBackgroundColor: '#c9a84c', fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#8a8070', callback: v => v + '%' }, grid: { color: 'rgba(14,14,14,0.05)' } }, x: { ticks: { font: { family: 'DM Mono', size: 10 }, color: '#8a8070' }, grid: { display: false } } } } });

    const bml = document.getElementById('bestMonthsList'); if (!bml) return;
    bml.innerHTML = '';
    const scored = yData.map((v, i) => ({ month: yLabels[i], pct: v })).filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 4);
    scored.forEach(({ month, pct }) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;';
        row.innerHTML = `<span style="font-size:0.75rem;width:30px;">${month}</span><div style="flex:1;height:5px;background:var(--cream);border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:var(--gold);border-radius:2px;"></div></div><span style="font-size:0.68rem;color:var(--muted);min-width:30px;text-align:right;">${pct}%</span>`;
        bml.appendChild(row);
    });
}

// ── EDIT PROFILE ──
window.openEditProfile = () => {
    closeDropdown();
    document.getElementById('ep-displayName').value = userProfile.displayName || '';
    document.getElementById('ep-username').value = userProfile.username || '';
    document.getElementById('ep-bio').value = userProfile.bio || '';
    document.getElementById('ep-about').value = userProfile.about || '';
    document.getElementById('ep-photo').value = userProfile.photoURL || '';
    document.getElementById('ep-dob').value = userProfile.dob || '';
    document.getElementById('ep-location').value = userProfile.location || '';
    const soc = userProfile.social || {};
    document.getElementById('ep-twitter').value = soc.twitter || '';
    document.getElementById('ep-instagram').value = soc.instagram || '';
    document.getElementById('ep-github').value = soc.github || '';
    document.getElementById('ep-linkedin').value = soc.linkedin || '';
    document.getElementById('ep-youtube').value = soc.youtube || '';
    document.getElementById('ep-website').value = soc.website || '';
    document.getElementById('ep-error').style.display = 'none';
    openModal('editProfileModal');
};

window.saveProfile = async () => {
    const dn = document.getElementById('ep-displayName').value.trim();
    const un = document.getElementById('ep-username').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const bio = document.getElementById('ep-bio').value.trim();
    const about = document.getElementById('ep-about').value.trim();
    const photo = document.getElementById('ep-photo').value.trim();
    const dob = document.getElementById('ep-dob').value;
    const location = document.getElementById('ep-location').value.trim();
    const social = {
        twitter: document.getElementById('ep-twitter').value.trim(),
        instagram: document.getElementById('ep-instagram').value.trim(),
        github: document.getElementById('ep-github').value.trim(),
        linkedin: document.getElementById('ep-linkedin').value.trim(),
        youtube: document.getElementById('ep-youtube').value.trim(),
        website: document.getElementById('ep-website').value.trim(),
    };
    const errEl = document.getElementById('ep-error');
    if (!dn) { errEl.textContent = 'Display name required.'; errEl.style.display = 'block'; return }
    if (un && !/^[a-z0-9_]{2,24}$/.test(un)) { errEl.textContent = 'Username: 2-24 chars, a-z 0-9 _ only.'; errEl.style.display = 'block'; return }
    errEl.style.display = 'none';
    const updates = { displayName: dn, username: un || userProfile.username, bio, about, photoURL: photo, dob, location, social };
    await updateDoc(doc(db, 'users', currentUser.uid), updates);
    userProfile = { ...userProfile, ...updates };
    setupNavAvatar(); closeModal('editProfileModal'); showToast('Profile updated!');
};

// ── ACCOUNT SETTINGS ──
window.openAccountSettings = () => { closeDropdown(); openModal('accountSettingsModal'); buildCheckmarkPresets() };
window.savePref = () => {
    const p = { reminder: _pv('pref-reminder'), streak: _pv('pref-streak'), weekly: _pv('pref-weekly'), public: _pv('pref-public'), showstreaks: _pv('pref-showstreaks'), compact: _pv('pref-compact'), daynums: _pv('pref-daynums'), drag: _pv('pref-drag'), showedit: _pv('pref-showedit'), showdelete: _pv('pref-showdelete'), showanalytics: _pv('pref-showanalytics'), showtags: _pv('pref-showtags'), showbar: _pv('pref-showbar'), showtime: _pv('pref-showtime') };
    localStorage.setItem('consistify-prefs', JSON.stringify(p));
};
function _pv(id) { const el = document.getElementById(id); return el ? el.checked : true }
window.savePrefAndRender = () => { savePref(); render() };
function loadPrefs() {
    const raw = localStorage.getItem('consistify-prefs');
    if (raw) { try { const p = JSON.parse(raw);['reminder', 'streak', 'weekly', 'public', 'showstreaks', 'compact', 'daynums', 'drag', 'showedit', 'showdelete', 'showanalytics', 'showtags', 'showbar', 'showtime'].forEach(k => { const el = document.getElementById('pref-' + k); if (el && p[k] !== undefined) el.checked = p[k] }); applyCompact() } catch (e) { } }
    // Load checkmark
    const ck = localStorage.getItem('consistify-checkmark');
    if (ck) currentCheckmark = ck;
}
window.applyCompact = () => {
    const el = document.getElementById('pref-compact');
    document.body.classList.toggle('compact', el && el.checked);
    savePref();
};

// ── SHARE ──
window.copyShareLink = () => {
    const uid = currentUser ? currentUser.uid : viewUid;
    const url = `${window.location.origin}${window.location.pathname}?view=${uid}`;
    navigator.clipboard.writeText(url).then(() => showToast('Link copied! ↗'));
    closeDropdown();
};

// ── EXPORT ──
window.exportJSON = () => {
    const data = { profile: { displayName: userProfile.displayName, username: userProfile.username }, habits: habits.map(h => ({ name: h.name, icon: h.icon, done: h.done || {}, timeFrom: h.timeFrom || '', timeTo: h.timeTo || '' })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'consistify-habits.json'; a.click(); showToast('JSON exported!');
};
window.exportCSV = () => {
    let csv = 'Habit,Icon,Date,Done\n';
    habits.forEach(h => { const done = h.done || {}; Object.keys(done).sort().forEach(k => { csv += `"${h.name}","${h.icon}","${k}","true"\n` }) });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'consistify-habits.csv'; a.click(); showToast('CSV exported!');
};
window.confirmClearAll = () => { if (confirm('Delete ALL habit data? This cannot be undone.')) { showToast('Feature: implement clear all') } };

// ── MONTH NAV ──
function setView(y, m) { viewYear = y; viewMonth = m; render() }
window.shiftMonth = (dir) => { viewMonth += dir; if (viewMonth > 11) { viewMonth = 0; viewYear++ } if (viewMonth < 0) { viewMonth = 11; viewYear-- } render() };

// ── RENDER ──
function render() {
    const t = today();
    const days = daysInMonth(viewYear, viewMonth);
    const isCurrentMonth = (viewYear === t.y && viewMonth === t.m);
    const showDayNums = _pv('pref-daynums');
    const showDrag = _pv('pref-drag');
    const showEdit = !isPublicView && _pv('pref-showedit');
    const showDel = !isPublicView && _pv('pref-showdelete');
    const showAnalytics = !isPublicView && _pv('pref-showanalytics');
    const showTags = _pv('pref-showtags');
    const showBar = _pv('pref-showbar');
    const showTime = _pv('pref-showtime');

    const label = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const btn = document.getElementById('monthLabel');
    btn.querySelector('span').textContent = label;

    const todayKey = dateKey(t.y, t.m, t.d);
    let doneCt = 0, bestSt = 0;
    habits.forEach(h => { if (h.done && h.done[todayKey]) doneCt++; const s = getStreak(h); if (s > bestSt) bestSt = s });
    const rate = habits.length ? Math.round(doneCt / habits.length * 100) : 0;
    document.getElementById('statHabits').textContent = habits.length;
    document.getElementById('statStreak').textContent = bestSt;
    document.getElementById('statRate').textContent = rate + '%';
    document.getElementById('statDone').textContent = doneCt + '/' + habits.length;

    const list = document.getElementById('habitList'); list.innerHTML = '';

    if (!habits.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:4rem 2rem;color:var(--muted);';
        empty.innerHTML = `<div style="font-family:DM Serif Display,serif;font-size:3rem;color:var(--cream);margin-bottom:0.5rem;">∅</div><p style="font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;">${isPublicView ? 'No habits tracked yet.' : 'Tap + to add your first habit.'}</p>`;
        list.appendChild(empty); return;
    }

    habits.forEach(habit => {
        const pct = monthPct(habit, viewYear, viewMonth);
        const s = getStreak(habit); const bs = getBestStreak(habit);
        const row = document.createElement('div'); row.className = 'habit-row';

        let dayNums = '', dayCells = '';
        for (let d = 1; d <= days; d++) {
            const isFuture = isCurrentMonth && d > t.d;
            const isToday = isCurrentMonth && d === t.d;
            const k = dateKey(viewYear, viewMonth, d);
            const done = !!(habit.done && habit.done[k]);
            if (showDayNums) dayNums += `<div class="day-num${isToday ? ' today-lbl' : ''}">${d}</div>`;
            dayCells += `<div class="day-cell${done ? ' done' : ''}${isToday ? ' today' : ''}${isFuture ? ' future' : ''}" data-check="${currentCheckmark}" onclick="toggleDay('${habit.id}',${viewYear},${viewMonth},${d})" title="${new Date(viewYear, viewMonth, d).toLocaleDateString()}"></div>`;
        }

        const timeBadge = (showTime && (habit.timeFrom || habit.timeTo)) ? `<span class="habit-time-badge"><i class="fa fa-clock" style="font-size:0.55rem;"></i>${habit.timeFrom ? formatTime12(habit.timeFrom) : ''}${habit.timeFrom && habit.timeTo ? ' – ' : ''}${habit.timeTo ? formatTime12(habit.timeTo) : ''}</span>` : '';

        const tagsHtml = showTags ? `<div class="habit-tags">
      ${s > 0 ? `<span class="tag tag-streak"><i class="fa fa-fire" style="font-size:0.55rem;"></i> ${s}d</span>` : ''}
      ${bs > 1 ? `<span class="tag tag-best"><i class="fa fa-trophy" style="font-size:0.5rem;"></i> ${bs}</span>` : ''}
      <span class="tag tag-pct">${pct}%</span>
    </div>`: '';

        const actionsHtml = (showEdit || showDel || showAnalytics) ? `<div class="habit-actions">
      ${showAnalytics ? `<button class="btn-icon-sm analytics" onclick="openHabitAnalytics('${habit.id}')" title="Analytics"><i class="fa fa-chart-simple"></i></button>` : ''}
      ${showEdit ? `<button class="btn-icon-sm edit-hab" onclick="promptEdit('${habit.id}')" title="Edit"><i class="fa fa-pen"></i></button>` : ''}
      ${showDel ? `<button class="btn-icon-sm del" onclick="promptDelete('${habit.id}')" title="Delete"><i class="fa fa-trash-can"></i></button>` : ''}
    </div>`: '';

        const dragHtml = (!isPublicView && showDrag) ? `<span class="drag-handle" title="Drag to reorder"><i class="fa fa-grip-vertical"></i></span>` : '';

        row.innerHTML = `
      <div class="habit-head">
        ${dragHtml}
        <span class="habit-icon">${habit.icon}</span>
        <span class="habit-name">${habit.name}</span>
        ${timeBadge}
        ${tagsHtml}
        ${actionsHtml}
      </div>
      ${showBar ? `<div class="habit-bar"><div class="habit-bar-fill" style="width:${pct}%"></div></div>` : ''}
      ${showDayNums ? `<div class="days-header-row" style="grid-template-columns:repeat(${days},1fr);padding:0.5rem 1.25rem 0.2rem;">${dayNums}</div>` : ''}
      <div class="days-grid-row" style="grid-template-columns:repeat(${days},1fr);padding:0.5rem 1.25rem 1rem;">${dayCells}</div>`;
        list.appendChild(row);
    });
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(o => { o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open') }) });