document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add pulse animation to the start button
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.classList.add('pulse-animation');
        
        // Start button smooth scroll
        startButton.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = document.querySelector('#detect-section');
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }
    
    // Add hover animations to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // User dropdown functionality
    const userInfo = document.getElementById('userInfo');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userInfo && userDropdown) {
        userInfo.addEventListener('click', function(e) {
            userDropdown.classList.toggle('show');
            e.stopPropagation();
        });

        window.addEventListener('click', function() {
            if (userDropdown.classList.contains('show')) {
                userDropdown.classList.remove('show');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = this.getAttribute('href');
        });
    }

    // Webcam functionality for detect section
    const startCameraBtn = document.getElementById('startCamera');
    const captureImageBtn = document.getElementById('captureImage');
    const tryAgainCameraBtn = document.getElementById('tryAgainCamera');
    const videoElement = document.getElementById('video');
    const cameraPlaceholder = document.querySelector('.camera-placeholder');
    const detectedEmotion = document.getElementById('detectedEmotion');
    const emotionText = document.getElementById('emotionText');
    const getRecommendationsBtn = document.getElementById('getRecommendations');

    let stream = null;

    // Function to reset camera section
    function resetCameraSection() {
        // Stop camera stream if running
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        // Hide video and show placeholder
        videoElement.style.display = 'none';
        if (cameraPlaceholder) {
            cameraPlaceholder.style.display = 'block';
        }
        
        // Reset buttons
        startCameraBtn.innerHTML = '<i class="fas fa-camera"></i> Start Camera';
        startCameraBtn.disabled = false;
        captureImageBtn.disabled = true;
        tryAgainCameraBtn.style.display = 'none';
        
        // Reset emotion result section
        const emotionPlaceholder = document.querySelector('.emotion-placeholder');
        if (emotionPlaceholder) {
            emotionPlaceholder.innerHTML = '<i class="fas fa-dizzy"></i><p>Your detected emotion will appear here</p>';
            emotionPlaceholder.style.display = 'block';
        }
        
        if (detectedEmotion) {
            detectedEmotion.style.display = 'none';
        }
        
        if (getRecommendationsBtn) {
            getRecommendationsBtn.style.display = 'none';
        }
        
        // Clear session storage
        sessionStorage.removeItem('capturedImage');
        sessionStorage.removeItem('detectedEmotion');
        sessionStorage.removeItem('recommendations');
    }

    // Try Again button for camera section
    if (tryAgainCameraBtn) {
        tryAgainCameraBtn.addEventListener('click', resetCameraSection);
    }

    if (startCameraBtn && videoElement) {
        startCameraBtn.addEventListener('click', async function() {
            try {
                if (stream) {
                    // Stop camera if already running
                    stream.getTracks().forEach(track => track.stop());
                    videoElement.style.display = 'none';
                    if (cameraPlaceholder) {
                        cameraPlaceholder.style.display = 'block';
                    }
                    startCameraBtn.innerHTML = '<i class="fas fa-camera"></i> Start Camera';
                    startCameraBtn.disabled = false;
                    captureImageBtn.disabled = true;
                    stream = null;
                    return;
                }

                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    },
                    audio: false
                });
                
                videoElement.srcObject = stream;
                videoElement.style.display = 'block';
                
                if (cameraPlaceholder) {
                    cameraPlaceholder.style.display = 'none';
                }
                
                startCameraBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Camera';
                captureImageBtn.disabled = false;
                
                videoElement.addEventListener('error', (e) => {
                    console.error('Video error:', e);
                    alert('Camera error occurred. Please try again.');
                });
                
            } catch (err) {
                console.error('Error accessing camera:', err);
                alert('Could not access the camera. Please make sure permissions are granted and camera is connected.');
            }
        });
    }

    if (captureImageBtn && videoElement) {
        captureImageBtn.addEventListener('click', async function() {
            if (!stream) {
                alert('Please start the camera first');
                return;
            }

            try {
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                let imageData;
                try {
                    imageData = canvas.toDataURL('image/jpeg', 0.8);
                } catch (e) {
                    console.error('Error converting image:', e);
                    throw new Error('Failed to capture image');
                }

                captureImageBtn.disabled = true;
                captureImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

                // Show loading state
                const emotionPlaceholder = document.querySelector('.emotion-placeholder');
                if (emotionPlaceholder) {
                    emotionPlaceholder.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Analyzing your emotion...</p>';
                }

                const response = await fetch('/process_emotion', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ image: imageData }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }
                
                if (detectedEmotion) {
                    if (emotionPlaceholder) {
                        emotionPlaceholder.style.display = 'none';
                    }
                    detectedEmotion.style.display = 'block';
                    emotionText.textContent = data.dominant_emotion;
                    emotionText.className = '';
                    emotionText.classList.add(`emotion-text-${data.dominant_emotion.toLowerCase()}`);
                    
                    sessionStorage.setItem('capturedImage', imageData);
                    sessionStorage.setItem('detectedEmotion', data.dominant_emotion);
                    
                    // Get songs with language filtering
                    const songs = await getEmotionSongs(data.dominant_emotion);
                    sessionStorage.setItem('recommendations', JSON.stringify(songs));
                    
                    if (getRecommendationsBtn) {
                        getRecommendationsBtn.style.display = 'inline-flex';
                        getRecommendationsBtn.href = `/recommendations?emotion=${encodeURIComponent(data.dominant_emotion)}`;
                    }
                    
                    // Show try again button
                    if (tryAgainCameraBtn) {
                        tryAgainCameraBtn.style.display = 'inline-flex';
                    }
                }
            } catch (error) {
                console.error('Error processing image:', error);
                const emotionPlaceholder = document.querySelector('.emotion-placeholder');
                if (emotionPlaceholder) {
                    emotionPlaceholder.innerHTML = '<i class="fas fa-exclamation-triangle"></i><p>Error processing image. Please try again.</p>';
                } else {
                    alert('Error processing image: ' + error.message);
                }
            } finally {
                captureImageBtn.disabled = false;
                captureImageBtn.innerHTML = '<i class="fas fa-camera-retro"></i> Capture Image';
            }
        });
    }

    window.addEventListener('beforeunload', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });

    // Upload image functionality
    const imageUpload = document.getElementById('imageUpload');
    const uploadArea = document.getElementById('uploadArea');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const detectEmotionBtn = document.getElementById('detectEmotionBtn');
    const tryAgainUploadBtn = document.getElementById('tryAgainUpload');
    const uploadEmotionPlaceholder = document.getElementById('uploadEmotionPlaceholder');
    const uploadDetectedEmotion = document.getElementById('uploadDetectedEmotion');
    const uploadEmotionText = document.getElementById('uploadEmotionText');
    const uploadGetRecommendationsBtn = document.getElementById('uploadGetRecommendations');

    // Function to reset upload section
    function resetUploadSection() {
        // Reset file input
        if (imageUpload) {
            imageUpload.value = '';
        }
        
        // Show upload area and hide preview
        if (uploadArea) {
            uploadArea.style.display = 'block';
        }
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        
        // Reset image preview
        if (imagePreview) {
            imagePreview.src = '#';
        }
        
        // Reset buttons
        if (detectEmotionBtn) {
            detectEmotionBtn.style.display = 'none';
        }
        if (tryAgainUploadBtn) {
            tryAgainUploadBtn.style.display = 'none';
        }
        
        // Reset emotion result section
        if (uploadEmotionPlaceholder) {
            uploadEmotionPlaceholder.innerHTML = '<i class="fas fa-dizzy"></i><p>Your detected emotion will appear here</p>';
            uploadEmotionPlaceholder.style.display = 'block';
        }
        
        if (uploadDetectedEmotion) {
            uploadDetectedEmotion.style.display = 'none';
        }
        
        // Clear session storage
        sessionStorage.removeItem('capturedImage');
        sessionStorage.removeItem('detectedEmotion');
        sessionStorage.removeItem('recommendations');
    }

    // Try Again button for upload section
    if (tryAgainUploadBtn) {
        tryAgainUploadBtn.addEventListener('click', resetUploadSection);
    }

    if (imageUpload) {
        imageUpload.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                
                if (!file.type.match('image.*')) {
                    alert('Please select an image file (JPEG, PNG, etc.)');
                    return;
                }
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    uploadArea.style.display = 'none';
                    previewContainer.style.display = 'block';
                    detectEmotionBtn.style.display = 'inline-flex';
                    tryAgainUploadBtn.style.display = 'inline-flex';
                    uploadEmotionPlaceholder.style.display = 'block';
                    uploadDetectedEmotion.style.display = 'none';
                };
                
                reader.onerror = function() {
                    alert('Error reading file. Please try another image.');
                };
                
                reader.readAsDataURL(file);
            }
        });
    }

    // Drag and drop functionality
    if (uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });

        function highlight() {
            uploadArea.classList.add('highlight');
        }

        function unhighlight() {
            uploadArea.classList.remove('highlight');
        }

        uploadArea.addEventListener('drop', function(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    imageUpload.files = files;
                    const event = new Event('change');
                    imageUpload.dispatchEvent(event);
                }
            }
        });
    }

    if (detectEmotionBtn) {
        detectEmotionBtn.addEventListener('click', async function() {
            if (!imagePreview.src || imagePreview.src === '#') {
                alert('Please upload an image first');
                return;
            }

            try {
                detectEmotionBtn.disabled = true;
                detectEmotionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                uploadEmotionPlaceholder.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Analyzing your emotion...</p>';
                uploadEmotionPlaceholder.style.display = 'block';
                uploadDetectedEmotion.style.display = 'none';
                
                const response = await fetch('/process_emotion', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ image: imagePreview.src }),
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }
                
                uploadEmotionPlaceholder.style.display = 'none';
                uploadEmotionText.textContent = data.dominant_emotion;
                uploadEmotionText.className = '';
                uploadEmotionText.classList.add(`emotion-${data.dominant_emotion.toLowerCase()}`);
                uploadDetectedEmotion.style.display = 'block';
                
                sessionStorage.setItem('capturedImage', imagePreview.src);
                sessionStorage.setItem('detectedEmotion', data.dominant_emotion);
                
                // Get songs with language filtering
                const songs = await getEmotionSongs(data.dominant_emotion);
                sessionStorage.setItem('recommendations', JSON.stringify(songs));
                
                uploadGetRecommendationsBtn.href = `/recommendations?emotion=${encodeURIComponent(data.dominant_emotion)}`;
                
            } catch (error) {
                console.error('Error processing image:', error);
                uploadEmotionPlaceholder.innerHTML = `
                    <i class="fas fa-exclamation-circle" style="color: var(--danger-color);"></i>
                    <p>${error.message || 'Error processing image'}</p>
                `;
                uploadEmotionPlaceholder.style.display = 'block';
            } finally {
                detectEmotionBtn.disabled = false;
                detectEmotionBtn.innerHTML = '<i class="fas fa-search"></i> Detect Emotion';
            }
        });
    }

    // Updated function to get emotion songs with language filtering
    async function getEmotionSongs(emotion) {
        try {
            const response = await fetch(`/get_songs/${emotion}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching songs:', error);
            return [];
        }
    }

    // Select emotion functionality with language filtering
    const emotionItems = document.querySelectorAll('.emotion-item');
    const selectedEmotionSongs = document.getElementById('selectedEmotionSongs');
    const selectedEmotionText = document.getElementById('selectedEmotionText');
    const songsList = document.getElementById('songsList');
    const moreEmotionsGrid = document.querySelector('.more-emotions-grid');
    const moreEmotionsTitle = document.getElementById('more-emotions-title');

    if (emotionItems.length > 0) {
        emotionItems.forEach(item => {
            item.addEventListener('click', async function() {
                const emotion = this.getAttribute('data-emotion');
                
                // Handle "Select More" option
                if (emotion === 'More') {
                    const isGridVisible = moreEmotionsGrid && moreEmotionsGrid.style.display === 'grid';
                    if (moreEmotionsGrid) {
                        moreEmotionsGrid.style.display = isGridVisible ? 'none' : 'grid';
                    }
                    if (moreEmotionsTitle) {
                        moreEmotionsTitle.style.display = isGridVisible ? 'none' : 'block';
                    }
                    return;
                }
                
                // Remove active class from all items
                emotionItems.forEach(el => el.classList.remove('selected', 'active'));
                this.classList.add('selected', 'active');
                
                // Store the selected emotion data for recommendations page
                sessionStorage.setItem('detectedEmotion', emotion);
                
                // Show the songs section with loading state
                if (selectedEmotionSongs) {
                    selectedEmotionSongs.style.display = 'block';
                    selectedEmotionText.textContent = emotion;
                    
                    // Show loading state
                    songsList.innerHTML = '<div class="loading-songs"><i class="fas fa-spinner fa-spin"></i><p>Loading songs...</p></div>';
                    
                    try {
                        // Get songs for the selected emotion with language filtering
                        const songs = await getEmotionSongs(emotion);
                        sessionStorage.setItem('recommendations', JSON.stringify(songs));
                        
                        // Display songs with language filtering support
                        displaySongs(songs, emotion);
                        
                        // Scroll to the songs section
                        selectedEmotionSongs.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    } catch (error) {
                        console.error('Error fetching songs:', error);
                        songsList.innerHTML = '<div class="error-message">Error loading songs. Please try again.</div>';
                    }
                }
            });
        });
    }

    // Updated function to display songs with language support
    function displaySongs(songs, emotion) {
        if (!songsList) return;
        
        if (songs.length === 0) {
            songsList.innerHTML = `
                <div class="no-songs-message">
                    <i class="fas fa-music"></i>
                    <p>No songs available for ${emotion} in your preferred languages.</p>
                    <p>Try selecting different language preferences in your settings.</p>
                </div>
            `;
            return;
        }

        songsList.innerHTML = '';
        
        songs.forEach(song => {
            const songCard = document.createElement('div');
            songCard.className = 'song-card';
            
            songCard.innerHTML = `
                <div class="song-info">
                    <h3 class="song-title">${song.title}</h3>
                    <p class="song-artist">${song.artist}</p>
                    ${song.language ? `<span class="song-language">${song.language}</span>` : ''}
                </div>
                <div class="song-player">
                    ${getEmbeddedPlayer(song.url)}
                </div>
            `;
            
            // Save song selection to user history
            songCard.addEventListener('click', function() {
                fetch('/save_song_selection', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        emotion: emotion,
                        song_id: song.url
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
            });
            
            songsList.appendChild(songCard);
        });
    }

    // Check if there's an emotion parameter in the URL
    function checkUrlForEmotion() {
        const urlParams = new URLSearchParams(window.location.search);
        const emotion = urlParams.get('emotion');
        
        if (emotion) {
            const emotionItem = document.querySelector(`.emotion-item[data-emotion="${emotion}"]`);
            if (emotionItem) {
                emotionItem.click();
            } else if (['Pregnant', 'Depression', 'Trouble Sleeping', 'Travelling', 'Stressed', 'Lonely', 'Excited'].includes(emotion)) {
                // Show more emotions grid and title, then select the special emotion
                if (moreEmotionsGrid) moreEmotionsGrid.style.display = 'grid';
                if (moreEmotionsTitle) moreEmotionsTitle.style.display = 'block';
                const specialEmotionItem = document.querySelector(`.emotion-item[data-emotion="${emotion}"]`);
                if (specialEmotionItem) {
                    specialEmotionItem.click();
                }
            }
        }
    }
    
    checkUrlForEmotion();

    // Add responsive navigation for mobile
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('show-mobile');
        });
    }

    // Add scroll effect to header
    const header = document.querySelector('.main-header');
    
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // Add animation to sections when they come into view
    const sections = document.querySelectorAll('.section');
    
    function checkSections() {
        const triggerBottom = window.innerHeight * 0.8;
        
        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;
            
            if (sectionTop < triggerBottom) {
                section.classList.add('appear');
            }
        });
    }
    
    window.addEventListener('scroll', checkSections);
    checkSections();
    
    function getEmbeddedPlayer(url) {
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            let videoId;
            if (url.includes("youtube.com")) {
                if (url.includes("watch?v=")) {
                    videoId = url.split("watch?v=")[1].split("&")[0];
                } else {
                    videoId = url.split("/").pop();
                }
            } else if (url.includes("youtu.be")) {
                videoId = url.split("/").pop();
            }
            
            return `<iframe width="100%" height="215" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else if (url.includes("spotify.com")) {
            if (url.includes("track/")) {
                const trackId = url.split("track/")[1];
                return `<iframe src="https://open.spotify.com/embed/track/${trackId}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
            }
        }
        
        return `<a href="${url}" target="_blank" class="song-link">Open in new tab</a>`;
    }

    // Add CSS for language filtering features and try again buttons
    const style = document.createElement('style');
    style.textContent = `
        .loading-songs {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .loading-songs i {
            font-size: 2rem;
            margin-bottom: 10px;
            display: block;
        }
        
        .no-songs-message {
            text-align: center;
            padding: 40px;
            color: #666;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        
        .no-songs-message i {
            font-size: 3rem;
            margin-bottom: 20px;
            color: #ddd;
        }
        
        .error-message {
            text-align: center;
            padding: 20px;
            background: #ffe6e6;
            color: #d00;
            border-radius: 10px;
            margin: 20px 0;
        }
        
        .song-language {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.8rem;
            margin-top: 8px;
            display: inline-block;
        }
        
        .emotion-item.active, .emotion-item.selected {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            transform: scale(1.05);
        }
        
        .highlight, .drag-over {
            border-color: #667eea !important;
            background: rgba(102, 126, 234, 0.1) !important;
        }
        
        .song-card {
            margin-bottom: 15px;
            transition: all 0.3s ease;
        }
        
        .song-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .try-again-button {
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            margin-left: 10px;
        }
        
        .try-again-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);
            background: linear-gradient(135deg, #ff5252, #e53935);
        }
        
        .try-again-button:active {
            transform: translateY(0);
        }
        
        .try-again-button i {
            font-size: 16px;
        }
        
        .upload-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        
        .camera-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        
        @media (max-width: 768px) {
            .camera-controls, .upload-controls {
                flex-direction: column;
                align-items: center;
            }
            
            .try-again-button {
                margin-left: 0;
                margin-top: 10px;
            }
        }
    `;
    document.head.appendChild(style);
});