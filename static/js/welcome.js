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
    const emotionConfidence = document.getElementById('emotionConfidence');
    const getRecommendationsBtn = document.getElementById('getRecommendations');

    if (startCameraBtn && videoElement) {
        startCameraBtn.addEventListener('click', async function() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoElement.srcObject = stream;
                videoElement.style.display = 'block';
                if (cameraPlaceholder) {
                    cameraPlaceholder.style.display = 'none';
                }
                startCameraBtn.disabled = true;
                captureImageBtn.disabled = false;
            } catch (err) {
                console.error('Error accessing camera:', err);
                alert('Could not access the camera. Please make sure it is connected and permissions are granted.');
            }
        });
    }

    if (captureImageBtn && videoElement) {
        captureImageBtn.addEventListener('click', function() {
            // Create a canvas element to capture the image
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // Convert the captured image to base64
            const imageData = canvas.toDataURL('image/jpeg');
            
            // Send to backend for emotion analysis
            fetch('/process_emotion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                // Display the detected emotion
                if (detectedEmotion) {
                    detectedEmotion.style.display = 'block';
                    emotionText.textContent = data.dominant_emotion;
                    
                    // Apply emotion specific styling
                    emotionText.className = '';
                    emotionText.classList.add(`emotion-text-${data.dominant_emotion.toLowerCase()}`);
                    
                    // Show the recommendations button
                    if (getRecommendationsBtn) {
                        getRecommendationsBtn.style.display = 'inline-flex';
                        
                        // Update the href to include the emotion
                        getRecommendationsBtn.href = `${getRecommendationsBtn.href}?emotion=${data.dominant_emotion}`;
                    }
                }
            })
            .catch(error => {
                console.error('Error processing image:', error);
                alert('There was an error processing your image');
            });
        });
    }

    // Upload image functionality
    const imageUpload = document.getElementById('imageUpload');
    const uploadArea = document.getElementById('uploadArea');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const analyzeImageBtn = document.getElementById('analyzeImage');
    const uploadDetectedEmotion = document.getElementById('uploadDetectedEmotion');
    const uploadEmotionText = document.getElementById('uploadEmotionText');
    const uploadGetRecommendationsBtn = document.getElementById('uploadGetRecommendations');

    if (uploadArea && imageUpload) {
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

        uploadArea.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                handleFiles(files);
            }
        }

        imageUpload.addEventListener('change', function() {
            if (this.files.length > 0) {
                handleFiles(this.files);
            }
        });

        function handleFiles(files) {
            const file = files[0];
            
            if (!file.type.match('image.*')) {
                alert('Please select an image file');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                uploadArea.style.display = 'none';
                previewContainer.style.display = 'block';
            };
            
            reader.readAsDataURL(file);
        }
    }

    if (analyzeImageBtn && imagePreview) {
        analyzeImageBtn.addEventListener('click', function() {
            // Send the image to the backend for analysis
            fetch('/process_emotion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imagePreview.src }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                // Display the detected emotion
                if (uploadDetectedEmotion) {
                    uploadDetectedEmotion.style.display = 'block';
                    uploadEmotionText.textContent = data.dominant_emotion;
                    
                    // Apply emotion specific styling
                    uploadEmotionText.className = '';
                    uploadEmotionText.classList.add(`emotion-text-${data.dominant_emotion.toLowerCase()}`);
                    
                    // Show the recommendations button
                    if (uploadGetRecommendationsBtn) {
                        uploadGetRecommendationsBtn.style.display = 'inline-flex';
                        
                        // Update the href to include the emotion
                        uploadGetRecommendationsBtn.href = `${uploadGetRecommendationsBtn.href}?emotion=${data.dominant_emotion}`;
                    }
                }
            })
            .catch(error => {
                console.error('Error processing image:', error);
                alert('There was an error processing your image');
            });
        });
    }

    // Select emotion functionality
    const emotionItems = document.querySelectorAll('.emotion-item');
    const selectedEmotionSongs = document.getElementById('selectedEmotionSongs');
    const selectedEmotionText = document.getElementById('selectedEmotionText');
    const songsList = document.getElementById('songsList');

    if (emotionItems.length > 0) {
        // Define emotion songs with their recommendations
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

        emotionItems.forEach(item => {
            item.addEventListener('click', function() {
                // Get the selected emotion
                const emotion = this.getAttribute('data-emotion');
                
                // Highlight the selected emotion
                emotionItems.forEach(el => el.classList.remove('selected'));
                this.classList.add('selected');
                
                // Show the songs section
                if (selectedEmotionSongs) {
                    selectedEmotionSongs.style.display = 'block';
                    selectedEmotionText.textContent = emotion;
                    
                    // Clear previous songs
                    songsList.innerHTML = '';
                    
                    // Add songs for the selected emotion
                    const songs = emotionSongs[emotion] || [];
                    
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
});