// Client Application Logic

// DOM Elements
const startScreen = document.getElementById('start-screen');
const songScreen = document.getElementById('song-screen');
const endScreen = document.getElementById('end-screen');
const eventTitle = document.getElementById('event-title');
const songTitle = document.getElementById('song-title');
const songLyrics = document.getElementById('song-lyrics');

// Wake Lock
let wakeLock = null;
let currentSongId = null; // Global tracker
let currentLikeCount = 0; // Local like buffer
const LIKE_BATCH_LIMIT = 50; // Flush after this many likes

async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');

        wakeLock.addEventListener('release', () => {

        });
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

// Flush pending likes to Firestore
function flushLikes() {
    if (currentSongId && currentLikeCount > 0) {
        const count = currentLikeCount;
        currentLikeCount = 0; // Reset immediately to avoid double flush

        firestore.collection('likes').add({
            songId: currentSongId,
            count: count,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {

        }).catch(err => {
            console.error("Error flushing likes:", err);
            // Optionally recover count on error, but simple is better here
        });
    }
}

// Re-request wake lock on visibility change
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// Firebase Listener
const stateRef = database.ref('live_session/state');

stateRef.on('value', (snapshot) => {
    const state = snapshot.val();


    // Flush any pending likes for the PREVIOUS song before switching
    if (currentSongId && currentLikeCount > 0) {
        flushLikes();
    }

    // Update global tracker
    currentSongId = (state && state.type === 'song') ? state.songId : null;

    // Hide all screens initially
    startScreen.classList.add('hidden');
    songScreen.classList.add('hidden');
    endScreen.classList.add('hidden');

    if (!state) {
        // Default to start screen if no state
        startScreen.classList.remove('hidden');
        return;
    }

    switch (state.type) {
        case 'start':
            startScreen.classList.remove('hidden');
            startScreen.classList.add('fade-in');
            requestWakeLock(); // Try to keep screen on
            break;

        case 'song':
            const songId = state.songId;
            const song = songs.find(s => s.id === songId);

            if (song) {
                songTitle.textContent = song.title;
                songLyrics.textContent = song.lyrics;
                songScreen.classList.remove('hidden');
                songScreen.classList.add('fade-in');
                window.scrollTo(0, 0);
            } else {
                console.error('Song not found:', songId);
            }
            break;

        case 'end':
            endScreen.classList.remove('hidden');
            endScreen.classList.add('fade-in');
            if (wakeLock !== null) {
                wakeLock.release().then(() => {
                    wakeLock = null;
                });
            }
            break;

        default:
            startScreen.classList.remove('hidden');
    }
});

// Feedback Form Handling
const feedbackForm = document.getElementById('feedback-form');
if (feedbackForm) {
    // Character Count
    const feedbackText = document.getElementById('feedback-text');
    const charCount = document.getElementById('char-count');

    feedbackText.addEventListener('input', () => {
        charCount.textContent = `${feedbackText.value.length}/600`;
    });

    // Heart Rating
    const hearts = document.querySelectorAll('.heart');
    const ratingInput = document.getElementById('selected-rating');

    function updateHearts(value) {
        hearts.forEach(heart => {
            if (parseInt(heart.dataset.value) <= value) {
                heart.classList.add('selected');
                heart.textContent = '♥'; // Filled
            } else {
                heart.classList.remove('selected');
                heart.textContent = '♡'; // Outline
            }
        });
    }

    // Initialize with default 1
    updateHearts(1);

    hearts.forEach(heart => {
        heart.addEventListener('click', () => {
            const value = parseInt(heart.dataset.value);
            ratingInput.value = value;
            updateHearts(value);
        });
    });

    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate Roll Number
        const rollNo = document.getElementById('roll-number').value.toUpperCase();
        // allow 2 digits, 3 letters, 2 or 3 digits OR 1 letter, 5 digits
        const rollRegex = /^([0-9]{2}[a-zA-Z]{3}[0-9]{2,3})|([a-zA-Z][0-9]{5})$/;

        if (!rollRegex.test(rollNo)) {
            alert("Invalid Roll Number Format! (e.g., 23BME139 or K01414)");
            return;
        }

        const feedback = feedbackText.value;
        const rating = parseInt(ratingInput.value);

        try {
            await firestore.collection('feedback').add({
                roll_number: rollNo,
                feedback: feedback,
                rating: rating,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            feedbackForm.classList.add('hidden');
            document.getElementById('feedback-success').classList.remove('hidden');
        } catch (error) {
            console.error("Error adding feedback: ", error);
            alert("Error submitting feedback. Please try again.");
        }
    });
}

// Live Like Handler
const likeBtn = document.getElementById('like-btn');
if (likeBtn) {
    likeBtn.addEventListener('click', () => {
        // 1. Visual Animation
        createFlyingHeart();

        // 2. Increment local buffer
        if (currentSongId) {
            currentLikeCount++;

            // 3. Flush if limit reached
            if (currentLikeCount >= LIKE_BATCH_LIMIT) {
                flushLikes();
            }
        }
    });
}

// Flush on page unload or visibility change
window.addEventListener('beforeunload', flushLikes);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        flushLikes();
    }
});

function createFlyingHeart() {
    const heart = document.createElement('div');
    heart.classList.add('flying-heart');
    heart.textContent = '♥';

    // Random horizontal movement
    const randomX = (Math.random() - 0.5) * 100; // -50px to +50px
    heart.style.setProperty('--random-x', `${randomX}px`);

    // Position near the button
    const btnRect = likeBtn.getBoundingClientRect();
    heart.style.left = `${btnRect.left + btnRect.width / 2}px`;
    heart.style.top = `${btnRect.top}px`;

    document.body.appendChild(heart);

    // Remove after animation
    setTimeout(() => {
        heart.remove();
    }, 1500);
}

// Countdown Timer
const countdownElement = document.getElementById('countdown-timer');
const eventMessage = document.getElementById('event-message');

if (countdownElement && eventMessage) {
    // Target Date: Feb 11, 2026, 5:00 PM
    const targetDate = new Date('2026-02-11T17:00:00');

    function updateTimer() {
        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) {
            // Timer finished
            countdownElement.classList.add('hidden');
            eventMessage.classList.remove('hidden');
            return;
        }

        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        countdownElement.textContent = `${hours}h ${minutes}m ${seconds}s`;
        requestAnimationFrame(updateTimer);
    }

    updateTimer();
}
