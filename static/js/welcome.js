// Enhanced welcome page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Offset for navbar height
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add pulse animation to the start button
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.classList.add('pulse-animation');
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
        // Toggle dropdown when clicking on the user name/avatar
        userInfo.addEventListener('click', function(e) {
            userDropdown.classList.toggle('show');
            e.stopPropagation();
        });

        // Close dropdown when clicking anywhere else on the page
        window.addEventListener('click', function() {
            if (userDropdown.classList.contains('show')) {
                userDropdown.classList.remove('show');
            }
        });
    }

    if (logoutBtn) {
        // Handle logout functionality
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // You can add confirmation dialog if needed
            window.location.href = this.getAttribute('href');
        });
    }

    // Webcam functionality for detect section
    const startCameraBtn = document.getElementById('startCamera');
    const captureImageBtn = document.getElementById('captureImage');
    const videoElement = document.getElementById('video');
    const cameraPlaceholder = document.querySelector('.camera-placeholder');
    const detectedEmotion = document.getElementById('detectedEmotion');
    const emotionText = document.getElementById('emotionText');
    const getRecommendationsBtn = document.getElementById('getRecommendations');

    let stream = null;

    if (startCameraBtn && videoElement) {
        startCameraBtn.addEventListener('click', async function() {
            try {
                // Stop any existing stream
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                // Get user media with better constraints
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
                
                startCameraBtn.disabled = true;
                captureImageBtn.disabled = false;
                
                // Add error listener to the video element
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
                // Create canvas and capture image
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                // Convert to base64 with error handling
                let imageData;
                try {
                    imageData = canvas.toDataURL('image/jpeg', 0.8);
                } catch (e) {
                    console.error('Error converting image:', e);
                    throw new Error('Failed to capture image');
                }

                // Show loading state
                captureImageBtn.disabled = true;
                captureImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

                // Send to backend for analysis
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
                
                // Display the detected emotion
                if (detectedEmotion) {
                    detectedEmotion.style.display = 'block';
                    emotionText.textContent = data.dominant_emotion;
                    
                    // Apply emotion specific styling
                    emotionText.className = '';
                    emotionText.classList.add(`emotion-text-${data.dominant_emotion.toLowerCase()}`);
                    
                    // Store the captured image and emotion data
                    sessionStorage.setItem('capturedImage', imageData);
                    sessionStorage.setItem('detectedEmotion', data.dominant_emotion);
                    
                    // Get songs from database
                    const songs = await getEmotionSongs(data.dominant_emotion);
                    sessionStorage.setItem('recommendations', JSON.stringify(songs));
                    
                    // Show recommendations button
                    if (getRecommendationsBtn) {
                        getRecommendationsBtn.style.display = 'inline-flex';
                        getRecommendationsBtn.href = `/recommendations?emotion=${encodeURIComponent(data.dominant_emotion)}`;
                    }
                }
            } catch (error) {
                console.error('Error processing image:', error);
                alert('Error processing image: ' + error.message);
            } finally {
                // Reset button state
                if (captureImageBtn) {
                    captureImageBtn.disabled = false;
                    captureImageBtn.innerHTML = '<i class="fas fa-camera-retro"></i> Capture Image';
                }
            }
        });
    }

    // Clean up when leaving the page
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
    const uploadEmotionPlaceholder = document.getElementById('uploadEmotionPlaceholder');
    const uploadDetectedEmotion = document.getElementById('uploadDetectedEmotion');
    const uploadEmotionText = document.getElementById('uploadEmotionText');
    const uploadGetRecommendationsBtn = document.getElementById('uploadGetRecommendations');

    // Handle file selection
    imageUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            // Validate file type
            if (!file.type.match('image.*')) {
                alert('Please select an image file (JPEG, PNG, etc.)');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Display the selected image
                imagePreview.src = e.target.result;
                uploadArea.style.display = 'none';
                previewContainer.style.display = 'block';
                
                // Show the detect emotion button
                detectEmotionBtn.style.display = 'inline-flex';
                
                // Reset any previous results
                uploadEmotionPlaceholder.style.display = 'block';
                uploadDetectedEmotion.style.display = 'none';
            };
            
            reader.onerror = function() {
                alert('Error reading file. Please try another image.');
            };
            
            reader.readAsDataURL(file);
        }
    });

    // Handle drag and drop
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
            imageUpload.files = files;
            const event = new Event('change');
            imageUpload.dispatchEvent(event);
        }
    });

    // Detect emotion from uploaded image
    detectEmotionBtn.addEventListener('click', async function() {
        if (!imagePreview.src || imagePreview.src === '#') {
            alert('Please upload an image first');
            return;
        }

        try {
            // Show loading state
            detectEmotionBtn.disabled = true;
            detectEmotionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Hide placeholder and previous results
            uploadEmotionPlaceholder.style.display = 'none';
            uploadDetectedEmotion.style.display = 'none';
            
            // Send image to server for processing
            const response = await fetch('/process_emotion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    image: imagePreview.src 
                }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }
            
            // Display the detected emotion
            uploadEmotionText.textContent = data.dominant_emotion;
            
            // Apply emotion specific styling
            uploadEmotionText.className = '';
            uploadEmotionText.classList.add(`emotion-${data.dominant_emotion.toLowerCase()}`);
            
            // Show results section
            uploadDetectedEmotion.style.display = 'block';
            
            // Store data for recommendations page
            sessionStorage.setItem('capturedImage', imagePreview.src);
            sessionStorage.setItem('detectedEmotion', data.dominant_emotion);
            sessionStorage.setItem('recommendations', JSON.stringify(data.recommendations));
            
            // Update recommendations button link
            uploadGetRecommendationsBtn.href = `/recommendations?emotion=${encodeURIComponent(data.dominant_emotion)}`;
            
        } catch (error) {
            console.error('Error processing image:', error);
            
            // Show error message
            uploadEmotionPlaceholder.innerHTML = `
                <i class="fas fa-exclamation-circle" style="color: var(--danger-color);"></i>
                <p>${error.message || 'Error processing image'}</p>
            `;
            uploadEmotionPlaceholder.style.display = 'block';
        } finally {
            // Reset button state
            detectEmotionBtn.disabled = false;
            detectEmotionBtn.innerHTML = '<i class="fas fa-search"></i> Detect Emotion';
        }
    });

    async function getEmotionSongs(emotion) {
        try {
            const response = await fetch(`/get_songs/${emotion}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching songs:', error);
            return [];
        }
    }

    // Select emotion functionality
    const emotionItems = document.querySelectorAll('.emotion-item');
    const selectedEmotionSongs = document.getElementById('selectedEmotionSongs');
    const selectedEmotionText = document.getElementById('selectedEmotionText');
    const songsList = document.getElementById('songsList');

    if (emotionItems.length > 0) {
        emotionItems.forEach(item => {
            item.addEventListener('click', async function() {
                // Get the selected emotion
                const emotion = this.getAttribute('data-emotion');
                
                // Highlight the selected emotion
                emotionItems.forEach(el => el.classList.remove('selected'));
                this.classList.add('selected');
                
                // Store the selected emotion data for recommendations page
                sessionStorage.setItem('detectedEmotion', emotion);
                
                // Get songs for the selected emotion from database
                const songs = await getEmotionSongs(emotion);
                sessionStorage.setItem('recommendations', JSON.stringify(songs));
                
                // Show the songs section
                if (selectedEmotionSongs) {
                    selectedEmotionSongs.style.display = 'block';
                    selectedEmotionText.textContent = emotion;
                    
                    // Clear previous songs
                    songsList.innerHTML = '';
                    
                    // Add songs for the selected emotion
                    songs.forEach(song => {
                        const songCard = document.createElement('div');
                        songCard.className = 'song-card';
                        
                        songCard.innerHTML = `
                            <div class="song-info">
                                <h4 class="song-title">${song.title}</h4>
                                <p class="song-artist">${song.artist}</p>
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
                    
                    // Scroll to the songs section
                    selectedEmotionSongs.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Check if there's an emotion parameter in the URL (from other sections)
    function checkUrlForEmotion() {
        const urlParams = new URLSearchParams(window.location.search);
        const emotion = urlParams.get('emotion');
        
        if (emotion) {
            // Find the emotion item and trigger a click
            const emotionItem = document.querySelector(`.emotion-item[data-emotion="${emotion}"]`);
            if (emotionItem) {
                emotionItem.click();
            }
        }
    }
    
    // Run on page load
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
    checkSections(); // Run once on page load
    
    // Function to get embedded player
    function getEmbeddedPlayer(url) {
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            // Extract YouTube video ID
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
            // Extract Spotify track ID
            if (url.includes("track/")) {
                const trackId = url.split("track/")[1];
                return `<iframe src="https://open.spotify.com/embed/track/${trackId}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
            }
        }
        
        return `<a href="${url}" target="_blank" class="song-link">Open in new tab</a>`;
    }
});