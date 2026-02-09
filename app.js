// التطبيق الرئيسي الحقيقي
class RiyadAnimeApp {
    constructor() {
        this.state = {
            user: null,
            userData: null,
            favorites: [],
            watchHistory: [],
            watchList: [],
            currentAnime: null,
            currentSection: 'home',
            animeCache: new Map()
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل رياض أنمي...');
        
        try {
            // تهيئة جميع الخدمات
            await window.authService.init();
            await window.animeService.init();
            window.videoPlayer.init();
            
            this.setupEventListeners();
            this.setupAuthListener();
            await this.loadInitialData();
            this.updateUI();
            
            // إخفاء شاشة التحميل
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
            }, 1500);
            
            console.log('✅ التطبيق جاهز للاستخدام!');
        } catch (error) {
            console.error('❌ خطأ في تهيئة التطبيق:', error);
            this.showNotification('حدث خطأ في تحميل التطبيق', 'error');
        }
    }

    setupEventListeners() {
        // أزرار المصادقة
        document.getElementById('openLoginBtn').addEventListener('click', () => this.openAuthModal('login'));
        document.getElementById('openRegisterBtn').addEventListener('click', () => this.openAuthModal('register'));
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeAuthModal());
        
        // تسجيل الدخول بجوجل
        document.getElementById('googleLoginBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.signInWithGoogle();
        });
        
        document.getElementById('googleRegisterBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.signInWithGoogle();
        });
        
        // نماذج المصادقة
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // البحث
        document.getElementById('searchBtn').addEventListener('click', () => this.searchAnime());
        document.getElementById('searchBox').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchAnime();
        });
        
        // القائمة الجانبية
        document.querySelectorAll('.sidebar-menu li').forEach(item => {
            item.addEventListener('click', () => this.switchSection(item.dataset.section));
        });
        
        // القائمة المتنقلة
        document.getElementById('mobileMenuToggle').addEventListener('click', () => this.toggleMobileMenu());
        document.getElementById('sidebarClose').addEventListener('click', () => this.toggleMobileMenu());
        
        // الملف الشخصي
        document.getElementById('profileLogoutBtn').addEventListener('click', () => this.logout());
        
        // أزرار إظهار كلمة المرور
        document.querySelectorAll('.show-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = e.target.closest('button').previousElementSibling;
                this.togglePasswordVisibility(input);
            });
        });
        
        // تبديل التبويبات
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchAuthTab(tab.dataset.tab));
        });
    }

    setupAuthListener() {
        if (window.authService && window.authService.auth) {
            window.authService.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.state.user = user;
                    await this.loadUserData();
                    this.updateUI();
                    this.showNotification(`مرحباً ${this.state.userData?.username || 'بك'}!`, 'success');
                } else {
                    this.state.user = null;
                    this.state.userData = null;
                    this.state.favorites = [];
                    this.state.watchHistory = [];
                    this.state.watchList = [];
                    this.updateUI();
                }
            });
        }
    }

    async loadUserData() {
        if (!this.state.user || !window.authService) return;
        
        try {
            const userData = await window.authService.getUserData(this.state.user.uid);
            
            if (userData) {
                this.state.userData = userData;
                this.state.favorites = userData.favorites || [];
                this.state.watchHistory = userData.watchHistory || [];
                this.state.watchList = userData.watchList || [];
            }
            
            this.updateProfileInfo();
        } catch (error) {
            console.error('❌ خطأ في تحميل بيانات المستخدم:', error);
        }
    }

    async handleRegister() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!username || !email || !password || !confirmPassword) {
            this.showError('registerError', 'يرجى ملء جميع الحقول');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('registerError', 'كلمات المرور غير متطابقة');
            return;
        }
        
        if (password.length < 6) {
            this.showError('registerError', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }
        
        if (!document.getElementById('termsAgree').checked) {
            this.showError('registerError', 'يجب الموافقة على الشروط والأحكام');
            return;
        }
        
        try {
            const result = await window.authService.registerWithEmail(username, email, password);
            
            if (result.success) {
                this.closeAuthModal();
                this.showNotification(`🎉 مرحباً ${username}! تم إنشاء حسابك بنجاح`, 'success');
            }
        } catch (error) {
            this.showError('registerError', error);
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showError('loginError', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }
        
        try {
            const result = await window.authService.loginWithEmail(email, password);
            
            if (result.success) {
                this.closeAuthModal();
                this.showNotification('تم تسجيل الدخول بنجاح!', 'success');
            }
        } catch (error) {
            this.showError('loginError', error);
        }
    }

    async signInWithGoogle() {
        try {
            const result = await window.authService.loginWithGoogle();
            
            if (result.success) {
                this.closeAuthModal();
                this.showNotification('تم تسجيل الدخول بنجاح!', 'success');
            }
        } catch (error) {
            this.showError('loginError', error);
        }
    }

    async logout() {
        try {
            await window.authService.logout();
            this.showNotification('تم تسجيل الخروج بنجاح', 'info');
        } catch (error) {
            this.showNotification('فشل تسجيل الخروج', 'error');
        }
    }

    async loadInitialData() {
        await this.loadCategories();
        await this.loadLatestAnime();
        await this.loadPopularAnime();
        await this.loadTrendingAnime();
    }

    async loadCategories() {
        const categories = await window.animeService.getCategories();
        const container = document.getElementById('categoriesGrid');
        
        if (container) {
            container.innerHTML = categories.map(category => `
                <div class="category-card" onclick="app.searchByCategory('${category.name}')">
                    <i class="${category.icon}"></i>
                    <h4>${category.name}</h4>
                    <p>${category.description}</p>
                </div>
            `).join('');
        }
    }

    async loadLatestAnime() {
        try {
            const animeList = await window.animeService.getLatestAnime();
            this.renderAnimeGrid(animeList, 'latestAnime');
            document.getElementById('latestLoading').style.display = 'none';
            document.getElementById('latestCount').textContent = animeList.length;
        } catch (error) {
            console.error('❌ خطأ في تحميل أحدث الأنمي:', error);
            document.getElementById('latestLoading').style.display = 'none';
        }
    }

    async loadPopularAnime() {
        try {
            const animeList = await window.animeService.getPopularAnime();
            this.renderAnimeGrid(animeList, 'popularAnime');
            document.getElementById('popularLoading').style.display = 'none';
            document.getElementById('popularCount').textContent = animeList.length;
        } catch (error) {
            console.error('❌ خطأ في تحميل الأنمي الشائعة:', error);
            document.getElementById('popularLoading').style.display = 'none';
        }
    }

    async loadTrendingAnime() {
        try {
            const animeList = await window.animeService.getTrendingAnime();
            this.renderAnimeGrid(animeList, 'trendingAnime');
            document.getElementById('trendingLoading').style.display = 'none';
            document.getElementById('trendingCount').textContent = animeList.length;
        } catch (error) {
            console.error('❌ خطأ في تحميل الأنمي الأكثر انتشاراً:', error);
            document.getElementById('trendingLoading').style.display = 'none';
        }
    }

    renderAnimeGrid(animeList, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !animeList) return;

        container.innerHTML = animeList.map(anime => `
            <div class="anime-card" data-id="${anime.mal_id}">
                <div class="anime-badge">${anime.type || 'TV'}</div>
                <img src="${anime.images?.jpg?.large_image_url || 'https://via.placeholder.com/300x400/111/333?text=Anime'}" 
                     alt="${anime.title}" class="anime-image">
                <div class="anime-info">
                    <h3 class="anime-title">${anime.title_arabic || anime.title}</h3>
                    <div class="anime-meta">
                        <span class="rating">
                            <i class="fas fa-star"></i> ${anime.score || 'N/A'}
                        </span>
                        <span>${anime.episodes || '?'} حلقة</span>
                    </div>
                    <div class="anime-genres">
                        ${(anime.genres?.slice(0, 2) || []).map(genre => 
                            `<span class="genre-tag">${genre.name}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.anime-card').forEach(card => {
            card.addEventListener('click', async () => {
                const animeId = parseInt(card.dataset.id);
                await this.watchAnime(animeId, 1);
            });
        });
    }

    async watchAnime(animeId, episodeNumber = 1) {
        if (!this.state.user) {
            this.showNotification('يجب تسجيل الدخول لمشاهدة الأنمي', 'error');
            this.openAuthModal('login');
            return;
        }
        
        try {
            // جلب تفاصيل الأنمي
            let anime = this.state.animeCache.get(animeId);
            
            if (!anime) {
                anime = await window.animeService.getAnimeDetails(animeId);
                if (anime) {
                    this.state.animeCache.set(animeId, anime);
                }
            }
            
            if (!anime) {
                throw new Error('لم يتم العثور على الأنمي');
            }
            
            // حفظ في سجل المشاهدة
            this.addToWatchHistory(animeId, episodeNumber);
            
            // فتح المشغل
            await window.videoPlayer.openPlayer(anime, episodeNumber);
            
        } catch (error) {
            console.error('❌ خطأ في فتح المشغل:', error);
            this.showNotification('خطأ في تحميل الفيديو', 'error');
        }
    }

    addToWatchHistory(animeId, episodeNumber) {
        if (!this.state.user) return;
        
        const watchEntry = {
            animeId,
            episodeNumber,
            timestamp: new Date().toISOString(),
            title: `أنمي ${animeId}`
        };
        
        this.state.watchHistory.unshift(watchEntry);
        this.state.watchHistory = this.state.watchHistory.slice(0, 50);
        
        this.saveUserData();
        this.updateUI();
    }

    async saveUserData() {
        if (!this.state.user || !this.state.userData) return;
        
        try {
            await window.authService.saveUserData(this.state.user.uid, {
                ...this.state.userData,
                favorites: this.state.favorites,
                watchHistory: this.state.watchHistory,
                watchList: this.state.watchList
            });
        } catch (error) {
            console.error('❌ خطأ في حفظ بيانات المستخدم:', error);
        }
    }

    updateUI() {
        const loginBtn = document.getElementById('openLoginBtn');
        const registerBtn = document.getElementById('openRegisterBtn');
        
        if (this.state.user) {
            loginBtn.innerHTML = `<i class="fas fa-user"></i> ${this.state.userData?.username || 'حسابي'}`;
            loginBtn.onclick = () => this.switchSection('profile');
            
            registerBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> تسجيل الخروج';
            registerBtn.onclick = () => this.logout();
        } else {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
            loginBtn.onclick = () => this.openAuthModal('login');
            
            registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء حساب';
            registerBtn.onclick = () => this.openAuthModal('register');
        }
        
        this.updateCounts();
        this.updateProfileInfo();
    }

    updateCounts() {
        document.getElementById('favoritesCount').textContent = this.state.favorites.length;
        document.getElementById('watchlistCount').textContent = this.state.watchList.length;
        document.getElementById('historyCount').textContent = this.state.watchHistory.length;
    }

    updateProfileInfo() {
        if (this.state.userData) {
            document.getElementById('profileUsername').textContent = this.state.userData.username;
            document.getElementById('profileEmail').textContent = this.state.userData.email;
            document.getElementById('profileFavorites').textContent = this.state.favorites.length;
            document.getElementById('profileWatched').textContent = this.state.watchHistory.length;
            document.getElementById('profileWatchlist').textContent = this.state.watchList.length;
        } else {
            document.getElementById('profileUsername').textContent = 'مرحباً!';
            document.getElementById('profileEmail').textContent = 'سجل الدخول لعرض معلومات حسابك';
            document.getElementById('profileFavorites').textContent = '0';
            document.getElementById('profileWatched').textContent = '0';
            document.getElementById('profileWatchlist').textContent = '0';
        }
    }

    openAuthModal(tab = 'login') {
        document.getElementById('authModal').style.display = 'flex';
        this.switchAuthTab(tab);
        this.clearErrors();
    }

    closeAuthModal() {
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        this.clearErrors();
    }

    switchAuthTab(tabId) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Content`);
        });
    }

    switchSection(sectionId) {
        document.querySelectorAll('.sidebar-menu li').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            }
        });
        
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(`${sectionId}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.state.currentSection = sectionId;
        }
        
        document.querySelector('.sidebar').classList.remove('active');
    }

    toggleMobileMenu() {
        document.querySelector('.sidebar').classList.toggle('active');
    }

    togglePasswordVisibility(input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    clearErrors() {
        document.querySelectorAll('.error-message').forEach(error => {
            error.style.display = 'none';
        });
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        
        if (!notification || !text) return;
        
        text.textContent = message;
        
        notification.style.background = type === 'error' ? 'var(--accent-red)' : 
                                      type === 'success' ? 'var(--accent-green)' : 
                                      'var(--accent-blue)';
        
        notification.style.display = 'flex';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    async searchAnime() {
        const query = document.getElementById('searchBox').value.trim();
        if (!query) {
            this.showNotification('يرجى إدخال كلمة البحث', 'error');
            return;
        }
        
        try {
            const results = await window.animeService.searchAnime(query);
            this.showNotification(`عُثر على ${results.length} نتيجة لـ "${query}"`, 'info');
        } catch (error) {
            console.error('❌ خطأ في البحث:', error);
            this.showNotification('خطأ في البحث', 'error');
        }
    }

    async searchByCategory(categoryName) {
        this.showNotification(`البحث في تصنيف ${categoryName}`, 'info');
    }
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
    document.getElementById('themeSwitch').checked = savedTheme === 'dark';
    
    document.getElementById('themeSwitch').addEventListener('change', (e) => {
        localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
        document.body.classList.toggle('dark-theme', e.target.checked);
    });
    
    window.app = new RiyadAnimeApp();
});