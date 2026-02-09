// نظام مشغل الفيديو الحقيقي
class VideoPlayer {
    constructor() {
        this.player = null;
        this.currentAnime = null;
        this.currentEpisode = 1;
        this.episodeList = [];
        this.videoSources = [];
        this.currentSourceIndex = 0;
        this.init();
    }

    init() {
        this.initializePlayer();
        this.setupEventListeners();
        console.log('🎬 مشغل الفيديو جاهز');
    }

    initializePlayer() {
        this.player = videojs('animeVideo', {
            controls: true,
            autoplay: true,
            preload: 'auto',
            responsive: true,
            fluid: true,
            playbackRates: [0.5, 1, 1.5, 2],
            language: 'ar',
            controlBar: {
                children: [
                    'playToggle',
                    'volumePanel',
                    'currentTimeDisplay',
                    'timeDivider',
                    'durationDisplay',
                    'progressControl',
                    'remainingTimeDisplay',
                    'playbackRateMenuButton',
                    'fullscreenToggle'
                ]
            },
            sources: [],
            html5: {
                vhs: {
                    overrideNative: true
                },
                nativeAudioTracks: false,
                nativeVideoTracks: false,
                nativeTextTracks: false
            }
        });

        this.player.on('error', () => {
            this.handlePlayerError();
        });
    }

    setupEventListeners() {
        document.getElementById('closePlayerBtn').addEventListener('click', () => this.closePlayer());
        document.getElementById('prevEpisodeBtn').addEventListener('click', () => this.prevEpisode());
        document.getElementById('nextEpisodeBtn').addEventListener('click', () => this.nextEpisode());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('qualityBtn').addEventListener('click', () => this.showQualityMenu());
        document.getElementById('subtitleBtn').addEventListener('click', () => this.showSubtitleMenu());
    }

    async openPlayer(animeData, episodeNumber = 1) {
        this.currentAnime = animeData;
        this.currentEpisode = episodeNumber;
        
        // إظهار قسم المشغل
        this.switchToPlayer();
        
        // تحديث معلومات الحلقة
        this.updateEpisodeInfo();
        
        // تحميل قائمة الحلقات
        await this.loadEpisodeList();
        
        // تحميل وتشغيل الحلقة
        await this.loadAndPlayEpisode();
    }

    switchToPlayer() {
        document.getElementById('player-section').classList.add('active');
        document.querySelectorAll('.content-section').forEach(section => {
            if (section.id !== 'player-section') {
                section.classList.remove('active');
            }
        });
        
        document.getElementById('playerTitle').textContent = this.currentAnime.title_arabic || this.currentAnime.title;
    }

    async loadAndPlayEpisode() {
        try {
            this.showNotification(`جاري تحميل الحلقة ${this.currentEpisode}...`, 'info');
            
            // جلب روابط الفيديو
            this.videoSources = await window.animeService.getVideoSources(
                this.currentAnime.mal_id, 
                this.currentEpisode
            );
            
            if (this.videoSources.length === 0) {
                throw new Error('لم يتم العثور على روابط للحلقة');
            }
            
            // تشغيل أول مصدر
            await this.playVideoSource(this.videoSources[0]);
            
        } catch (error) {
            console.error('❌ خطأ في تحميل الحلقة:', error);
            this.showNotification('خطأ في تحميل الحلقة', 'error');
        }
    }

    async playVideoSource(source) {
        return new Promise((resolve, reject) => {
            this.showNotification(`جاري التشغيل من ${source.server} (${source.quality})`, 'info');
            
            this.player.src({
                src: source.url,
                type: source.type || 'video/mp4'
            });
            
            this.player.ready(() => {
                this.player.play();
                resolve();
            });
            
            this.player.on('error', () => {
                reject(new Error(`فشل تشغيل من ${source.server}`));
            });
        });
    }

    async loadEpisodeList() {
        const container = document.getElementById('episodeList');
        container.innerHTML = '';
        
        // جلب قائمة الحلقات
        this.episodeList = await window.animeService.getAnimeEpisodes(this.currentAnime.mal_id);
        
        // إنشاء أزرار الحلقات
        this.episodeList.forEach(episode => {
            const btn = document.createElement('button');
            btn.className = `episode-btn ${episode.mal_id === this.currentEpisode ? 'active' : ''}`;
            btn.textContent = episode.mal_id;
            btn.title = episode.title_arabic || episode.title;
            btn.onclick = () => this.switchEpisode(episode.mal_id);
            container.appendChild(btn);
        });
    }

    async switchEpisode(episodeNumber) {
        this.currentEpisode = episodeNumber;
        
        // تحديث أزرار الحلقات
        document.querySelectorAll('.episode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.textContent) === episodeNumber) {
                btn.classList.add('active');
            }
        });
        
        // تحديث معلومات الحلقة
        this.updateEpisodeInfo();
        
        // تحميل وتشغيل الحلقة الجديدة
        await this.loadAndPlayEpisode();
    }

    updateEpisodeInfo() {
        const episode = this.episodeList.find(e => e.mal_id === this.currentEpisode) || {};
        document.getElementById('episodeTitle').textContent = 
            episode.title_arabic || episode.title || `الحلقة ${this.currentEpisode}`;
        
        document.getElementById('episodeDuration').textContent = '24:00';
        document.getElementById('episodeDate').textContent = this.getCurrentDate();
    }

    prevEpisode() {
        if (this.currentEpisode > 1) {
            this.switchEpisode(this.currentEpisode - 1);
        }
    }

    nextEpisode() {
        if (this.currentEpisode < this.episodeList.length) {
            this.switchEpisode(this.currentEpisode + 1);
        }
    }

    handlePlayerError() {
        this.currentSourceIndex++;
        
        if (this.currentSourceIndex < this.videoSources.length) {
            this.showNotification('محاولة مصدر آخر...', 'info');
            this.playVideoSource(this.videoSources[this.currentSourceIndex]).catch(() => {
                this.handlePlayerError();
            });
        } else {
            this.showNotification('جميع المصادر فشلت في التشغيل', 'error');
        }
    }

    showQualityMenu() {
        if (this.videoSources.length === 0) return;
        
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.innerHTML = this.videoSources.map((source, index) => `
            <div class="dropdown-item" data-index="${index}">
                <i class="fas fa-video"></i>
                ${source.server} (${source.quality})
            </div>
        `).join('');
        
        const btn = document.getElementById('qualityBtn');
        const rect = btn.getBoundingClientRect();
        
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.zIndex = '10000';
        
        document.body.appendChild(menu);
        
        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.currentSourceIndex = index;
                this.playVideoSource(this.videoSources[index]);
                document.body.removeChild(menu);
            });
        });
        
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target !== btn) {
                    document.body.removeChild(menu);
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    showSubtitleMenu() {
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.innerHTML = `
            <div class="dropdown-item" data-lang="ar">
                <i class="fas fa-closed-captioning"></i> العربية
            </div>
            <div class="dropdown-item" data-lang="en">
                <i class="fas fa-closed-captioning"></i> الإنجليزية
            </div>
            <div class="dropdown-item" data-lang="off">
                <i class="fas fa-times"></i> إيقاف الترجمة
            </div>
        `;
        
        // نفس منطق قائمة الجودة
        // ... (إضافة الأحداث والتحديد)
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    closePlayer() {
        if (this.player) {
            this.player.pause();
        }
        
        document.getElementById('player-section').classList.remove('active');
        document.getElementById('home-section').classList.add('active');
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

    getCurrentDate() {
        return new Date().toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

window.videoPlayer = new VideoPlayer();