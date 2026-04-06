const router = require('express').Router();
const Contact = require('../models/Contact');

function getTransporter() {
    if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }

    try {
        const nodemailer = require('nodemailer');
        return nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } catch (error) {
        console.warn('Nodemailer is not installed. Contact emails will be skipped.');
        return null;
    }
}

// Submit contact form
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Create contact record
        const contact = new Contact({
            name,
            email,
            subject,
            message
        });

        await contact.save();

        // Send email notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to admin
            subject: `New Contact Form Submission: ${subject}`,
            html: `
                <h3>New Contact Form Submission</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        const transporter = getTransporter();
        if (transporter) {
            await transporter.sendMail(mailOptions);

            const autoReplyOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Thank you for contacting PixelScript',
                html: `
                    <h3>Thank you for reaching out!</h3>
                    <p>Dear ${name},</p>
                    <p>We have received your message and will get back to you as soon as possible.</p>
                    <p>Best regards,<br>The PixelScript Team</p>
                `
            };

            await transporter.sendMail(autoReplyOptions);
        }

        res.status(201).json({
            message: 'Your message has been sent successfully!'
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            message: 'Error sending message'
        });
    }
});

// Get all contact submissions (admin only)
router.get('/', async (req, res) => {
    try {
        const contacts = await Contact.find()
            .sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching contact submissions'
        });
    }
});

// Update contact status (admin only)
router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!contact) {
            return res.status(404).json({
                message: 'Contact submission not found'
            });
        }

        res.json(contact);
    } catch (error) {
        res.status(500).json({
            message: 'Error updating contact status'
        });
    }
});

module.exports = router; 
