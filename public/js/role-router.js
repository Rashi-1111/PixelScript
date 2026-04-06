function getStoredToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function getDashboardPathForRole(role) {
    switch ((role || '').toLowerCase()) {
        case 'consumer':
            return 'stories.html';
        case 'writer':
            return 'home.html';
        case 'artist':
            return 'home.html';
        case 'editor':
            return 'home.html';
        default:
            return 'home.html';
    }
}

async function fetchCurrentUserForRouting() {
    const token = getStoredToken();
    if (!token) {
        return null;
    }

    const response = await fetch('/api/users/me', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to load current user');
    }

    return response.json();
}

window.getDashboardPathForRole = getDashboardPathForRole;
window.fetchCurrentUserForRouting = fetchCurrentUserForRouting;
