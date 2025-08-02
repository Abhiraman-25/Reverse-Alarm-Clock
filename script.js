class ReverseAlarmClock {
    constructor() {
        this.isActive = false;
        this.nextAlarmTime = null;
        this.alarmTimeout = null;
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.history = [];
        
        this.initializeElements();
        this.initializeAudio();
        this.bindEvents();
        this.loadSettings();
        this.updateDisplay();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.testBtn = document.getElementById('testBtn');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.nextAlarm = document.getElementById('nextAlarm');
        this.alarmOverlay = document.getElementById('alarmOverlay');
        this.dismissBtn = document.getElementById('dismissBtn');
        this.historyList = document.getElementById('historyList');
        
        // Settings elements
        this.startTime = document.getElementById('startTime');
        this.endTime = document.getElementById('endTime');
        this.minInterval = document.getElementById('minInterval');
        this.maxInterval = document.getElementById('maxInterval');
        this.soundType = document.getElementById('soundType');
        this.volume = document.getElementById('volume');
        this.volumeValue = document.getElementById('volumeValue');
        this.duration = document.getElementById('duration');
    }

    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Web Audio API not supported:', error);
        }
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.testBtn.addEventListener('click', () => this.testSound());
        this.dismissBtn.addEventListener('click', () => this.dismissAlarm());
        
        // Settings change events
        this.volume.addEventListener('input', (e) => {
            this.volumeValue.textContent = `${e.target.value}%`;
        });
        
        // Save settings on change
        [this.startTime, this.endTime, this.minInterval, this.maxInterval, 
         this.soundType, this.volume, this.duration].forEach(element => {
            element.addEventListener('change', () => this.saveSettings());
        });
    }

    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.updateDisplay();
        this.scheduleNextAlarm();
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Register service worker for background operation
        this.registerServiceWorker();
    }

    stop() {
        this.isActive = false;
        this.clearAlarm();
        this.updateDisplay();
    }

    scheduleNextAlarm() {
        if (!this.isActive) return;
        
        const now = new Date();
        const startTime = this.parseTime(this.startTime.value);
        const endTime = this.parseTime(this.endTime.value);
        
        // Check if we're in the active time window
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const isInActiveWindow = this.isTimeInRange(currentTime, startTime, endTime);
        
        if (!isInActiveWindow) {
            // Schedule for next active window
            const nextActiveTime = this.getNextActiveTime(now, startTime, endTime);
            const delay = nextActiveTime.getTime() - now.getTime();
            this.scheduleAlarm(delay);
            return;
        }
        
        // Generate random interval within min/max range
        const minInterval = parseInt(this.minInterval.value) * 60 * 1000; // Convert to milliseconds
        const maxInterval = parseInt(this.maxInterval.value) * 60 * 1000;
        const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval;
        
        this.scheduleAlarm(randomInterval);
    }

    scheduleAlarm(delay) {
        this.clearAlarm();
        
        this.nextAlarmTime = new Date(Date.now() + delay);
        this.alarmTimeout = setTimeout(() => {
            this.triggerAlarm();
        }, delay);
        
        this.updateDisplay();
    }

    clearAlarm() {
        if (this.alarmTimeout) {
            clearTimeout(this.alarmTimeout);
            this.alarmTimeout = null;
        }
        this.nextAlarmTime = null;
    }

    triggerAlarm() {
        // Add to history
        const alarmRecord = {
            time: new Date().toLocaleTimeString(),
            sound: this.soundType.value,
            date: new Date().toLocaleDateString()
        };
        this.history.unshift(alarmRecord);
        if (this.history.length > 10) {
            this.history.pop();
        }
        this.updateHistory();
        
        // Play sound
        this.playAnnoyingSound();
        
        // Show overlay
        this.alarmOverlay.classList.add('active');
        
        // Send notification
        this.sendNotification();
        
        // Schedule next alarm
        this.scheduleNextAlarm();
    }

    dismissAlarm() {
        this.alarmOverlay.classList.remove('active');
        this.stopSound();
    }

    playAnnoyingSound() {
        if (!this.audioContext) return;
        
        const soundType = this.soundType.value;
        const volume = parseInt(this.volume.value) / 100;
        const duration = parseInt(this.duration.value);
        
        this.oscillator = this.audioContext.createOscillator();
        this.gainNode = this.audioContext.createGain();
        
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        // Set volume
        this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        
        // Configure sound based on type
        switch (soundType) {
            case 'dialup':
                this.createDialupSound();
                break;
            case 'beep':
                this.createBeepSound();
                break;
            case 'squeal':
                this.createSquealSound();
                break;
            case 'static':
                this.createStaticSound();
                break;
            case 'chirp':
                this.createChirpSound();
                break;
            case 'whine':
                this.createWhineSound();
                break;
        }
        
        this.oscillator.start();
        this.oscillator.stop(this.audioContext.currentTime + duration);
    }

    createDialupSound() {
        // Classic dial-up modem sound with carrier tones
        const frequencies = [1209, 1336, 1477, 1633, 697, 770, 852, 941];
        let currentFreq = 0;
        
        const changeFreq = () => {
            if (currentFreq < frequencies.length) {
                this.oscillator.frequency.setValueAtTime(frequencies[currentFreq], this.audioContext.currentTime);
                currentFreq++;
                setTimeout(changeFreq, 200);
            }
        };
        
        this.oscillator.frequency.setValueAtTime(frequencies[0], this.audioContext.currentTime);
        setTimeout(changeFreq, 200);
        
        // Add some modulation
        this.oscillator.frequency.exponentialRampToValueAtTime(
            frequencies[0] * 1.1, 
            this.audioContext.currentTime + 0.1
        );
    }

    createBeepSound() {
        // High-pitched beeping sound
        this.oscillator.type = 'square';
        this.oscillator.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        
        // Create beeping pattern
        let beepCount = 0;
        const beepInterval = setInterval(() => {
            if (beepCount < 10) {
                this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                setTimeout(() => {
                    this.gainNode.gain.setValueAtTime(parseInt(this.volume.value) / 100, this.audioContext.currentTime);
                }, 50);
                beepCount++;
            } else {
                clearInterval(beepInterval);
            }
        }, 300);
    }

    createSquealSound() {
        // Electronic squealing sound
        this.oscillator.type = 'sawtooth';
        this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        
        // Frequency sweep
        this.oscillator.frequency.exponentialRampToValueAtTime(
            3000, 
            this.audioContext.currentTime + 2
        );
        this.oscillator.frequency.exponentialRampToValueAtTime(
            800, 
            this.audioContext.currentTime + 4
        );
    }

    createStaticSound() {
        // Radio static noise
        const bufferSize = this.audioContext.sampleRate * parseInt(this.duration.value);
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.connect(this.gainNode);
        noise.start();
        noise.stop(this.audioContext.currentTime + parseInt(this.duration.value));
    }

    createChirpSound() {
        // Digital chirping sound
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        
        // Create chirping pattern
        let chirpCount = 0;
        const chirpInterval = setInterval(() => {
            if (chirpCount < 15) {
                const freq = 1000 + (chirpCount * 200);
                this.oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                chirpCount++;
            } else {
                clearInterval(chirpInterval);
            }
        }, 150);
    }

    createWhineSound() {
        // Electronic whining sound
        this.oscillator.type = 'triangle';
        this.oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        
        // Slow frequency modulation
        this.oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        this.oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 1);
        this.oscillator.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + 2);
        this.oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 3);
    }

    stopSound() {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator = null;
        }
        if (this.gainNode) {
            this.gainNode = null;
        }
    }

    testSound() {
        this.playAnnoyingSound();
    }

    sendNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🌙 Reverse Alarm Clock', {
                body: 'Time to wake up and remember to go back to sleep!',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%2300d4ff"/><circle cx="50" cy="50" r="35" fill="%231a1a2e"/><circle cx="50" cy="50" r="25" fill="%2300d4ff"/></svg>',
                requireInteraction: true
            });
        }
    }

    updateDisplay() {
        const statusDot = this.statusIndicator.querySelector('.status-dot');
        
        if (this.isActive) {
            this.statusText.textContent = 'Active';
            statusDot.classList.add('active');
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
        } else {
            this.statusText.textContent = 'Inactive';
            statusDot.classList.remove('active');
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
        
        if (this.nextAlarmTime) {
            const timeString = this.nextAlarmTime.toLocaleTimeString();
            this.nextAlarm.innerHTML = `<span>Next alarm: ${timeString}</span>`;
        } else {
            this.nextAlarm.innerHTML = '<span>Next alarm: Not scheduled</span>';
        }
    }

    updateHistory() {
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<p class="no-history">No alarms triggered yet</p>';
            return;
        }
        
        this.historyList.innerHTML = this.history.map(record => `
            <div class="history-item">
                <span class="history-time">${record.time}</span>
                <span class="history-sound">${record.sound}</span>
            </div>
        `).join('');
    }

    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    isTimeInRange(currentTime, startTime, endTime) {
        if (startTime <= endTime) {
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // Handles overnight ranges (e.g., 22:00 to 06:00)
            return currentTime >= startTime || currentTime <= endTime;
        }
    }

    getNextActiveTime(now, startTime, endTime) {
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        
        if (startTime <= endTime) {
            // Same day range
            if (currentTime < startTime) {
                return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                              Math.floor(startTime / 60), startTime % 60);
            } else {
                return new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 
                              Math.floor(startTime / 60), startTime % 60);
            }
        } else {
            // Overnight range
            if (currentTime >= startTime) {
                return new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 
                              Math.floor(startTime / 60), startTime % 60);
            } else if (currentTime <= endTime) {
                return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                              Math.floor(startTime / 60), startTime % 60);
            } else {
                return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                              Math.floor(startTime / 60), startTime % 60);
            }
        }
    }

    saveSettings() {
        const settings = {
            startTime: this.startTime.value,
            endTime: this.endTime.value,
            minInterval: this.minInterval.value,
            maxInterval: this.maxInterval.value,
            soundType: this.soundType.value,
            volume: this.volume.value,
            duration: this.duration.value
        };
        localStorage.setItem('reverseAlarmSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('reverseAlarmSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.startTime.value = settings.startTime || '22:00';
            this.endTime.value = settings.endTime || '06:00';
            this.minInterval.value = settings.minInterval || '30';
            this.maxInterval.value = settings.maxInterval || '120';
            this.soundType.value = settings.soundType || 'dialup';
            this.volume.value = settings.volume || '50';
            this.duration.value = settings.duration || '10';
            this.volumeValue.textContent = `${this.volume.value}%`;
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ReverseAlarmClock();
    
    // Make app globally accessible for debugging
    window.reverseAlarmApp = app;
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && app.isActive) {
            console.log('Page hidden, but alarm is still active');
        }
    });
    
    // Handle beforeunload to warn about leaving
    window.addEventListener('beforeunload', (e) => {
        if (app.isActive) {
            e.preventDefault();
            e.returnValue = 'The reverse alarm is still active. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
}); 