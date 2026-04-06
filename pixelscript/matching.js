// Function to start collaboration with a partner
function startCollaboration(partnerName) {
    // Get user role from the header
    const userRole = document.querySelector('.user-role').textContent.toLowerCase();
    
    // Redirect to collaboration page with appropriate parameters
    window.location.href = `collab.html?partner=${encodeURIComponent(partnerName)}&role=${userRole}`;
}

// Search functionality
const searchBtn = document.querySelector('.search-btn');
const partnerRoleSelect = document.getElementById('partner-role');
const genreSelect = document.getElementById('genre');

searchBtn.addEventListener('click', () => {
    const partnerRole = partnerRoleSelect.value;
    const genre = genreSelect.value;
    
    // Here you would typically make an API call to get matching partners
    // For now, we'll just show a loading state
    const resultsSection = document.querySelector('.results-section');
    resultsSection.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Finding matching partners...</p>
        </div>
    `;
    
    // Simulate API call delay
    setTimeout(() => {
        // This would be replaced with actual API results
        resultsSection.innerHTML = `
            <h3>Available Partners</h3>
            <div class="partners-grid">
                <div class="partner-card">
                    <img src="images/user-1.png" alt="Partner" class="partner-avatar">
                    <div class="partner-info">
                        <h4>Alex</h4>
                        <p class="partner-role">Writer</p>
                        <p class="partner-genre">Fantasy, Sci-Fi</p>
                        <div class="partner-stats">
                            <span><i class="fas fa-star"></i> 4.8</span>
                            <span><i class="fas fa-users"></i> 12 collabs</span>
                        </div>
                    </div>
                    <button class="collab-btn" onclick="startCollaboration('Alex')">Start Collaboration</button>
                </div>
            </div>
        `;
    }, 1500);
});

// Update user role based on login
function updateUserRole(role) {
    const userRoleElement = document.querySelector('.user-role');
    userRoleElement.textContent = role;
    
    // Update partner role select to show opposite role
    const partnerRoleSelect = document.getElementById('partner-role');
    partnerRoleSelect.value = role === 'Artist' ? 'writer' : 'artist';
}

// Check URL parameters for role
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get('role');
if (role) {
    updateUserRole(role);
} 