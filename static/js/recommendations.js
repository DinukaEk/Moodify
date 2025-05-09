document.addEventListener('DOMContentLoaded', function() {
    const detectedEmotionElement = document.getElementById('detected-emotion');
    const emotionImageElement = document.getElementById('emotion-image');
    const emotionTextElement = document.getElementById('emotion-text');
    const songsContainer = document.getElementById('songs-container');
    const playerContainer = document.getElementById('player-container');
    
    // Get data from session storage
    const capturedImage = sessionStorage.getItem('capturedImage');
    const detectedEmotion = sessionStorage.getItem('detectedEmotion');
    const recommendations = JSON.parse(sessionStorage.getItem('recommendations') || '[]');
    
    // Display the results
    if (detectedEmotion) {
        // Show emotion
        detectedEmotionElement.textContent = detectedEmotion;
        emotionTextElement.textContent = detectedEmotion.toLowerCase();
        
        // Show image if available
        if (capturedImage) {
            emotionImageElement.src = capturedImage;
        } else {
            // If no image was captured (like when directly selecting emotion), use a placeholder
            emotionImageElement.src = '/static/images/emotion_icons/' + detectedEmotion.toLowerCase() + '.png';
            // Fallback if the specific emotion icon doesn't exist
            emotionImageElement.onerror = function() {
                this.src = '/static/images/placeholder.png';
            };
        }
        
        // Add emotion class to the emotion summary
        const emotionSummary = document.querySelector('.emotion-summary');
        if (emotionSummary) {
            // Remove any existing emotion classes
            emotionSummary.className = 'emotion-summary';
            // Add the new emotion class
            emotionSummary.classList.add(`emotion-${detectedEmotion.toLowerCase()}`);
        }
        
        // Display song recommendations
        displaySongs(recommendations);
    } else {
        // Try to get emotion from URL parameter as fallback
        const urlParams = new URLSearchParams(window.location.search);
        const emotionParam = urlParams.get('emotion');
        
        if (emotionParam) {
            // We have an emotion from URL parameter
            detectedEmotionElement.textContent = emotionParam;
            emotionTextElement.textContent = emotionParam.toLowerCase();
            
            // Add emotion class
            const emotionSummary = document.querySelector('.emotion-summary');
            if (emotionSummary) {
                emotionSummary.className = 'emotion-summary';
                emotionSummary.classList.add(`emotion-${emotionParam.toLowerCase()}`);
            }
            
            // Get songs for this emotion
            const songs = getEmotionSongs(emotionParam);
            displaySongs(songs);
            
            // Store for future use
            sessionStorage.setItem('detectedEmotion', emotionParam);
            sessionStorage.setItem('recommendations', JSON.stringify(songs));
        } else {
            // No emotion data found at all
            detectedEmotionElement.textContent = 'No emotion detected';
            emotionImageElement.src = '/static/images/placeholder.png';
            songsContainer.innerHTML = `
                <div class="loading-songs">
                    <i class="fas fa-exclamation-circle" style="color: var(--danger-color);"></i>
                    <p>No emotion data found. Please go back and try again.</p>
                </div>
            `;
        }
    }
    
    // Display songs
    function displaySongs(songs) {
        if (!songs || songs.length === 0) {
            songsContainer.innerHTML = `
                <div class="loading-songs">
                    <i class="fas fa-music" style="color: var(--gray-color);"></i>
                    <p>No recommendations available for this emotion.</p>
                </div>
            `;
            return;
        }
        
        // Clear loading message
        songsContainer.innerHTML = '';
        
        // Create song cards
        songs.forEach(song => {
            const songCard = document.createElement('div');
            songCard.className = 'song-card';
            songCard.innerHTML = `
                <div class="song-image">
                    <i class="fas fa-music"></i>
                </div>
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                    <a class="play-button">
                        <i class="fas fa-play"></i> Play
                    </a>
                </div>
            `;
            
            // Add event listener for playing the song
            songCard.querySelector('.play-button').addEventListener('click', () => {
                playMusic(song);
                
                // Save song selection to user history if logged in
                saveSongSelection(detectedEmotion, song.url);
            });
            
            songsContainer.appendChild(songCard);
        });
    }
    
    // Save song selection to user history
    function saveSongSelection(emotion, songUrl) {
        fetch('/save_song_selection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                emotion: emotion,
                song_id: songUrl
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Song selection saved successfully');
            }
        })
        .catch(error => {
            console.error('Error saving song selection:', error);
        });
    }
    
    // Play music function
    function playMusic(song) {
        playerContainer.innerHTML = `
            <div class="player-content">
                <h4>${song.title} - ${song.artist}</h4>
                <div class="player-embed">
                    ${getEmbeddedPlayer(song.url)}
                </div>
            </div>
        `;
    }
    
    // Helper function to get embedded player HTML for different music sources
    function getEmbeddedPlayer(url) {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            // Extract YouTube video ID
            let videoId;
            
            if (url.includes('watch?v=')) {
                videoId = url.split('watch?v=')[1].split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1];
            } else {
                videoId = url.split('/').pop();
            }
            
            // Return YouTube embedded player HTML
            return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else if (url.includes('spotify.com')) {
            // Extract Spotify track ID
            const trackId = url.includes('track/') ? url.split('track/')[1].split('?')[0] : '';
            
            if (trackId) {
                // Return Spotify embedded player HTML
                return `<iframe src="https://open.spotify.com/embed/track/${trackId}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
            }
        }
        
        // Return a link if we can't embed
        return `<a href="${url}" target="_blank" class="action-button"><i class="fas fa-external-link-alt"></i> Open in new tab</a>`;
    }
    
    // Define emotion songs with their recommendations - same function as in welcome.js
    function getEmotionSongs(emotion) {
        const emotionSongs = {
            "Angry": [
                {"title": "Break Stuff", "artist": "Limp Bizkit", "url": "https://open.spotify.com/track/5cZqsjJuBIcjqyVaZd5Ill"},
                {"title": "Bulls On Parade", "artist": "Rage Against The Machine", "url": "https://open.spotify.com/track/1Dj3C4NOtWo7ETBv2ThrPD"},
                {"title": "Master Of Puppets", "artist": "Metallica", "url": "https://open.spotify.com/track/2MuWTIM3b0YEAskbeeFE1i"},
                {"title": "Killing In The Name", "artist": "Rage Against The Machine", "url": "https://youtu.be/bWXazVhlyxQ"}
            ],
            "Disgust": [
                {"title": "Creep", "artist": "Radiohead", "url": "https://open.spotify.com/track/70LcF31zb1H0PyJoS1Sx1r"},
                {"title": "Somebody That I Used To Know", "artist": "Gotye", "url": "https://open.spotify.com/track/1qDrWA6lyx8cLECdZE7TV7"},
                {"title": "Seven Nation Army", "artist": "The White Stripes", "url": "https://open.spotify.com/track/7i6r9KotUPQg3ozKKgEPIN"},
                {"title": "Loser", "artist": "Beck", "url": "https://youtu.be/YgSPaXgAdzE"}
            ],
            "Fear": [
                {"title": "Thriller", "artist": "Michael Jackson", "url": "https://open.spotify.com/track/2LlQb7Uoj1kKyLZnCCXvyS"},
                {"title": "Everybody's Scared", "artist": "Lenka", "url": "https://open.spotify.com/track/0KbHuWNqhQbYQvZwzSZGTj"},
                {"title": "Fear of the Dark", "artist": "Iron Maiden", "url": "https://open.spotify.com/track/5C4TQZWf4pTWugCrzhXl6X"},
                {"title": "Enter Sandman", "artist": "Metallica", "url": "https://youtu.be/CD-E-LDc384"}
            ],
            "Happy": [
                {"title": "Happy", "artist": "Pharrell Williams", "url": "https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCO"},
                {"title": "Don't Stop Me Now", "artist": "Queen", "url": "https://open.spotify.com/track/5T8EDUDqKcs6OSOwEsfqG7"},
                {"title": "Walking On Sunshine", "artist": "Katrina & The Waves", "url": "https://open.spotify.com/track/05wIrZSwuaVWhcv5FfqeH0"},
                {"title": "Can't Stop The Feeling", "artist": "Justin Timberlake", "url": "https://youtu.be/ru0K8uYEZWw"}
            ],
            "Neutral": [
                {"title": "Comfortably Numb", "artist": "Pink Floyd", "url": "https://open.spotify.com/track/6LbVJ5Kh8aQCnaSsNZfZXx"},
                {"title": "Breathe", "artist": "Télépopmusik", "url": "https://open.spotify.com/track/0PG9fbaaHFHfre2gUVo7AN"},
                {"title": "No Surprises", "artist": "Radiohead", "url": "https://open.spotify.com/track/10nyNJ6zNy2YVYLrcwLccB"},
                {"title": "Marconi Union - Weightless", "artist": "Marconi Union", "url": "https://youtu.be/UfcAVejslrU"}
            ],
            "Sad": [
                {"title": "Someone Like You", "artist": "Adele", "url": "https://open.spotify.com/track/1aFuEGnSXz33jJzLZMqk28"},
                {"title": "Hurt", "artist": "Johnny Cash", "url": "https://open.spotify.com/track/28cnXtME493VX9NOw9cIUh"},
                {"title": "Fix You", "artist": "Coldplay", "url": "https://open.spotify.com/track/7LVHVU3tWfcxj5aiPFEW4Q"},
                {"title": "Mad World", "artist": "Gary Jules", "url": "https://youtu.be/4N3N1MlvVc4"}
            ],
            "Surprise": [
                {"title": "Wow", "artist": "Post Malone", "url": "https://open.spotify.com/track/7fvUMiyapMsNXnM6Y9taEv"},
                {"title": "Starboy", "artist": "The Weeknd", "url": "https://open.spotify.com/track/7MXVkk9YMctZqd1Srtv4MB"},
                {"title": "Uprising", "artist": "Muse", "url": "https://open.spotify.com/track/4VqPOruhp5EdPBeR92t6lQ"},
                {"title": "Radioactive", "artist": "Imagine Dragons", "url": "https://youtu.be/ktvTqknDobU"}
            ]
        };
        
        return emotionSongs[emotion] || [];
    }
    
    // Add a go back button functionality
    const goBackBtn = document.getElementById('go-back-btn');
    if (goBackBtn) {
        goBackBtn.addEventListener('click', function() {
            window.history.back();
        });
    }
    
    // Add share functionality 
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            // Create a shareable URL with the emotion
            const shareUrl = `${window.location.origin}/recommendations?emotion=${encodeURIComponent(detectedEmotion)}`;
            
            // Check if Web Share API is available
            if (navigator.share) {
                navigator.share({
                    title: `Music for ${detectedEmotion} mood`,
                    text: `Check out these song recommendations for ${detectedEmotion} mood!`,
                    url: shareUrl
                })
                .catch(error => console.log('Error sharing:', error));
            } else {
                // Fallback - Copy to clipboard
                navigator.clipboard.writeText(shareUrl)
                    .then(() => {
                        // Show a toast or alert
                        alert('Link copied to clipboard!');
                    })
                    .catch(err => {
                        console.error('Failed to copy: ', err);
                    });
            }
        });
    }
});