const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Story = require('../models/Story');
const auth = require('../middleware/auth');

// Get user's purchases
router.get('/', auth, async (req, res) => {
    try {
        const purchases = await Purchase.find({ consumer: req.user.id })
            .populate('story', 'title coverImage author')
            .populate('chapter', 'title')
            .sort({ purchasedAt: -1 });

        res.json(purchases);
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Purchase a chapter or full story
router.post('/', auth, async (req, res) => {
    try {
        const { storyId, chapterId, purchaseType } = req.body;

        // Validate purchase type
        if (!['chapter', 'full_story'].includes(purchaseType)) {
            return res.status(400).json({ error: 'Invalid purchase type' });
        }

        const story = await Story.findById(storyId);
        if (!story || !story.isPublished) {
            return res.status(404).json({ error: 'Story not found or not published' });
        }

        const existingPurchase = await Purchase.findOne({
            consumer: req.user.id,
            story: storyId,
            $or: [
                { purchaseType: 'full_story' },
                ...(chapterId ? [{ chapter: chapterId }] : [])
            ]
        });

        if (existingPurchase) {
            return res.status(400).json({ error: 'Already purchased' });
        }

        // Calculate amount
        let amount = 0;
        if (purchaseType === 'chapter') {
            const chapter = story.chapters.id(chapterId);
            if (!chapter) {
                return res.status(404).json({ error: 'Chapter not found' });
            }
            if ((chapter.order || 0) <= 2 || chapter.isFree) {
                return res.status(400).json({ error: 'Chapter is free' });
            }
            amount = story.price; // Assuming price is per chapter
        } else {
            // Full story - calculate based on paid chapters
            const paidChapters = story.chapters.filter(ch => !ch.isFree);
            amount = paidChapters.length * story.price;
        }

        // Here you would integrate with payment processor (Stripe, PayPal, etc.)
        // For now, we'll simulate a successful payment
        const paymentId = `simulated_${Date.now()}`;

        const purchase = new Purchase({
            consumer: req.user.id,
            story: storyId,
            ...(chapterId && { chapter: chapterId }),
            purchaseType,
            amount,
            paymentId
        });

        await purchase.save();

        res.status(201).json({
            message: 'Purchase successful',
            purchase
        });
    } catch (error) {
        console.error('Error processing purchase:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Check if user has access to a chapter
router.get('/access/:storyId/:chapterId?', auth, async (req, res) => {
    try {
        const { storyId, chapterId } = req.params;

        const story = await Story.findById(storyId);
        if (!story) {
            return res.status(404).json({ error: 'Story not found' });
        }

        const isAuthor = story.author.toString() === req.user.id;

        if (isAuthor) {
            return res.json({ hasAccess: true, reason: 'author' });
        }

        if (chapterId) {
            const chapter = story.chapters.id(chapterId);
            if (!chapter) {
                return res.status(404).json({ error: 'Chapter not found' });
            }

            if ((chapter.order || 0) <= 2 || chapter.isFree) {
                return res.json({ hasAccess: true, reason: 'free' });
            }

            const purchase = await Purchase.findOne({
                consumer: req.user.id,
                story: storyId,
                $or: [
                    { chapter: chapterId },
                    { purchaseType: 'full_story' }
                ]
            });

            return res.json({
                hasAccess: !!purchase,
                reason: purchase ? (purchase.purchaseType === 'full_story' ? 'full_story_purchased' : 'purchased') : 'not_purchased'
            });
        } else {
            // Check for full story access
            const purchases = await Purchase.find({
                consumer: req.user.id,
                story: storyId
            });

            const hasFullAccess = purchases.some(p => p.purchaseType === 'full_story');
            return res.json({
                hasAccess: hasFullAccess,
                reason: hasFullAccess ? 'full_story_purchased' : 'not_purchased'
            });
        }
    } catch (error) {
        console.error('Error checking access:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
