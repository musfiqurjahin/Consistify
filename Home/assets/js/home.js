(function () {
    "use strict";

    // Loader
    const initialLoader = document.getElementById('initial-loader');
    window.addEventListener('load', () => { setTimeout(() => initialLoader.classList.add('hidden-loader'), 600); });
    if (document.readyState === 'complete') { setTimeout(() => initialLoader.classList.add('hidden-loader'), 100); }

    // Navigation
    function navigateTo(url) { window.location.href = url; }
    const SIGNIN_URL = '../Login/';
    function openPublicViewFlow() {
        const prefilled = 'iwfE5soGdAURkFuCl2hybO2gqGo1';
        const uid = prompt('Enter shared tracker ID:', prefilled);
        if (uid && uid.trim()) { navigateTo(`../Dashboard/index.html?view=${uid.trim()}`); }
    }

    // Attach event listeners
    ['signInBtn', 'heroSignIn', 'ctaGoogle', 'footerLogin'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); navigateTo(SIGNIN_URL); });
    });
    ['publicViewBtn', 'heroPublic', 'ctaPublic', 'footerPublic'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); openPublicViewFlow(); });
    });
    document.querySelectorAll('.footer-link[href="#"]').forEach(l => {
        if (!l.id) l.addEventListener('click', (e) => e.preventDefault());
    });

    // Marquee
    const mqTrack = document.getElementById('mqTrack');
    const items = [{ t: 'Habit Tracking', hl: false }, { t: '★', hl: false }, { t: 'Streak Engine', hl: true }, { t: '★', hl: false }, { t: 'Cloud Sync', hl: false }, { t: '★', hl: false }, { t: 'Analytics', hl: true }, { t: '★', hl: false }, { t: 'Public Sharing', hl: false }, { t: '★', hl: false }, { t: 'Export Data', hl: true }, { t: '★', hl: 14 }, { t: 'Free Forever', hl: false }, { t: '★', hl: false }, { t: 'Google Sign-in', hl: true }];
    for (let i = 0; i < 4; i++) items.forEach(it => {
        const s = document.createElement('span');
        s.className = 'marquee-item' + (it.hl ? ' hl' : '');
        s.textContent = it.t;
        mqTrack.appendChild(s);
    });

    // Ticker
    const ticker = document.getElementById('ticker');
    const words = ['Build your streak', 'Stay consistent', 'Track what matters', 'Share your wins', 'Never miss a day', 'One tap check-in', 'Visual progress', 'Real discipline'];
    for (let i = 0; i < 4; i++) words.forEach((w, j) => {
        const sp = document.createElement('span');
        sp.className = 'ticker-item';
        sp.innerHTML = w + (j < words.length - 1 ? ' <span class="ticker-sep">·</span>' : '');
        ticker.appendChild(sp);
    });

    // Dots
    function buildDots(id, pattern) {
        const el = document.getElementById(id);
        el.innerHTML = '';
        pattern.forEach(v => {
            const d = document.createElement('div');
            d.className = 'hwd' + (v === 2 ? ' on' : v === 1 ? ' half' : '');
            if (v === 2) d.textContent = '✓';
            el.appendChild(d);
        });
    }
    buildDots('hd1', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0]);
    buildDots('hd2', [2, 0, 2, 2, 2, 1, 2, 2, 2, 0, 2, 2, 2]);
    buildDots('hd3', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);

    // Calendar functionality
    const monthNameEl = document.getElementById('hwMonthName');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let currentDate = new Date();
    let displayYear = currentDate.getFullYear();
    let displayMonth = currentDate.getMonth();

    function updateMonthDisplay() {
        monthNameEl.textContent = `${months[displayMonth]} ${displayYear}`;
        renderCalendarGrid();
    }

    function changeMonth(delta) {
        displayMonth += delta;
        if (displayMonth < 0) { displayMonth = 11; displayYear--; }
        else if (displayMonth > 11) { displayMonth = 0; displayYear++; }
        updateMonthDisplay();
    }

    document.getElementById('prevMonthBtn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonthBtn').addEventListener('click', () => changeMonth(1));

    // Calendar picker
    const calDropdown = document.getElementById('calendarDropdown');
    const calToggle = document.getElementById('calendarToggleBtn');
    const calYearLabel = document.getElementById('calYearLabel');
    const calGrid = document.getElementById('calMonthGrid');
    const calPrevYear = document.getElementById('calPrevYear');
    const calNextYear = document.getElementById('calNextYear');

    let pickerYear = displayYear;

    function renderCalendarGrid() {
        calYearLabel.textContent = pickerYear;
        calGrid.innerHTML = '';
        for (let m = 0; m < 12; m++) {
            const btn = document.createElement('button');
            btn.className = 'cal-month-btn';
            if (pickerYear === displayYear && m === displayMonth) btn.classList.add('active');
            btn.textContent = months[m].substring(0, 3);
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-selected', pickerYear === displayYear && m === displayMonth);
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                displayYear = pickerYear;
                displayMonth = m;
                updateMonthDisplay();
                calDropdown.classList.remove('show');
                calToggle.setAttribute('aria-expanded', 'false');
            });
            calGrid.appendChild(btn);
        }
    }

    function changePickerYear(delta) {
        pickerYear += delta;
        renderCalendarGrid();
    }

    calPrevYear.addEventListener('click', (e) => { e.stopPropagation(); changePickerYear(-1); });
    calNextYear.addEventListener('click', (e) => { e.stopPropagation(); changePickerYear(1); });

    calToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        pickerYear = displayYear;
        renderCalendarGrid();
        calDropdown.classList.toggle('show');
        calToggle.setAttribute('aria-expanded', calDropdown.classList.contains('show'));
    });

    document.addEventListener('click', (e) => {
        if (!calDropdown.contains(e.target) && e.target !== calToggle && !calToggle.contains(e.target)) {
            calDropdown.classList.remove('show');
            calToggle.setAttribute('aria-expanded', 'false');
        }
    });

    updateMonthDisplay();

    // Scroll reveal
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('vis');
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.sr').forEach(el => io.observe(el));
})();