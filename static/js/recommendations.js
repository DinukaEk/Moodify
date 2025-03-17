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
    if (capturedImage && detectedEmotion) {
        // Show emotion and image
        detectedEmotionElement.textContent = detectedEmotion;
        emotionTextElement.textContent = detectedEmotion.toLowerCase();
        emotionImageElement.src = capturedImage;
        
        // Add emotion class to the emotion summary
        const emotionSummary = document.querySelector('.emotion-summary');
        emotionSummary.classList.add(`emotion-${detectedEmotion.toLowerCase()}`);
        
        // Display song recommendations
        displaySongs(recommendations);
    } else {
        // No data found, redirect back to detection page
        detectedEmotionElement.textContent = 'No emotion detected';
        emotionImageElement.src = '';
        songsContainer.innerHTML = `
            <div class="loading-songs">
                <i class="fas fa-exclamation-circle" style="color: var(--danger-color);"></i>
                <p>No emotion data found. Please go back and try again.</p>
            </div>
        `;
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
            });
            
            songsContainer.appendChild(songCard);
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
});