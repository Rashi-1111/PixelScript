// Database of creative partners
const partners = [
    {
        id: 1,
        name: "Kai Winters",
        role: "Artist",
        avatar: "images/profiles/kai.jpeg",
        bio: "Digital artist specializing in cyberpunk and sci-fi illustrations. Creates immersive futuristic worlds with a unique neon-noir aesthetic.",
        tags: ["Sci-Fi", "Cyberpunk", "Digital Art"],
        genre: "scifi",
        country: "USA",
        ageGroup: "25-34",
        experience: "5-10"
    },
    {
        id: 2,
        name: "Yijin Huan",
        role: "Writer",
        avatar: "images/profiles/yijin.jpeg",
        bio: "Fantasy novelist with a passion for world-building and creating complex magic systems. Published author of the 'Crystal Realms' series.",
        tags: ["Fantasy", "World-building", "Magic"],
        genre: "fantasy",
        country: "Canada",
        ageGroup: "25-34",
        experience: "5-10"
    },
    {
        id: 3,
        name: "Elena Cooper",
        role: "Artist",
        avatar: "images/profiles/elena.jpeg",
        bio: "Traditional artist turned digital illustrator. Specializes in mystery and thriller book covers with a dark, atmospheric style.",
        tags: ["Mystery", "Dark Art", "Book Covers"],
        genre: "mystery",
        country: "UK",
        ageGroup: "35-44",
        experience: "10+"
    },
    {
        id: 4,
        name: "Akiko Honda",
        role: "Writer",
        avatar: "images/profiles/akiko.jpeg",
        bio: "Romance and contemporary fiction author. Creates heartwarming stories with diverse characters and compelling emotional arcs.",
        tags: ["Romance", "Contemporary", "Drama"],
        genre: "romance",
        country: "Japan",
        ageGroup: "25-34",
        experience: "1-5"
    },
    {
        id: 5,
        name: "Alexa Turner",
        role: "Artist",
        avatar: "images/profiles/sarah.jpeg",
        bio: "Comic artist and illustrator with a dynamic, action-packed style. Works primarily in fantasy and young adult genres.",
        tags: ["Comics", "YA", "Action"],
        genre: "fantasy",
        country: "UK",
        ageGroup: "25-34",
        experience: "5-10"
    },
    {
        id: 6,
        name: "Crystal Lee",
        role: "Writer",
        avatar: "images/profiles/crystal.jpeg",
        bio: "Romance and psychological fiction writer who explores complex relationships and human nature through my stories.",
        tags: ["Romance", "Psychology", "Contemporary"],
        genre: "romance",
        country: "USA",
        ageGroup: "25-34",
        experience: "1-5"
    }
];

// Update user profile info from localStorage
function updateUserProfile() {
    const userProfile = JSON.parse(localStorage.getItem('userProfile')) || {
        name: "Default User",
        role: "Artist",
        avatar: "images/user2.jpeg"
    };

    console.log('Updating profile with:', userProfile); // Debug log

    // Update the header profile image and role
    const userAvatar = document.querySelector('.user-info .user-avatar');
    const userRole = document.querySelector('.user-info .user-role');
    
    if (userAvatar) {
        userAvatar.src = userProfile.avatar;
        userAvatar.alt = userProfile.name;
        console.log('Updated avatar:', userAvatar.src); // Debug log
    } else {
        console.warn('User avatar element not found'); // Debug log
    }

    if (userRole) {
        userRole.textContent = userProfile.role;
        console.log('Updated role:', userRole.textContent); // Debug log
    } else {
        console.warn('User role element not found'); // Debug log
    }
}

// Calculate match percentage based on selected criteria
function calculateMatchPercentage(partner, filters) {
    let matchPoints = 0;
    let totalPoints = 0;

    // Role matching (highest weight)
    if (filters.role) {
        totalPoints += 40;
        if (partner.role.toLowerCase() === filters.role.toLowerCase()) {
            matchPoints += 40;
        }
    }

    // Genre matching
    if (filters.genre) {
        totalPoints += 25;
        if (partner.genre.toLowerCase() === filters.genre.toLowerCase()) {
            matchPoints += 25;
        }
    }

    // Country matching
    if (filters.country) {
        totalPoints += 15;
        if (partner.country === filters.country) {
            matchPoints += 15;
        }
    }

    // Age group matching
    if (filters.ageGroup) {
        totalPoints += 10;
        if (partner.ageGroup === filters.ageGroup) {
            matchPoints += 10;
        }
    }

    // Experience matching
    if (filters.experience) {
        totalPoints += 10;
        if (partner.experience === filters.experience) {
            matchPoints += 10;
        }
    }

    return totalPoints > 0 ? Math.round((matchPoints / totalPoints) * 100) : 0;
}

// Create partner card HTML
function createPartnerCard(partner, matchPercentage, selectedGenre) {
    return `
        <div class="partner-card">
            <div class="match-score">${matchPercentage}% Match</div>
            <img src="${partner.avatar}" alt="${partner.name}" class="partner-avatar">
            <h3>${partner.name}</h3>
            <span class="partner-role">${partner.role}</span>
            <p class="partner-bio">${partner.bio}</p>
            <div class="partner-tags">
                ${partner.tags.map(tag => `<span class="tag ${tag.toLowerCase() === selectedGenre ? 'matching-genre' : ''}">${tag}</span>`).join('')}
            </div>
            <button class="connect-btn" onclick="handleConnect('${partner.name}')">Connect</button>
        </div>
    `;
}

// Handle connect button click
function handleConnect(partnerName) {
    alert(`Collaboration request sent to ${partnerName}!`);
}

// Update results based on filters
function updateResults() {
    const filters = {
        role: document.getElementById('partner-role').value,
        genre: document.getElementById('genre').value,
        country: document.getElementById('country').value,
        ageGroup: document.getElementById('age-group').value,
        experience: document.getElementById('experience').value
    };

    console.log('Filters:', filters); // Debug log

    // Calculate match percentages for all partners
    const matchedPartners = partners.map(partner => ({
        ...partner,
        matchPercentage: calculateMatchPercentage(partner, filters)
    }));

    // Sort by match percentage (highest to lowest)
    matchedPartners.sort((a, b) => b.matchPercentage - a.matchPercentage);

    console.log('Matched Partners:', matchedPartners); // Debug log

    // Update the grid
    const partnersGrid = document.getElementById('partnersGrid');
    if (partnersGrid) {
        partnersGrid.innerHTML = matchedPartners.length > 0
            ? matchedPartners.map(partner => createPartnerCard(partner, partner.matchPercentage, filters.genre)).join('')
            : '<div class="no-matches">No matching partners found</div>';
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded'); // Debug log
    
    // Update user profile from localStorage
    updateUserProfile();

    // Add event listener to Find Matches button
    const findMatchesBtn = document.getElementById('findMatchesBtn');
    if (findMatchesBtn) {
        console.log('Find Matches button found'); // Debug log
        findMatchesBtn.addEventListener('click', () => {
            console.log('Find Matches clicked'); // Debug log
            updateResults();
        });
    } else {
        console.warn('Find Matches button not found'); // Debug log
    }
    
    // Clear the grid initially
    const partnersGrid = document.getElementById('partnersGrid');
    if (partnersGrid) {
        partnersGrid.innerHTML = '<div class="no-matches">Click "Find Matches" to see potential partners</div>';
    }

    // Listen for profile updates
    window.addEventListener('storage', (e) => {
        if (e.key === 'userProfile') {
            console.log('Profile updated:', e.newValue); // Debug log
            updateUserProfile();
        }
    });
});
