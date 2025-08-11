document.addEventListener('DOMContentLoaded', function() {
    const languageItems = document.querySelectorAll('.language-item');
    const continueButton = document.getElementById('continueButton');
    const errorMessage = document.getElementById('errorMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    let selectedLanguages = [];

    // Handle language selection
    languageItems.forEach(item => {
        item.addEventListener('click', function() {
            const language = this.dataset.language;
            
            if (this.classList.contains('selected')) {
                // Deselect
                this.classList.remove('selected');
                selectedLanguages = selectedLanguages.filter(lang => lang !== language);
            } else {
                // Select
                this.classList.add('selected');
                selectedLanguages.push(language);
            }
            
            // Update continue button state
            if (selectedLanguages.length > 0) {
                continueButton.classList.add('active');
                errorMessage.style.display = 'none';
            } else {
                continueButton.classList.remove('active');
            }
        });
    });

    // Handle continue button click
    continueButton.addEventListener('click', function() {
        if (selectedLanguages.length === 0) {
            errorMessage.style.display = 'block';
            errorMessage.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // Show loading
        loadingIndicator.style.display = 'flex';
        continueButton.style.display = 'none';

        // Save language preferences
        fetch('/save_language_preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                languages: selectedLanguages
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Redirect to welcome page
                window.location.href = '/welcome';
            } else {
                throw new Error(data.error || 'Failed to save preferences');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            errorMessage.textContent = 'An error occurred while saving your preferences. Please try again.';
            errorMessage.style.display = 'block';
            loadingIndicator.style.display = 'none';
            continueButton.style.display = 'inline-block';
        });
    });
});