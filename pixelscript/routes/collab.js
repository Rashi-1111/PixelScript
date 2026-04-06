const express = require('express');
const router = express.Router();
const Collaboration = require('../models/Collaboration');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const Story = require('../models/Story');
const Workspace = require('../models/Workspace');

function getPartnerRole(role) {
    return role === 'artist' ? 'writer' : 'artist';
}

function normalizeChapterNumber(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return 1;
    }
    return Math.max(1, Math.floor(parsed));
}

function normalizeChapterPanels(chapterPanels = [], fallbackCanvas = '', fallbackArtwork = []) {
    const fromPanels = (chapterPanels || [])
        .filter(panel => panel && panel.imageUrl)
        .map((panel, index) => ({
            title: String(panel.title || '').trim(),
            imageUrl: panel.imageUrl,
            order: Number(panel.order) || index + 1
        }))
        .sort((a, b) => a.order - b.order);

    if (fromPanels.length) {
        return fromPanels.map((panel, index) => ({
            ...panel,
            order: index + 1
        }));
    }

    const fallbackPanels = [];
    if (fallbackCanvas) {
        fallbackPanels.push({
            title: 'Panel 1',
            imageUrl: fallbackCanvas,
            order: 1
        });
    }

    (fallbackArtwork || [])
        .filter(asset => String(asset.type || '').startsWith('image/') && asset.url && asset.url !== fallbackCanvas)
        .forEach(asset => {
            fallbackPanels.push({
                title: asset.name || `Panel ${fallbackPanels.length + 1}`,
                imageUrl: asset.url,
                order: fallbackPanels.length + 1
            });
        });

    return fallbackPanels.map((panel, index) => ({
        ...panel,
        order: index + 1
    }));
}

function serializeCollaboration(collaboration, currentUserId) {
    const currentId = currentUserId ? currentUserId.toString() : '';
    const requesterId = collaboration.requester ? collaboration.requester.toString() : '';
    const artistId = collaboration.artist?._id ? collaboration.artist._id.toString() : collaboration.artist?.toString();
    const writerId = collaboration.writer?._id ? collaboration.writer._id.toString() : collaboration.writer?.toString();
    const publishedStoryId = collaboration.publishRequest?.story?._id
        ? collaboration.publishRequest.story._id.toString()
        : (collaboration.publishRequest?.story ? collaboration.publishRequest.story.toString() : null);

    return {
        ...collaboration.toObject(),
        canRespond: collaboration.status === 'pending' && requesterId && requesterId !== currentId,
        isRequester: requesterId === currentId,
        currentUserRole: artistId === currentId ? 'artist' : (writerId === currentId ? 'writer' : null),
        partner: artistId === currentId ? collaboration.writer : collaboration.artist,
        publishReady: Boolean(collaboration.storyTitle && collaboration.storyContent),
        chapterLabel: `Chapter ${normalizeChapterNumber(collaboration.chapterNumber)}`,
        publishedStoryId
    };
}

async function ensureCollaborationUsers(collaboration) {
    await User.updateMany(
        { _id: { $in: [collaboration.artist, collaboration.writer] } },
        { $addToSet: { collaborations: collaboration._id } }
    );
}

// Discover possible partners from real profiles
router.get('/discover', auth, async (req, res) => {
    try {
        const partnerRole = getPartnerRole(req.user.role);
        if (!['artist', 'writer'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only artists and writers can discover collaborators' });
        }

        const users = await User.find({
            _id: { $ne: req.user._id },
            role: partnerRole
        })
            .select('name username role bio about genres skills profilePicture profileCompletion works')
            .populate('works');

        res.json(users.map(user => ({
            _id: user._id,
            name: user.name,
            username: user.username,
            role: user.role,
            bio: user.bio || user.about || '',
            about: user.about || '',
            genres: user.genres || [],
            skills: user.skills || [],
            profilePicture: user.profilePicture,
            profileCompletion: user.profileCompletion || 0,
            works: (user.works || []).slice(0, 4).map(work => ({
                _id: work._id,
                title: work.title,
                description: work.description,
                fileType: work.fileType,
                fileUrl: `/api/users/works/${work._id}/file`
            }))
        })));
    } catch (error) {
        res.status(500).json({ message: 'Error discovering collaborators', error: error.message });
    }
});

// Create collaboration request
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, genre, category, partnerId, storyTitle, storySynopsis, chapterNumber, chapterTitle } = req.body;

        if (!['artist', 'writer'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only artists and writers can create collaborations' });
        }

        const partner = await User.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        if (partner.role !== getPartnerRole(req.user.role)) {
            return res.status(400).json({ message: 'Please choose a collaborator with the opposite role' });
        }

        const normalizedChapterNumber = normalizeChapterNumber(chapterNumber);
        const normalizedStoryTitle = String(storyTitle || title || '').trim();

        const existing = await Collaboration.findOne({
            $or: [
                {
                    artist: req.user._id,
                    writer: partner._id,
                    storyTitle: normalizedStoryTitle,
                    chapterNumber: normalizedChapterNumber,
                    status: { $in: ['pending', 'active'] }
                },
                {
                    artist: partner._id,
                    writer: req.user._id,
                    storyTitle: normalizedStoryTitle,
                    chapterNumber: normalizedChapterNumber,
                    status: { $in: ['pending', 'active'] }
                }
            ]
        });

        if (existing) {
            return res.status(400).json({ message: `You already have an active or pending collaboration for ${normalizedStoryTitle || 'this story'} chapter ${normalizedChapterNumber}` });
        }

        const room = `collab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const collaboration = new Collaboration({
            title: title || `${normalizedStoryTitle || `${req.user.name} x ${partner.name}`} - Chapter ${normalizedChapterNumber}`,
            description,
            genre,
            category: category || 'other',
            requester: req.user._id,
            room,
            storyTitle: normalizedStoryTitle,
            chapterNumber: normalizedChapterNumber,
            chapterTitle: chapterTitle || `Chapter ${normalizedChapterNumber}`,
            storySynopsis: storySynopsis || description || '',
            artist: req.user.role === 'artist' ? req.user._id : partner._id,
            writer: req.user.role === 'writer' ? req.user._id : partner._id
        });

        await collaboration.save();
        await ensureCollaborationUsers(collaboration);

        res.status(201).json(serializeCollaboration(collaboration, req.user._id));
    } catch (error) {
        res.status(500).json({ message: 'Error creating collaboration', error: error.message });
    }
});

// Get user's collaborations
router.get('/my-collaborations', auth, async (req, res) => {
    try {
        const collaborations = await Collaboration.find({
            $or: [{ artist: req.user._id }, { writer: req.user._id }]
        })
        .populate('artist', 'username name profilePicture role')
        .populate('writer', 'username name profilePicture role')
        .populate('publishRequest.story', 'title isPublished')
        .sort('-updatedAt');

        res.json(collaborations.map(item => serializeCollaboration(item, req.user._id)));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching collaborations', error: error.message });
    }
});

// Approve or reject request
router.put('/:id/respond', auth, async (req, res) => {
    try {
        const { action } = req.body;
        const collaboration = await Collaboration.findById(req.params.id);

        if (!collaboration) {
            return res.status(404).json({ message: 'Collaboration not found' });
        }

        const isParticipant = collaboration.artist.toString() === req.user.id || collaboration.writer.toString() === req.user.id;
        if (!isParticipant) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (collaboration.requester && collaboration.requester.toString() === req.user.id) {
            return res.status(400).json({ message: 'Requester cannot respond to their own invitation' });
        }

        if (action === 'accept') {
            collaboration.status = 'active';
        } else if (action === 'reject') {
            collaboration.status = 'rejected';
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        await collaboration.save();

        const populated = await Collaboration.findById(collaboration._id)
            .populate('artist', 'username name profilePicture role')
            .populate('writer', 'username name profilePicture role')
            .populate('publishRequest.story', 'title isPublished');

        res.json(serializeCollaboration(populated, req.user._id));
    } catch (error) {
        res.status(500).json({ message: 'Error responding to collaboration', error: error.message });
    }
});

// Get collaboration by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const collaboration = await Collaboration.findById(req.params.id)
            .populate('artist', 'username name profilePicture role')
            .populate('writer', 'username name profilePicture role')
            .populate('publishRequest.story', 'title isPublished');

        if (!collaboration) {
            return res.status(404).json({ message: 'Collaboration not found' });
        }

        // Check if user is part of the collaboration
        if (!collaboration.artist.equals(req.user._id) && !collaboration.writer.equals(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to view this collaboration' });
        }

        res.json(serializeCollaboration(collaboration, req.user._id));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching collaboration', error: error.message });
    }
});

// Update collaboration
router.put('/:id', auth, async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['title', 'description', 'status', 'canvas', 'storyTitle', 'chapterNumber', 'chapterTitle', 'storySynopsis', 'storyContent', 'progress', 'chapterPanels'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ message: 'Invalid updates' });
        }

        const collaboration = await Collaboration.findById(req.params.id);

        if (!collaboration) {
            return res.status(404).json({ message: 'Collaboration not found' });
        }

        // Check if user is part of the collaboration
        if (!collaboration.artist.equals(req.user._id) && !collaboration.writer.equals(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to update this collaboration' });
        }

        updates.forEach(update => {
            if (update === 'chapterPanels') {
                collaboration.chapterPanels = normalizeChapterPanels(req.body.chapterPanels || []);
                return;
            }
            if (update === 'chapterNumber') {
                collaboration.chapterNumber = normalizeChapterNumber(req.body.chapterNumber);
                return;
            }
            collaboration[update] = req.body[update];
        });
        collaboration.title = `${collaboration.storyTitle || collaboration.title} - Chapter ${normalizeChapterNumber(collaboration.chapterNumber)}`;
        await collaboration.save();

        const populated = await Collaboration.findById(collaboration._id)
            .populate('artist', 'username name profilePicture role')
            .populate('writer', 'username name profilePicture role')
            .populate('publishRequest.story', 'title isPublished');

        res.json(serializeCollaboration(populated, req.user._id));
    } catch (error) {
        res.status(500).json({ message: 'Error updating collaboration', error: error.message });
    }
});

// Start or approve publish request
router.put('/:id/publish-request', auth, async (req, res) => {
    try {
        const collaboration = await Collaboration.findById(req.params.id);

        if (!collaboration) {
            return res.status(404).json({ message: 'Collaboration not found' });
        }

        const isArtist = collaboration.artist.toString() === req.user.id;
        const isWriter = collaboration.writer.toString() === req.user.id;
        if (!isArtist && !isWriter) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (!collaboration.storyTitle || !collaboration.storyContent) {
            return res.status(400).json({ message: 'Add a story title and story content before requesting publication' });
        }

        if (!collaboration.publishRequest.requestedAt) {
            collaboration.publishRequest.requestedAt = new Date();
            collaboration.publishRequest.requestedBy = req.user._id;
        }

        if (isArtist) {
            collaboration.publishRequest.artistApproved = true;
        }

        if (isWriter) {
            collaboration.publishRequest.writerApproved = true;
        }

        if (collaboration.publishRequest.artistApproved && collaboration.publishRequest.writerApproved && !collaboration.publishRequest.story) {
            const workspace = await Workspace.findOne({ room: collaboration.room }).lean();
            const coverImage = collaboration.files.find(file => String(file.type || '').startsWith('image/'))?.url || 'images/default-cover.png';
            const chapterPanels = normalizeChapterPanels(
                collaboration.chapterPanels,
                workspace?.canvasState || '',
                workspace?.assets || []
            );
            const normalizedGenre = ['fantasy', 'scifi', 'mystery', 'romance', 'horror', 'thriller', 'other'].includes(String(collaboration.genre).toLowerCase())
                ? String(collaboration.genre).toLowerCase()
                : 'other';
            const normalizedChapterNumber = normalizeChapterNumber(collaboration.chapterNumber);
            const chapterTitle = collaboration.chapterTitle || `Chapter ${normalizedChapterNumber}`;
            let story = await Story.findOne({
                author: collaboration.writer,
                title: collaboration.storyTitle
            });

            if (story) {
                story.description = collaboration.storySynopsis || collaboration.description || story.description || '';
                story.genre = normalizedGenre;
                if (!story.coverImage || story.coverImage === 'images/default-cover.png') {
                    story.coverImage = coverImage;
                }

                const existingChapterIndex = story.chapters.findIndex(chapter => Number(chapter.order) === normalizedChapterNumber);
                const chapterPayload = {
                    title: chapterTitle,
                    content: collaboration.storyContent,
                    isFree: normalizedChapterNumber <= 2,
                    order: normalizedChapterNumber,
                    panels: chapterPanels
                };

                if (existingChapterIndex >= 0) {
                    story.chapters[existingChapterIndex] = {
                        ...story.chapters[existingChapterIndex].toObject(),
                        ...chapterPayload
                    };
                } else {
                    story.chapters.push(chapterPayload);
                }

                story.chapters = story.chapters.sort((a, b) => a.order - b.order).map((chapter, index) => ({
                    ...chapter.toObject ? chapter.toObject() : chapter,
                    isFree: chapter.order <= 2,
                    order: chapter.order || index + 1
                }));
                story.projectBoard = {
                    synopsis: story.description || '',
                    finalNotes: '',
                    canvasPreview: chapterPanels[0]?.imageUrl || workspace?.canvasState || '',
                    panels: chapterPanels,
                    artwork: (workspace?.assets || [])
                        .filter(asset => String(asset.type || '').startsWith('image/'))
                        .map(asset => ({
                            name: asset.name,
                            url: asset.url,
                            type: asset.type
                        }))
                };
                story.isPublished = true;
                await story.save();
            } else {
                story = await Story.create({
                    title: collaboration.storyTitle,
                    description: collaboration.storySynopsis || collaboration.description || '',
                    author: collaboration.writer,
                    genre: normalizedGenre,
                    coverImage,
                    chapters: [{
                        title: chapterTitle,
                        content: collaboration.storyContent,
                        isFree: normalizedChapterNumber <= 2,
                        order: normalizedChapterNumber,
                        panels: chapterPanels
                    }],
                    sourceCollaboration: collaboration._id,
                    projectBoard: {
                        synopsis: collaboration.storySynopsis || collaboration.description || '',
                        finalNotes: '',
                        canvasPreview: chapterPanels[0]?.imageUrl || workspace?.canvasState || '',
                        panels: chapterPanels,
                        artwork: (workspace?.assets || [])
                            .filter(asset => String(asset.type || '').startsWith('image/'))
                            .map(asset => ({
                                name: asset.name,
                                url: asset.url,
                                type: asset.type
                            }))
                    },
                    isPublished: true,
                    price: 0
                });
            }

            collaboration.publishRequest.story = story._id;
            collaboration.publishRequest.publishedAt = new Date();
            collaboration.status = 'completed';
        }

        await collaboration.save();

        const populated = await Collaboration.findById(collaboration._id)
            .populate('artist', 'username name profilePicture role')
            .populate('writer', 'username name profilePicture role')
            .populate('publishRequest.story', 'title isPublished');

        res.json(serializeCollaboration(populated, req.user._id));
    } catch (error) {
        res.status(500).json({ message: 'Error processing publish request', error: error.message });
    }
});

// Rate collaboration
router.post('/:id/rate', auth, async (req, res) => {
    try {
        const { rating } = req.body;
        const collaboration = await Collaboration.findById(req.params.id);

        if (!collaboration) {
            return res.status(404).json({ message: 'Collaboration not found' });
        }

        // Check if user is part of the collaboration
        if (!collaboration.artist.equals(req.user._id) && !collaboration.writer.equals(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to rate this collaboration' });
        }

        // Update rating based on user role
        if (req.user.role === 'artist') {
            collaboration.rating.writer = {
                ...(collaboration.rating.writer || {}),
                rating
            };
        } else {
            collaboration.rating.artist = {
                ...(collaboration.rating.artist || {}),
                rating
            };
        }

        await collaboration.save();

        // Update user ratings
        const partnerId = req.user.role === 'artist' ? collaboration.writer : collaboration.artist;
        const partner = await User.findById(partnerId);
        if (partner) {
            await partner.updateLastActive();
        }

        res.json(collaboration);
    } catch (error) {
        res.status(500).json({ message: 'Error rating collaboration', error: error.message });
    }
});

// Create a new collaboration room
router.post('/create', async (req, res) => {
    try {
        const room = new Room({
            name: req.body.name,
            createdBy: req.body.userId
        });
        await room.save();
        res.json({ roomId: room._id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Join a collaboration room
router.get('/join/:roomId', async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ error: 'Failed to join room' });
    }
});

// Get all rooms
router.get('/rooms', async (req, res) => {
    try {
        const rooms = await Room.find();
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

module.exports = router; 
