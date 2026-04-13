(function () {
    // loader
    window.addEventListener('load', () => { setTimeout(() => document.getElementById('loader').classList.add('gone'), 900); });

    // routes
    window.goLogin = () => {
        document.getElementById('loader').classList.remove('gone');
        setTimeout(() => window.location.href = '../Login/', 250);
    };
    window.openPublicView = () => {
        // pre-filled UID
        const prefilled = 'iwfE5soGdAURkFuCl2hybO2gqGo1';
        const uid = prompt('Enter shared tracker ID:', prefilled);
        if (uid && uid.trim()) {
            document.getElementById('loader').classList.remove('gone');
            setTimeout(() => window.location.href = `../DashBoard/index.html?view=${uid.trim()}`, 200);
        }
    };

    // marquee
    const mqItems = [
        { t: 'Habit Tracking', hl: false }, { t: '★', hl: false },
        { t: 'Streak Engine', hl: true }, { t: '★', hl: false },
        { t: 'Cloud Sync', hl: false }, { t: '★', hl: false },
        { t: 'Analytics', hl: true }, { t: '★', hl: false },
        { t: 'Public Sharing', hl: false }, { t: '★', hl: false },
        { t: 'Export Data', hl: true }, { t: '★', hl: false },
        { t: 'Free Forever', hl: false }, { t: '★', hl: false },
        { t: 'Google Sign-in', hl: true }, { t: '★', hl: false },
    ];
    const mq = document.getElementById('mqTrack');
    for (let i = 0; i < 4; i++) {
        mqItems.forEach(item => {
            const s = document.createElement('span');
            s.className = 'marquee-item' + (item.hl ? ' hl' : '');
            s.textContent = item.t;
            mq.appendChild(s);
        });
    }

    // ticker
    const tickerItems = ['Build your streak', 'Stay consistent', 'Track what matters', 'Share your wins', 'Never miss a day', 'One tap check-in', 'Visual progress', 'Real discipline'];
    const tk = document.getElementById('ticker');
    for (let i = 0; i < 4; i++) {
        tickerItems.forEach((t, j) => {
            const s = document.createElement('span');
            s.className = 'ticker-item';
            s.innerHTML = t + (j < tickerItems.length - 1 ? ` <span class="ticker-sep">·</span>` : '');
            tk.appendChild(s);
        });
    }

    // dots
    function buildDots(id, pattern) {
        const el = document.getElementById(id); if (!el) return; el.innerHTML = '';
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

    // month
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    const mel = document.getElementById('hwMonthName');
    if (mel) mel.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;

    // reveal
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.sr').forEach(el => io.observe(el));

    // cursor
    document.querySelectorAll('button,a').forEach(el => el.style.cursor = 'pointer');
})();