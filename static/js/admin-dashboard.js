// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    initializeCharts();
    
    // Animate metric numbers
    animateMetrics();
    
    // Initialize real-time updates
    initializeRealTimeUpdates();
    
    // Initialize chart controls
    initializeChartControls();
});

// Initialize all charts
function initializeCharts() {
    initializeEmotionChart();
    initializeActivityChart();
}

// Emotion Distribution Chart
function initializeEmotionChart() {
    const ctx = document.getElementById('emotionChart');
    if (!ctx) return;
    
    // Set canvas size explicitly
    ctx.style.maxHeight = '300px';
    
    const emotionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Happy', 'Sad', 'Neutral', 'Angry', 'Surprise', 'Fear', 'Disgust'],
            datasets: [{
                data: [35, 20, 25, 8, 7, 3, 2],
                backgroundColor: [
                    '#f1c40f',
                    '#3498db',
                    '#95a5a6',
                    '#e74c3c',
                    '#9b59b6',
                    '#34495e',
                    '#e67e22'
                ],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 1500
            },
            cutout: '50%'
        }
    });
    
    // Store chart instance for updates
    window.emotionChart = emotionChart;
}

// User Activity Chart
function initializeActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    // Set canvas size explicitly
    ctx.style.maxHeight = '300px';
    
    const activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Emotion Detections',
                data: [65, 78, 90, 81, 96, 55, 40],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'New Users',
                data: [28, 35, 42, 38, 45, 25, 18],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#e74c3c',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
    
    // Store chart instance for updates
    window.activityChart = activityChart;
}

// Animate metric numbers
function animateMetrics() {
    const metrics = document.querySelectorAll('.metric-number');
    
    metrics.forEach(metric => {
        const target = parseInt(metric.textContent);
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            metric.textContent = Math.floor(current).toLocaleString();
        }, 16);
    });
}

// Initialize real-time updates
function initializeRealTimeUpdates() {
    // Simulate real-time data updates
    setInterval(() => {
        updateMetrics();
        updateActivityFeed();
    }, 30000); // Update every 30 seconds
}

// Update metrics with new data
function updateMetrics() {
    // Simulate data fetching
    fetch('/admin/get_dashboard_stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update metric numbers
                const totalUsers = document.getElementById('total-users');
                const totalSongs = document.getElementById('total-songs');
                const totalDetections = document.getElementById('total-detections');
                const activeSessions = document.getElementById('active-sessions');
                
                if (totalUsers) totalUsers.textContent = data.user_count || 0;
                if (totalSongs) totalSongs.textContent = data.song_count || 0;
                if (totalDetections) totalDetections.textContent = data.detection_count || 0;
                if (activeSessions) activeSessions.textContent = data.active_sessions || 0;
            }
        })
        .catch(error => {
            console.log('Stats update error:', error);
            // Fallback to simulated data
            simulateMetricUpdates();
        });
}

// Simulate metric updates when API is not available
function simulateMetricUpdates() {
    const metrics = [
        { id: 'total-users', change: Math.floor(Math.random() * 3) },
        { id: 'total-songs', change: Math.floor(Math.random() * 2) },
        { id: 'total-detections', change: Math.floor(Math.random() * 10) },
        { id: 'active-sessions', change: Math.floor(Math.random() * 5) - 2 }
    ];
    
    metrics.forEach(metric => {
        const element = document.getElementById(metric.id);
        if (element && metric.change > 0) {
            const current = parseInt(element.textContent.replace(/,/g, ''));
            element.textContent = (current + metric.change).toLocaleString();
        }
    });
}

// Update activity feed
function updateActivityFeed() {
    const activities = [
        { icon: 'happy', text: 'Happy emotion detected', time: 'Just now' },
        { icon: 'user', text: 'New user registered', time: '1 minute ago' },
        { icon: 'sad', text: 'Sad emotion detected', time: '2 minutes ago' },
        { icon: 'song', text: 'New song added to library', time: '3 minutes ago' }
    ];
    
    // Randomly select an activity
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    
    // Add new activity to the top of the feed
    const activityFeed = document.querySelector('.activity-feed');
    if (activityFeed) {
        const newActivity = createActivityItem(randomActivity);
        activityFeed.insertBefore(newActivity, activityFeed.firstChild);
        
        // Remove last activity if more than 4
        const activityItems = activityFeed.querySelectorAll('.activity-item');
        if (activityItems.length > 4) {
            activityFeed.removeChild(activityItems[activityItems.length - 1]);
        }
    }
}

// Create activity item element
function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.style.opacity = '0';
    item.style.transform = 'translateX(-20px)';
    
    item.innerHTML = `
        <div class="activity-icon ${activity.icon}">
            <i class="fas fa-${getIconClass(activity.icon)}"></i>
        </div>
        <div class="activity-content">
            <p>${activity.text}</p>
            <span class="activity-time">${activity.time}</span>
        </div>
    `;
    
    // Animate entry
    setTimeout(() => {
        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateX(0)';
    }, 100);
    
    return item;
}

// Get icon class for activity type
function getIconClass(type) {
    const iconMap = {
        'happy': 'smile',
        'user': 'user-plus',
        'sad': 'frown',
        'song': 'music'
    };
    return iconMap[type] || 'circle';
}

// Initialize chart controls
function initializeChartControls() {
    // Emotion chart period control
    const emotionPeriod = document.getElementById('emotion-period');
    if (emotionPeriod) {
        emotionPeriod.addEventListener('change', function() {
            updateEmotionChart(this.value);
        });
    }
    
    // Activity chart period control
    const activityPeriod = document.getElementById('activity-period');
    if (activityPeriod) {
        activityPeriod.addEventListener('change', function() {
            updateActivityChart(this.value);
        });
    }
}

// Update emotion chart based on period
function updateEmotionChart(period) {
    if (!window.emotionChart) return;
    
    // Simulate different data for different periods
    const periodData = {
        '7': [35, 20, 25, 8, 7, 3, 2],
        '30': [40, 18, 22, 10, 6, 2, 2],
        '90': [38, 22, 20, 12, 5, 2, 1]
    };
    
    const data = periodData[period] || periodData['7'];
    
    window.emotionChart.data.datasets[0].data = data;
    window.emotionChart.update('active');
}

// Update activity chart based on period
function updateActivityChart(period) {
    if (!window.activityChart) return;
    
    const periodData = {
        '7': {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            detections: [65, 78, 90, 81, 96, 55, 40],
            users: [28, 35, 42, 38, 45, 25, 18]
        },
        '30': {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            detections: [420, 380, 450, 390],
            users: [150, 140, 180, 160]
        }
    };
    
    const data = periodData[period] || periodData['7'];
    
    window.activityChart.data.labels = data.labels;
    window.activityChart.data.datasets[0].data = data.detections;
    window.activityChart.data.datasets[1].data = data.users;
    window.activityChart.update('active');
}

// Language progress bar animations
function animateLanguageBars() {
    const progressBars = document.querySelectorAll('.language-progress');
    
    progressBars.forEach((bar, index) => {
        setTimeout(() => {
            bar.style.transition = 'width 1s ease-in-out';
            bar.style.width = bar.style.width || '0%';
        }, index * 200);
    });
}

// Initialize language bar animations
setTimeout(animateLanguageBars, 1000);

// Song Management Functions (existing admin.js functionality)
document.addEventListener('DOMContentLoaded', function() {
    // Add new song
    const addSongForm = document.getElementById('add-song-form');
    if (addSongForm) {
        addSongForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('title').value,
                artist: document.getElementById('artist').value,
                url: document.getElementById('url').value,
                emotion: document.getElementById('emotion').value,
                language: document.getElementById('language').value
            };
            
            fetch('/admin/add_song', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Song added successfully!');
                    window.location.reload();
                } else {
                    alert('Error adding song: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while adding the song');
            });
        });
    }
    
    // Delete song
    const deleteButtons = document.querySelectorAll('.delete-song');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const songId = this.getAttribute('data-song-id');
            
            if (confirm('Are you sure you want to delete this song?')) {
                fetch(`/admin/delete_song/${songId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const songItem = this.closest('.song-item');
                        songItem.remove();
                    } else {
                        alert('Error deleting song: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while deleting the song');
                });
            }
        });
    });
});