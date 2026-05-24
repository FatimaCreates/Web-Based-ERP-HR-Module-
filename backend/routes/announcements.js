const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET ALL ACTIVE ANNOUNCEMENTS ──────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT a.AnnounceID, a.Title, a.Content, a.PostedDate, a.ExpiryDate, a.IsActive,
                    CONCAT(e.FirstName,' ',e.LastName) AS PostedBy, e.JobTitle AS PostedByTitle
             FROM announcements a
             INNER JOIN employees e ON a.EmpID = e.EmpID
             WHERE a.IsActive = TRUE
               AND (a.ExpiryDate IS NULL OR a.ExpiryDate >= CURDATE())
             ORDER BY a.PostedDate DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch announcements' });
    }
});

// ── CREATE ANNOUNCEMENT (HR/Admin) ────────────────────────────────────────────
router.post('/', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    const { title, content, expiryDate } = req.body;
    const empId = req.user.empId;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO announcements (EmpID, Title, Content, ExpiryDate, IsActive)
             VALUES (?, ?, ?, ?, TRUE)`,
            [empId, title, content, expiryDate || null]
        );
        res.status(201).json({ message: 'Announcement posted', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to post announcement' });
    }
});

// ── DEACTIVATE ANNOUNCEMENT (HR/Admin) ────────────────────────────────────────
router.put('/:id/deactivate', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    try {
        await pool.query('UPDATE announcements SET IsActive = FALSE WHERE AnnounceID = ?', [req.params.id]);
        res.json({ message: 'Announcement deactivated' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to deactivate' });
    }
});

// ── DELETE ANNOUNCEMENT (Admin only) ─────────────────────────────────────────
router.delete('/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM announcements WHERE AnnounceID = ?', [req.params.id]);
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete' });
    }
});

module.exports = router;
