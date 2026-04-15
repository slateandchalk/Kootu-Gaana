// Admin Dashboard Logic

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authMessage = document.getElementById('auth-message');
const statusDisplay = document.getElementById('current-status');
const songButtonsContainer = document.getElementById('song-buttons');

// Authentication
auth.onAuthStateChanged((user) => {
    if (user) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        initDashboard();
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
});

loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            authMessage.textContent = error.message;
        });
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// State Management
const stateRef = database.ref('live_session/state');

function updateState(newState) {
    stateRef.set(newState)
        .then(() => {
            let statusText = `Current State: ${newState.type.charAt(0).toUpperCase() + newState.type.slice(1)}`;
            if (newState.type === 'song' && newState.songId) {
                const song = songs.find(s => s.id === newState.songId);
                if (song) {
                    statusText = `Current State: ${song.title}`;
                } else {
                    statusText = `Current State: Song (ID: ${newState.songId})`;
                }
            }
            statusDisplay.textContent = statusText;
        })
        .catch((error) => {
            console.error("Error updates state: ", error);
        });
}

function initDashboard() {
    // Global Controls
    document.getElementById('start-event-btn').addEventListener('click', () => {
        updateState({ type: 'start' });
    });

    document.getElementById('end-event-btn').addEventListener('click', () => {
        updateState({ type: 'end' });
    });

    // Generate Song Buttons
    songButtonsContainer.innerHTML = '';
    songs.forEach(song => {
        const btn = document.createElement('button');
        btn.textContent = song.title;
        btn.className = 'song-btn';
        btn.dataset.id = song.id; // Store ID for easy access
        btn.addEventListener('click', () => {
            updateState({ type: 'song', songId: song.id });
        });
        songButtonsContainer.appendChild(btn);
    });

    // Listen for state changes to update UI (Highlighting)
    stateRef.on('value', (snapshot) => {
        const state = snapshot.val();
        if (state) {
            let statusText = `Current State: ${state.type.charAt(0).toUpperCase() + state.type.slice(1)}`;
            if (state.type === 'song' && state.songId) {
                const song = songs.find(s => s.id === state.songId);
                if (song) {
                    statusText = `Current State: ${song.title}`;
                } else {
                    statusText = `Current State: Song (ID: ${state.songId})`;
                }
            }
            statusDisplay.textContent = statusText;

            // Reset all buttons
            const allSongBtns = document.querySelectorAll('.song-btn');
            allSongBtns.forEach(b => b.classList.remove('active-btn'));

            document.getElementById('start-event-btn').classList.remove('active-global-btn');
            document.getElementById('end-event-btn').classList.remove('active-global-btn');

            if (state.type === 'song' && state.songId) {
                const activeBtn = document.querySelector(`.song-btn[data-id="${state.songId}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active-btn');
                }
            } else if (state.type === 'start') {
                document.getElementById('start-event-btn').classList.add('active-global-btn');
            } else if (state.type === 'end') {
                document.getElementById('end-event-btn').classList.add('active-global-btn');
            }
        }
    });

    // Real-time Like Counts
    firestore.collection('likes').onSnapshot((snapshot) => {
        const songLikes = {};

        snapshot.forEach((doc) => {
            const data = doc.data();
            const songId = data.songId;
            // Handle both legacy (single like) and new (batched count) formats
            const count = (data.count !== undefined) ? data.count : 1;

            if (songId) {
                songLikes[songId] = (songLikes[songId] || 0) + count;
            }
        });

        // Update Buttons
        songs.forEach(song => {
            const btn = document.querySelector(`.song-btn[data-id="${song.id}"]`);
            if (btn) {
                const count = songLikes[song.id] || 0;
                // Only show count if greater than 0
                btn.textContent = count > 0 ? `${song.title} (${count})` : song.title;
            }
        });

        // Update Statistics Table (Descending Order - Top Likes First)
        const statsBody = document.getElementById('stats-body');
        if (statsBody) {
            const songStats = songs.map(song => ({
                id: song.id,
                title: song.title,
                count: songLikes[song.id] || 0
            }));

            // Sort by count (descending)
            songStats.sort((a, b) => b.count - a.count);

            statsBody.innerHTML = '';
            songStats.forEach(stat => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                const titleCell = document.createElement('td');
                titleCell.textContent = stat.title;
                titleCell.style.padding = '10px';

                const countCell = document.createElement('td');
                countCell.textContent = stat.count;
                countCell.style.padding = '10px';

                row.appendChild(titleCell);
                row.appendChild(countCell);
                statsBody.appendChild(row);
            });
        }
    }, (error) => {
        console.error("Error getting likes:", error);
    });

    // Real-time Feedback
    firestore.collection('feedback').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
        const feedbackBody = document.getElementById('feedback-body');
        const avgRatingEl = document.getElementById('avg-rating');

        let totalRating = 0;
        let ratingCount = 0;

        if (feedbackBody) {
            feedbackBody.innerHTML = '';
            snapshot.forEach((doc) => {
                const data = doc.data();

                // Calculate Average Stats
                if (data.rating) {
                    totalRating += Number(data.rating);
                    ratingCount++;
                }

                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                // Format Timestamp
                let timeStr = '-';
                if (data.timestamp) {
                    const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
                    timeStr = date.toLocaleString('en-US', options);
                }

                const timeCell = document.createElement('td');
                timeCell.textContent = timeStr;
                timeCell.style.padding = '10px';
                timeCell.style.fontSize = '0.9rem';
                timeCell.style.color = 'rgba(255,255,255,0.7)';

                const rollNoCell = document.createElement('td');
                rollNoCell.textContent = data.roll_number || '-';
                rollNoCell.style.padding = '10px';

                const ratingCell = document.createElement('td');
                ratingCell.textContent = data.rating ? '★'.repeat(data.rating) : '-';
                ratingCell.style.padding = '10px';
                ratingCell.style.color = 'gold';

                const feedbackCell = document.createElement('td');
                feedbackCell.textContent = data.feedback || '-';
                feedbackCell.style.padding = '10px';

                row.appendChild(timeCell);
                row.appendChild(rollNoCell);
                row.appendChild(ratingCell);
                row.appendChild(feedbackCell);
                feedbackBody.appendChild(row);
            });

            // Update Average Rating Display
            if (avgRatingEl) {
                if (ratingCount > 0) {
                    const avg = (totalRating / ratingCount).toFixed(1);
                    avgRatingEl.textContent = `(Avg: ${avg} ★)`;
                } else {
                    avgRatingEl.textContent = '';
                }
            }
        }
    }, (error) => {
        console.error("Error getting feedback:", error);
    });
}
