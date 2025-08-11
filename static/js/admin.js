document.addEventListener('DOMContentLoaded', function() {
    // Add new song
    const addSongForm = document.getElementById('add-song-form');
    if (addSongForm) {
        addSongForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate form data
            const title = document.getElementById('title').value.trim();
            const artist = document.getElementById('artist').value.trim();
            const url = document.getElementById('url').value.trim();
            const emotion = document.getElementById('emotion').value;
            const language = document.getElementById('language').value;
            
            if (!title || !artist || !url || !emotion || !language) {
                alert('Please fill in all fields');
                return;
            }
            
            const formData = {
                title: title,
                artist: artist,
                url: url,
                emotion: emotion,
                language: language
            };
            
            // Show loading state
            const submitButton = addSongForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Adding...';
            submitButton.disabled = true;
            
            console.log('Sending data:', formData); // Debug log
            
            fetch('/admin/add_song', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add CSRF token if you're using Flask-WTF
                    // 'X-CSRFToken': document.querySelector('meta[name=csrf-token]').getAttribute('content')
                },
                body: JSON.stringify(formData)
            })
            .then(response => {
                console.log('Response status:', response.status); // Debug log
                console.log('Response headers:', response.headers); // Debug log
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data); // Debug log
                
                if (data.success) {
                    alert('Song added successfully!');
                    addSongForm.reset(); // Reset form instead of reloading page
                    // Optionally reload the page to show the new song
                    window.location.reload();
                } else {
                    alert('Error adding song: ' + (data.error || data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                
                // More specific error messages
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    alert('Network error: Unable to connect to server. Please check your connection and try again.');
                } else if (error.message.includes('HTTP error')) {
                    alert('Server error: ' + error.message + '. Please check the server logs.');
                } else {
                    alert('An error occurred while adding the song: ' + error.message);
                }
            })
            .finally(() => {
                // Reset button state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            });
        });
    }
    
    // Delete song
    const deleteButtons = document.querySelectorAll('.delete-song');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const songId = this.getAttribute('data-song-id');
            
            if (confirm('Are you sure you want to delete this song?')) {
                // Show loading state
                const originalText = this.textContent;
                this.textContent = 'Deleting...';
                this.disabled = true;
                
                fetch(`/admin/delete_song/${songId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        // Add CSRF token if needed
                        // 'X-CSRFToken': document.querySelector('meta[name=csrf-token]').getAttribute('content')
                    }
                })
                .then(response => {
                    console.log('Delete response status:', response.status); // Debug log
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    return response.json();
                })
                .then(data => {
                    console.log('Delete response data:', data); // Debug log
                    
                    if (data.success) {
                        const songItem = this.closest('.song-item');
                        songItem.remove();
                        alert('Song deleted successfully!');
                    } else {
                        alert('Error deleting song: ' + (data.error || data.message || 'Unknown error'));
                    }
                })
                .catch(error => {
                    console.error('Delete error:', error);
                    
                    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                        alert('Network error: Unable to connect to server. Please check your connection and try again.');
                    } else if (error.message.includes('HTTP error')) {
                        alert('Server error: ' + error.message + '. Please check the server logs.');
                    } else {
                        alert('An error occurred while deleting the song: ' + error.message);
                    }
                })
                .finally(() => {
                    // Reset button state
                    this.textContent = originalText;
                    this.disabled = false;
                });
            }
        });
    });
});