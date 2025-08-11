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

    // Form elements
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const languageForm = document.getElementById('languageForm');
    
    // Password toggle functionality
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });

    // Password strength checker
    const newPasswordInput = document.getElementById('newPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const strengthFill = passwordStrength.querySelector('.strength-fill');
    const strengthText = passwordStrength.querySelector('.strength-text');

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            updatePasswordStrength(strength);
        });
    }

    // Profile form submission
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateProfile();
        });
    }

    // Password form submission
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updatePassword();
        });
    }

    // Language form submission
    if (languageForm) {
        languageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateLanguagePreferences();
        });
    }

    // Cancel buttons
    const cancelProfileBtn = document.getElementById('cancelProfileChanges');
    const cancelPasswordBtn = document.getElementById('cancelPasswordChanges');
    const cancelLanguageBtn = document.getElementById('cancelLanguageChanges');

    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', function() {
            resetProfileForm();
        });
    }

    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', function() {
            resetPasswordForm();
        });
    }

    if (cancelLanguageBtn) {
        cancelLanguageBtn.addEventListener('click', function() {
            resetLanguageForm();
        });
    }

    // Danger action buttons
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function() {
            confirmClearHistory();
        });
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            confirmDeleteAccount();
        });
    }

    // Load current language preferences
    loadCurrentLanguagePreferences();

    // Functions
    function calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        
        return Math.min(score, 4);
    }

    function updatePasswordStrength(strength) {
        const strengthLevels = ['', 'weak', 'fair', 'good', 'strong'];
        const strengthTexts = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        
        strengthFill.className = `strength-fill ${strengthLevels[strength]}`;
        strengthText.textContent = `Password strength: ${strengthTexts[strength]}`;
    }

    async function updateProfile() {
        const formData = new FormData(profileForm);
        const profileData = {
            name: formData.get('fullName'),
            email: formData.get('email')
        };

        try {
            showLoading('Updating profile...');
            
            const response = await fetch('/update_profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showToast('Profile updated successfully!', 'success');
                // Update the navbar name if changed
                const userNameSpan = document.querySelector('.user-name');
                if (userNameSpan) {
                    userNameSpan.textContent = profileData.name;
                }
            } else {
                throw new Error(data.error || 'Failed to update profile');
            }
        } catch (error) {
            hideLoading();
            console.error('Error updating profile:', error);
            showToast(error.message || 'Error updating profile', 'error');
        }
    }

    async function updatePassword() {
        const formData = new FormData(passwordForm);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }

        // Validate password strength
        const strength = calculatePasswordStrength(newPassword);
        if (strength < 2) {
            showToast('Please choose a stronger password', 'error');
            return;
        }

        const passwordData = {
            current_password: currentPassword,
            new_password: newPassword
        };

        try {
            showLoading('Updating password...');
            
            const response = await fetch('/update_password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(passwordData),
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showToast('Password updated successfully!', 'success');
                resetPasswordForm();
            } else {
                throw new Error(data.error || 'Failed to update password');
            }
        } catch (error) {
            hideLoading();
            console.error('Error updating password:', error);
            showToast(error.message || 'Error updating password', 'error');
        }
    }

    async function updateLanguagePreferences() {
        const checkedLanguages = Array.from(document.querySelectorAll('input[name="languages"]:checked'))
            .map(checkbox => checkbox.value);

        if (checkedLanguages.length === 0) {
            const errorMessage = document.getElementById('languageError');
            errorMessage.classList.add('show');
            setTimeout(() => {
                errorMessage.classList.remove('show');
            }, 3000);
            return;
        }

        const languageData = {
            languages: checkedLanguages
        };

        try {
            showLoading('Updating language preferences...');
            
            const response = await fetch('/update_language_preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(languageData),
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showToast('Language preferences updated successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to update language preferences');
            }
        } catch (error) {
            hideLoading();
            console.error('Error updating language preferences:', error);
            showToast(error.message || 'Error updating language preferences', 'error');
        }
    }

    async function loadCurrentLanguagePreferences() {
        try {
            const response = await fetch('/get_language_preferences');
            const data = await response.json();

            if (data.success && data.languages) {
                data.languages.forEach(language => {
                    const checkbox = document.querySelector(`input[value="${language}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
        } catch (error) {
            console.error('Error loading language preferences:', error);
        }
    }

    function resetProfileForm() {
        profileForm.reset();
        // You might want to reload the original values here
        location.reload();
    }

    function resetPasswordForm() {
        passwordForm.reset();
        strengthFill.className = 'strength-fill';
        strengthText.textContent = 'Password strength';
    }

    function resetLanguageForm() {
        const checkboxes = document.querySelectorAll('input[name="languages"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        loadCurrentLanguagePreferences();
    }

    function confirmClearHistory() {
        if (confirm('Are you sure you want to clear your activity history? This action cannot be undone.')) {
            clearActivityHistory();
        }
    }

    function confirmDeleteAccount() {
        const confirmation = prompt('This will permanently delete your account and all associated data. Type "DELETE" to confirm:');
        if (confirmation === 'DELETE') {
            deleteAccount();
        }
    }

    async function clearActivityHistory() {
        try {
            showLoading('Clearing activity history...');
            
            const response = await fetch('/clear_activity_history', {
                method: 'POST',
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showToast('Activity history cleared successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to clear activity history');
            }
        } catch (error) {
            hideLoading();
            console.error('Error clearing activity history:', error);
            showToast(error.message || 'Error clearing activity history', 'error');
        }
    }

    async function deleteAccount() {
        try {
            showLoading('Deleting account...');
            
            const response = await fetch('/delete_account', {
                method: 'POST',
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showToast('Account deleted successfully. Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                throw new Error(data.error || 'Failed to delete account');
            }
        } catch (error) {
            hideLoading();
            console.error('Error deleting account:', error);
            showToast(error.message || 'Error deleting account', 'error');
        }
    }

    function showLoading(message = 'Loading...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (loadingOverlay && loadingText) {
            loadingText.textContent = message;
            loadingOverlay.classList.add('show');
        }
    }

    function hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');
        
        // Set icon based on type
        if (type === 'success') {
            toastIcon.className = 'toast-icon fas fa-check-circle';
            toast.className = 'toast success';
        } else {
            toastIcon.className = 'toast-icon fas fa-exclamation-circle';
            toast.className = 'toast error';
        }
        
        toastMessage.textContent = message;
        
        // Show toast
        toast.classList.add('show');
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Form validation on input
    const inputs = document.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateField(this);
            }
        });
    });

    function validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        } else if (field.type === 'email' && value && !isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }

        if (isValid) {
            field.classList.remove('error');
            removeFieldError(field);
        } else {
            field.classList.add('error');
            showFieldError(field, errorMessage);
        }

        return isValid;
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showFieldError(field, message) {
        removeFieldError(field);
        
        const errorElement = document.createElement('span');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #ff6b6b;
            font-size: 0.85rem;
            margin-top: 5px;
            display: block;
        `;
        
        field.parentNode.appendChild(errorElement);
    }

    function removeFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    // Add error styles
    const style = document.createElement('style');
    style.textContent = `
        .form-group input.error {
            border-color: #ff6b6b !important;
            background-color: #fff5f5 !important;
        }
        
        .form-group input.error:focus {
            box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1) !important;
        }
    `;
    document.head.appendChild(style);
});