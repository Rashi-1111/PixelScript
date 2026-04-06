if (!window.__pixelScriptProfileAppLoaded) {
    window.__pixelScriptProfileAppLoaded = true;
    let currentProfile = null;

    function getToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }

    function authHeaders(extraHeaders = {}) {
        return {
            Authorization: `Bearer ${getToken()}`,
            ...extraHeaders
        };
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function setImage(id, value, fallback = 'images/default-avatar.png') {
        const element = document.getElementById(id);
        if (element) {
            element.src = value || fallback;
        }
    }

    function formatRole(role) {
        return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Writer';
    }

    function updateStoredProfile(user) {
        localStorage.setItem('userProfile', JSON.stringify({
            name: user.name || 'User',
            role: formatRole(user.role),
            avatar: user.profilePicture || 'images/default-avatar.png'
        }));
    }

    function updateProfileCompletion(user) {
        const fields = [
            user.name,
            user.about || user.bio,
            user.bio,
            (user.genres || []).join(', '),
            user.role
        ];
        const completed = fields.filter(value => value && String(value).trim()).length;
        const percentage = Math.round((completed / fields.length) * 100);

        setText('progressPercent', `${percentage}%`);
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
    }

    function renderProfile(user) {
        currentProfile = {
            ...user,
            about: user.about || user.bio || ''
        };
        setText('userName', user.name || 'User');
        setText('userEmail', user.email || '');
        setText('about-content', currentProfile.about || 'Tell people about yourself');
        setText('bio-content', user.bio || 'Add your bio here');
        setText('interest-content', (user.genres || []).join(', ') || 'Add your interests here');
        setImage('profilePic', user.profilePicture);

        const roleText = document.querySelector('#role-content .role-text');
        if (roleText) {
            roleText.textContent = formatRole(user.role);
        }

        updateProfileCompletion(currentProfile);
        updateStoredProfile(currentProfile);
    }

    function getDraftProfile() {
        const aboutValue = document.getElementById('edit-about')?.value?.trim();
        const bioValue = document.getElementById('edit-bio')?.value?.trim();
        const interestValue = document.getElementById('edit-interest')?.value?.trim();
        const activeRoleOption = document.querySelector('#role-options .role-option.active');

        return {
            ...(currentProfile || {}),
            name: document.getElementById('editUsername')?.value?.trim() || currentProfile?.name || document.getElementById('userName')?.textContent || '',
            about: aboutValue !== undefined ? aboutValue : (currentProfile?.about || ''),
            bio: bioValue !== undefined ? bioValue : (currentProfile?.bio || ''),
            genres: interestValue !== undefined
                ? interestValue.split(',').map(item => item.trim().toLowerCase()).filter(Boolean)
                : (currentProfile?.genres || []),
            role: activeRoleOption?.dataset.role?.toLowerCase() || currentProfile?.role || 'writer'
        };
    }

    function updateCompletionFromDraft() {
        updateProfileCompletion(getDraftProfile());
    }

    function syncAboutModalFromProfile() {
        const draft = currentProfile || {};
        const aboutInput = document.getElementById('edit-about');
        const bioInput = document.getElementById('edit-bio');
        const interestInput = document.getElementById('edit-interest');
        const roleOptions = document.querySelectorAll('#role-options .role-option');

        if (aboutInput) {
            aboutInput.value = draft.about || '';
        }
        if (bioInput) {
            bioInput.value = draft.bio || '';
        }
        if (interestInput) {
            interestInput.value = (draft.genres || []).join(', ');
        }

        roleOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.role.toLowerCase() === (draft.role || 'writer'));
        });

        updateCompletionFromDraft();
    }

    function openAboutModal() {
        syncAboutModalFromProfile();
        const overlay = document.getElementById('about-edit-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    function closeAboutModal() {
        const overlay = document.getElementById('about-edit-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    function createWorkCard(work) {
        const media = work.fileType === 'image'
            ? `<img src="${work.fileUrl}" alt="${work.title}">`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:4rem;color:#3f6d71;"><i class="fas fa-file-alt"></i></div>`;

        return `
            <div class="work-item" data-work-id="${work._id}">
                ${media}
                <div class="work-overlay">
                    <div class="work-info">
                        <h3>${work.title}</h3>
                        <p>${work.description || ''}</p>
                    </div>
                    <div class="work-action-buttons">
                        <button class="view-btn" onclick="viewWork('${work.fileUrl}', '${work.fileType}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteWork('${work._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadProfile() {
        if (!getToken()) {
            window.location.href = '/login.html';
            return;
        }

        try {
            const response = await fetch('/api/users/me', {
                headers: authHeaders({
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    Pragma: 'no-cache',
                    Expires: '0'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            renderProfile(await response.json());
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    async function loadWorks() {
        const worksGrid = document.getElementById('worksGrid');
        if (!worksGrid || !getToken()) {
            return;
        }

        try {
            const response = await fetch('/api/users/works', {
                headers: authHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to load works');
            }

            const works = await response.json();
            worksGrid.innerHTML = works.length ? works.map(createWorkCard).join('') : '<p>No works uploaded yet.</p>';
            setText('worksCount', String(works.length));
        } catch (error) {
            console.error('Error loading works:', error);
        }
    }

    async function loadCollaborationCount() {
        if (!getToken()) {
            return;
        }

        try {
            const response = await fetch('/api/users/collaborations', {
                headers: authHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to load collaborations');
            }

            const collaborations = await response.json();
            setText('collabsCount', String(collaborations.length));
        } catch (error) {
            console.error('Error loading collaborations:', error);
        }
    }

    async function saveProfile() {
        if (!getToken()) {
            return;
        }

        const draft = getDraftProfile();
        const payload = {
            name: draft.name,
            about: draft.about,
            bio: draft.bio,
            role: draft.role,
            genres: draft.genres,
            skills: []
        };

        try {
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to save profile');
            }

            const savedUser = await response.json();
            renderProfile({
                ...savedUser,
                about: draft.about
            });
            closeAboutModal();
            alert('Profile saved successfully');
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile');
        }
    }

    async function updateProfilePicture(file) {
        if (!file || !getToken()) {
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', file);

        try {
            const response = await fetch('/api/users/profile-picture', {
                method: 'POST',
                headers: authHeaders(),
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to update profile picture');
            }

            renderProfile(await response.json());
        } catch (error) {
            console.error('Error updating profile picture:', error);
            alert('Failed to update profile picture');
        }
    }

    async function uploadWorks(event) {
        event.preventDefault();

        const title = document.getElementById('projectTitle')?.value?.trim();
        const description = document.getElementById('projectDescription')?.value?.trim() || '';
        const files = Array.from(document.getElementById('fileInput')?.files || []);

        if (!title || files.length === 0) {
            alert('Please add a title and select at least one file.');
            return;
        }

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('title', title);
                formData.append('description', description);
                formData.append('file', file);

                const response = await fetch('/api/users/works', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to upload work');
                }
            }

            document.getElementById('uploadForm')?.reset();
            setText('fileList', '');
            closeUploadModal();
            await loadWorks();
        } catch (error) {
            console.error('Error uploading work:', error);
            alert('Failed to upload work');
        }
    }

    async function deleteWork(workId) {
        if (!workId || !getToken()) {
            return;
        }

        try {
            const response = await fetch(`/api/users/works/${workId}`, {
                method: 'DELETE',
                headers: authHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to delete work');
            }

            await loadWorks();
        } catch (error) {
            console.error('Error deleting work:', error);
            alert('Failed to delete work');
        }
    }

    function viewWork(src, fileType = 'image') {
        const modal = document.createElement('div');
        modal.className = 'view-work-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn">&times;</span>
                ${fileType === 'image'
                    ? `<img src="${src}" alt="Work Preview" class="work-preview">`
                    : `<iframe src="${src}" title="Work Preview" style="width:100%;height:80vh;border:none;"></iframe>`}
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.close-btn').onclick = () => modal.remove();
        modal.onclick = event => {
            if (event.target === modal) {
                modal.remove();
            }
        };
    }

    function openUploadModal() {
        const overlay = document.getElementById('uploadOverlay');
        const modal = document.getElementById('uploadModal');
        if (overlay) {
            overlay.style.display = 'block';
        }
        if (modal) {
            modal.style.display = 'block';
        }
    }

    function closeUploadModal() {
        const overlay = document.getElementById('uploadOverlay');
        const modal = document.getElementById('uploadModal');
        if (overlay) {
            overlay.style.display = 'none';
        }
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function bindEvents() {
        const editAboutButton = document.getElementById('edit-about-btn');
        if (editAboutButton && !editAboutButton.dataset.profileAppBound) {
            editAboutButton.addEventListener('click', openAboutModal);
            editAboutButton.dataset.profileAppBound = 'true';
        }

        const cancelAboutButton = document.getElementById('cancel-about-btn');
        if (cancelAboutButton && !cancelAboutButton.dataset.profileAppBound) {
            cancelAboutButton.addEventListener('click', closeAboutModal);
            cancelAboutButton.dataset.profileAppBound = 'true';
        }

        const aboutOverlay = document.getElementById('about-edit-overlay');
        if (aboutOverlay && !aboutOverlay.dataset.profileAppBound) {
            aboutOverlay.addEventListener('click', event => {
                if (event.target === aboutOverlay) {
                    closeAboutModal();
                }
            });
            aboutOverlay.dataset.profileAppBound = 'true';
        }

        document.querySelectorAll('#role-options .role-option').forEach(option => {
            if (!option.dataset.profileAppBound) {
                option.addEventListener('click', () => {
                    document.querySelectorAll('#role-options .role-option').forEach(item => {
                        item.classList.remove('active');
                    });
                    option.classList.add('active');
                    updateCompletionFromDraft();
                });
                option.dataset.profileAppBound = 'true';
            }
        });

        ['edit-about', 'edit-bio', 'edit-interest', 'editUsername'].forEach(id => {
            const element = document.getElementById(id);
            if (element && !element.dataset.profileAppBound) {
                element.addEventListener('input', updateCompletionFromDraft);
                element.dataset.profileAppBound = 'true';
            }
        });

        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm && !uploadForm.dataset.profileAppBound) {
            uploadForm.addEventListener('submit', uploadWorks);
            uploadForm.dataset.profileAppBound = 'true';
        }

        const profilePicInput = document.getElementById('profilePicInput');
        if (profilePicInput && !profilePicInput.dataset.profileAppBound) {
            profilePicInput.addEventListener('change', event => {
                const file = event.target.files?.[0];
                if (file) {
                    updateProfilePicture(file);
                }
            });
            profilePicInput.dataset.profileAppBound = 'true';
        }

        const saveAboutButton = document.getElementById('save-about-btn');
        if (saveAboutButton && !saveAboutButton.dataset.profileAppBound) {
            saveAboutButton.addEventListener('click', () => {
                saveProfile();
            });
            saveAboutButton.dataset.profileAppBound = 'true';
        }
    }

    function init() {
        bindEvents();
        loadProfile();
        loadWorks();
        loadCollaborationCount();
    }

    window.openUploadModal = openUploadModal;
    window.closeUploadModal = closeUploadModal;
    window.openEditModal = openAboutModal;
    window.closeEditModal = closeAboutModal;
    window.saveProfile = saveProfile;
    window.selectRole = function selectRole(role) {
        const option = document.querySelector(`#role-options .role-option[data-role="${role.charAt(0).toUpperCase() + role.slice(1)}"]`);
        if (option) {
            option.click();
        }
    };
    window.viewWork = viewWork;
    window.deleteWork = deleteWork;
    window.handleProfilePicChange = function handleProfilePicChange(event) {
        const file = event.target.files?.[0];
        if (file) {
            updateProfilePicture(file);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
