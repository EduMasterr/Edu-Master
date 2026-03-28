/**
 * Audio Core Manager (Premium Edition)
 * Handles global sound effects for the application
 */
window.AudioCore = {
    _sounds: {
        hover: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Soft Digital Pop
        navigate: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Cyber Click
        thump: 'https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3', // System Fault Buzzer (Critical)
        alert: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3', // High Voltage Electric Spark
        success: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Digital Chime
        welcome: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3', // Epic Sci-Fi Boot Sequence
        add: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Pulse
        save: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Premium Achievement / Grand Success
        save_voice: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Premium Achievement / Grand Success
        delete_voice: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3' // Smooth Success Notification
    },

    play(soundKey) {
        if (!this.isEnabled() || !this._sounds[soundKey]) return;

        try {
            const audio = new Audio(this._sounds[soundKey]);
            audio.volume = 1.0; // MAX Volume for realistic loud effects
            audio.play().catch(e => {
                // Silently handle autoplay blocks
                console.log('Audio Autoplay Blocked:', e);
            });
        } catch (e) {
            console.error('Audio Playback Error:', e);
        }
    },

    // Global Management
    toggleGlobal() {
        const currentState = this.isEnabled();
        const newState = !currentState;
        try { window.Storage?.save('app_audio_enabled', newState); } catch (e) { }

        // Update all toggle icons in current UI
        const icons = document.querySelectorAll('.audio-sidebar-toggle i, #system-audio-btn i');
        icons.forEach(i => {
            i.className = newState ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
        });

        if (newState) {
            // Give a success sound as feedback when turning ON
            setTimeout(() => this.playSuccess(), 50);
        }

        return newState;
    },

    isEnabled() {
        try {
            return window.Storage?.get('app_audio_enabled') !== false;
        } catch (e) {
            return true;
        }
    },

    // Interaction Methods
    playWelcome() { this.play('welcome'); },
    playNavigate() { this.play('navigate'); },
    playScare() { this.play('thump'); },
    playWarning() { this.play('alert'); },
    playSuccess() { this.play('success'); },
    playAdd() { this.play('add'); },
    playSave() { this.play('save'); },
    playSaveVoice() { this.play('save_voice'); },
    playDeleteVoice() { this.play('delete_voice'); },
    playError() { this.play('thump'); }
};
