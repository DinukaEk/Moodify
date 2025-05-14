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
                emotion: document.getElementById('emotion').value
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
                        // Remove the song item from the DOM
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