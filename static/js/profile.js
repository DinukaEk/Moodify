document.addEventListener('DOMContentLoaded', function() {
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

    // Profile picture upload functionality
    const profileAvatar = document.querySelector('.profile-avatar');
    const avatarUpload = document.getElementById('avatarUpload');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const profileImage = document.getElementById('profileImage');

    if (changeAvatarBtn && avatarUpload) {
        changeAvatarBtn.addEventListener('click', function() {
            avatarUpload.click();
        });

        profileAvatar.addEventListener('click', function() {
            avatarUpload.click();
        });

        avatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    showToast('Please select a valid image file', 'error');
                    return;
                }

                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    showToast('Image size should be less than 5MB', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    profileImage.src = e.target.result;
                    uploadProfilePicture(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Download user data functionality
    const downloadDataBtn = document.getElementById('downloadDataBtn');
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', function() {
            downloadUserData();
        });
    }

    // Load more activity functionality
    const loadMoreActivityBtn = document.getElementById('loadMoreActivity');
    const activityList = document.getElementById('activityList');
    let activityPage = 1;

    if (loadMoreActivityBtn) {
        loadMoreActivityBtn.addEventListener('click', function() {
            loadMoreActivity();
        });
    }

    // Load initial activity data
    loadRecentActivity();

    // Functions
    async function uploadProfilePicture(imageData) {
        try {
            showLoading('Uploading profile picture...');
            
            const response = await fetch('/update_profile_picture', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showToast('Profile picture updated successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to update profile picture');
            }
        } catch (error) {
            hideLoading();
            console.error('Error uploading profile picture:', error);
            showToast(error.message || 'Error uploading profile picture', 'error');
        }
    }

    async function downloadUserData() {
        try {
            showLoading('Preparing your data for download...');
            
            const response = await fetch('/download_user_data', {
                method: 'GET',
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'moodify_user_data.json';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                hideLoading();
                showToast('User data downloaded successfully!', 'success');
            } else {
                throw new Error('Failed to download user data');
            }
        } catch (error) {
            hideLoading();
            console.error('Error downloading user data:', error);
            showToast('Error downloading user data', 'error');
        }
    }

    async function loadRecentActivity() {
        try {
            const response = await fetch('/get_user_activity?page=1&limit=3');
            const data = await response.json();

            if (data.success && data.activities) {
                displayActivities(data.activities, true);
                
                // Hide load more button if no more activities
                if (data.activities.length < 3 || !data.has_more) {
                    loadMoreActivityBtn.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    async function loadMoreActivity() {
        try {
            activityPage++;
            loadMoreActivityBtn.disabled = true;
            loadMoreActivityBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            
            const response = await fetch(`/get_user_activity?page=${activityPage}&limit=5`);
            const data = await response.json();

            if (data.success && data.activities) {
                displayActivities(data.activities, false);
                
                if (!data.has_more) {
                    loadMoreActivityBtn.style.display = 'none';
                } else {
                    loadMoreActivityBtn.disabled = false;
                    loadMoreActivityBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Load More Activity';
                }
            }
        } catch (error) {
            console.error('Error loading more activity:', error);
            loadMoreActivityBtn.disabled = false;
            loadMoreActivityBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Load More Activity';
        }
    }

    function displayActivities(activities, replace = false) {
        if (replace) {
            activityList.innerHTML = '';
        }

        activities.forEach(activity => {
            const activityItem = createActivityItem(activity);
            activityList.appendChild(activityItem);
        });
    }

    function createActivityItem(activity) {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';

        const emotionIcon = getEmotionIcon(activity.emotion);
        const timeAgo = formatTimeAgo(activity.timestamp);

        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="${emotionIcon}"></i>
            </div>
            <div class="activity-details">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
                <span class="activity-time">${timeAgo}</span>
            </div>
        `;

        return activityItem;
    }

    function getEmotionIcon(emotion) {
        const icons = {
            'Happy': 'fas fa-smile-beam',
            'Sad': 'fas fa-sad-tear',
            'Angry': 'fas fa-angry',
            'Surprise': 'fas fa-surprise',
            'Fear': 'fas fa-fearful',
            'Disgust': 'fas fa-dizzy',
            'Neutral': 'fas fa-meh',
            'Excited': 'fas fa-grin-stars',
            'Stressed': 'fas fa-tired',
            'Lonely': 'fas fa-frown',
            'Pregnant': 'fas fa-baby',
            'Depression': 'fas fa-sad-cry',
            'Trouble Sleeping': 'fas fa-bed',
            'Travelling': 'fas fa-plane'
        };
        return icons[emotion] || 'fas fa-music';
    }

    function formatTimeAgo(timestamp) {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInMs = now - activityTime;
        
        const seconds = Math.floor(diffInMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return days === 1 ? '1 day ago' : `${days} days ago`;
        } else if (hours > 0) {
            return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        } else if (minutes > 0) {
            return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
        } else {
            return 'Just now';
        }
    }

    function showLoading(message = 'Loading...') {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay show';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    function hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon ${icon}"></i>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Add CSS for loading and toast if not already present
    if (!document.getElementById('profileDynamicStyles')) {
        const style = document.createElement('style');
        style.id = 'profileDynamicStyles';
        style.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(5px);
            }

            .loading-overlay.show {
                display: flex;
            }

            .loading-content {
                background: white;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .toast {
                position: fixed;
                top: 100px;
                right: 20px;
                background: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                transform: translateX(400px);
                transition: transform 0.3s ease;
                z-index: 1001;
            }

            .toast.show {
                transform: translateX(0);
            }

            .toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .toast-icon {
                font-size: 1.2rem;
            }

            .toast.success .toast-icon {
                color: #0be881;
            }

            .toast.error .toast-icon {
                color: #ff6b6b;
            }

            .toast-message {
                font-weight: 600;
                color: #333;
            }
        `;
        document.head.appendChild(style);
    }
});