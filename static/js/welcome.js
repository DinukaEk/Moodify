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
});