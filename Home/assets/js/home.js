(function () {
    const loadingEl = document.getElementById('loadingScreen');

    // Navigate to login.html with smooth loading animation
    window.navigateToLogin = function () {
        loadingEl.classList.add('active');
        setTimeout(() => {
            window.location.href = '../Login/';
        }, 200);
    };

    // Public view prompt (matches your original logic)
    window.openPublicViewPrompt = function () {
        const uid = prompt('🔍 Enter the shared tracker ID (user ID):');
        if (uid && uid.trim()) {
            loadingEl.classList.add('active');
            setTimeout(() => {
                window.location.href = `../DashBoard/index.html?view=${uid.trim()}`;
            }, 180);
        }
    };

    // additional function to match original checkSharedView
    window.checkSharedView = function () {
        openPublicViewPrompt();
    };

    // remove loading on page show (back/forward cache)
    window.addEventListener('pageshow', () => {
        loadingEl.classList.remove('active');
    });

    // micro interactions: hover effect for stat items (extra animation)
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(el => {
        el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.05)';
            el.style.transition = '0.2s';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
        });
    });

    // Parallax-ish effect on mouse move for hero-right (pro touch)
    const heroRight = document.querySelector('.hero-right');
    if (heroRight) {
        document.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const moveX = (clientX / window.innerWidth - 0.5) * 10;
            const moveY = (clientY / window.innerHeight - 0.5) * 10;
            heroRight.style.transform = `translateY(-8px) translate(${moveX}px, ${moveY}px) rotate(0.5deg)`;
        });
    }
})();