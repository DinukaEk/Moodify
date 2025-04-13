// Simple animation for the welcome page
document.addEventListener('DOMContentLoaded', function() {
    // Add pulse animation to the start button
    const startButton = document.querySelector('.start-button');
    startButton.classList.add('pulse-animation');
    
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

    // Handle logout functionality
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // You can add confirmation dialog if needed
        window.location.href = this.getAttribute('href');
    });

    // Display username from session if available
    function setUserName() {
        // This assumes your backend passes user information via a global variable
        // Alternative approach: fetch user data via AJAX
        if (typeof currentUser !== 'undefined' && currentUser.name) {
            document.querySelector('.user-name').textContent = currentUser.name;
        }
    }
    
    setUserName();
});