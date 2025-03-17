document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const continueBtn = document.getElementById('continue-btn');
    const emotionResult = document.getElementById('emotion-result');
    
    let stream = null;
    let capturedImage = null;
    let detectedEmotion = null;
    
    // Start webcam
    async function startWebcam() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            video.srcObject = stream;
            captureBtn.disabled = false;
        } catch (err) {
            console.error('Error accessing webcam:', err);
            emotionResult.innerHTML = `
                <div class="emotion-placeholder">
                    <i class="fas fa-exclamation-triangle" style="color: var(--danger-color);"></i>
                    <p>Error accessing camera. Please ensure you've granted camera permissions.</p>
                </div>
            `;
            captureBtn.disabled = true;
        }
    }
    
    // Capture image from webcam
    function captureImage() {
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        capturedImage = canvas.toDataURL('image/jpeg');
        
        // Stop the webcam
        stopWebcam();
        
        // Show captured image
        video.style.display = 'none';
        canvas.style.display = 'block';
        
        // Update buttons
        captureBtn.style.display = 'none';
        retakeBtn.style.display = 'inline-flex';
        
        // Show loading in the emotion result area
        emotionResult.innerHTML = `
            <div class="emotion-placeholder">
                <i class="fas fa-spinner fa-pulse"></i>
                <p>Analyzing your expression...</p>
            </div>
        `;
        
        // Send to server for processing
        processEmotion();
    }
    
    // Process the captured image for emotion detection
    function processEmotion() {
        fetch('/process_emotion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: capturedImage
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                emotionResult.innerHTML = `
                    <div class="emotion-placeholder">
                        <i class="fas fa-exclamation-circle" style="color: var(--danger-color);"></i>
                        <p>${data.error}</p>
                    </div>
                `;
                return;
            }
            
            // Store the detected emotion
            detectedEmotion = data.dominant_emotion;
            
            // Save to session storage for use on recommendations page
            sessionStorage.setItem('capturedImage', capturedImage);
            sessionStorage.setItem('detectedEmotion', detectedEmotion);
            sessionStorage.setItem('recommendations', JSON.stringify(data.recommendations));
            
            // Display the emotion
            emotionResult.innerHTML = `
                <div class="emotion-placeholder emotion-${detectedEmotion.toLowerCase()}">
                    <i class="fas fa-face-${getEmotionIcon(detectedEmotion)}" style="color: ${getEmotionColor(detectedEmotion)};"></i>
                    <p>We detected that you're feeling: <strong>${detectedEmotion}</strong></p>
                </div>
            `;
            
            // Show continue button
            continueBtn.style.display = 'inline-flex';
        })
        .catch(error => {
            console.error('Error processing emotion:', error);
            emotionResult.innerHTML = `
                <div class="emotion-placeholder">
                    <i class="fas fa-exclamation-triangle" style="color: var(--danger-color);"></i>
                    <p>Error processing emotion. Please try again.</p>
                </div>
            `;
        });
    }
    
    // Stop webcam
    function stopWebcam() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }
    
    // Restart webcam for retaking photo
    function retakePhoto() {
        // Clear captured image
        capturedImage = null;
        detectedEmotion = null;
        
        // Reset UI
        video.style.display = 'block';
        canvas.style.display = 'none';
        captureBtn.style.display = 'inline-flex';
        retakeBtn.style.display = 'none';
        continueBtn.style.display = 'none';
        
        // Reset emotion result
        emotionResult.innerHTML = `
            <div class="emotion-placeholder">
                <i class="fas fa-spinner fa-pulse"></i>
                <p>Ready to detect your emotion</p>
            </div>
        `;
        
        // Restart webcam
        startWebcam();
    }
    
    // Helper functions for UI
    function getEmotionIcon(emotion) {
        const iconMap = {
            'Angry': 'angry',
            'Disgust': 'dizzy',
            'Fear': 'frown',
            'Happy': 'smile',
            'Neutral': 'meh',
            'Sad': 'sad-tear',
            'Surprise': 'surprise'
        };
        return iconMap[emotion] || 'smile';
    }
    
    function getEmotionColor(emotion) {
        const colorMap = {
            'Angry': 'red',
            'Disgust': 'purple',
            'Fear': 'black',
            'Happy': 'gold',
            'Neutral': 'gray',
            'Sad': 'blue',
            'Surprise': 'orange'
        };
        return colorMap[emotion] || 'var(--primary-color)';
    }
    
    // Event listeners
    captureBtn.addEventListener('click', captureImage);
    retakeBtn.addEventListener('click', retakePhoto);
    continueBtn.addEventListener('click', () => {
        window.location.href = '/recommendations';
    });
    
    // Initialize
    startWebcam();
    
    // Clean up when leaving the page
    window.addEventListener('beforeunload', stopWebcam);
});