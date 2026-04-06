// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    return token;
}

// Load user profile picture in navbar
async function loadProfilePicture() {
    try {
        const token = checkAuth();
        if (!token) return;

        const response = await fetch('/api/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Failed to load profile');
        }

        const data = await response.json();
        
        // Keep home behavior close to the original flow and only send readers
        // to the reading area automatically.
        if (data.role === 'consumer') {
            window.location.href = 'stories.html';
            return;
        }
        
        const profilePic = document.getElementById('nav-profile-pic') || document.getElementById('headerProfilePic') || document.getElementById('profileImage');
        
        if (profilePic) {
            profilePic.src = data.profilePicture || 'images/default-avatar.png';
        }
    } catch (error) {
        console.error('Error loading profile picture:', error);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// Handle logout
function handleLogout() {
    // Clear ALL storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear any cached data
    if (window.caches) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                caches.delete(cacheName);
            });
        });
    }
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfilePicture();
}); 
