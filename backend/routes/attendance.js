const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const LATE_THRESHOLD = '09:30:00';
const EARLY_CHECKOUT_THRESHOLD = '17:00:00';

// ── CHECK IN ──────────────────────────────────────────────────────────────────
router.post('/checkin', authenticateToken, async (req, res) => {
    const empId = req.user.empId;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    try {
        // Prevent duplicate check-in
        const [existing] = await pool.query(
            'SELECT AttendID, CheckInTime FROM attendance WHERE EmpID = ? AND AttendDate = ?',
            [empId, today]
        );
        if (existing.length > 0 && existing[0].CheckInTime) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        // Determine late status
        const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
        const isLate = timeStr > LATE_THRESHOLD;
        const status = isLate ? 'Late' : 'Present';

        if (existing.length > 0) {
            await pool.query(
                'UPDATE attendance SET CheckInTime = NOW(), Status = ? WHERE EmpID = ? AND AttendDate = ?',
                [status, empId, today]
            );
        } else {
            await pool.query(
                'INSERT INTO attendance (EmpID, AttendDate, CheckInTime, Status) VALUES (?, ?, NOW(), ?)',
                [empId, today, status]
            );
        }

        res.json({
            message: isLate ? 'Checked in (Late)' : 'Checked in successfully',
            checkInTime: now.toISOString(),
            isLate,
            status
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Check-in failed', error: error.message });
    }
});

// ── CHECK OUT ─────────────────────────────────────────────────────────────────
router.post('/checkout', authenticateToken, async (req, res) => {
    const empId = req.user.empId;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    try {
        const [existing] = await pool.query(
            'SELECT AttendID, CheckInTime, CheckOutTime FROM attendance WHERE EmpID = ? AND AttendDate = ?',
            [empId, today]
        );

        if (existing.length === 0 || !existing[0].CheckInTime) {
            return res.status(400).json({ message: 'You have not checked in today' });
        }
        if (existing[0].CheckOutTime) {
            return res.status(400).json({ message: 'Already checked out today' });
        }

        const timeStr = now.toTimeString().split(' ')[0];
        const isEarlyCheckout = timeStr < EARLY_CHECKOUT_THRESHOLD;

        await pool.query(
            'UPDATE attendance SET CheckOutTime = NOW() WHERE EmpID = ? AND AttendDate = ?',
            [empId, today]
        );

        res.json({
            message: isEarlyCheckout ? 'Checked out early' : 'Checked out successfully',
            checkOutTime: now.toISOString(),
            isEarlyCheckout
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Check-out failed', error: error.message });
    }
});

// ── GET MY ATTENDANCE ─────────────────────────────────────────────────────────
router.get('/my', authenticateToken, async (req, res) => {
    const empId = req.user.empId;
    const { month, year } = req.query;
    try {
        let query = `SELECT * FROM attendance WHERE EmpID = ?`;
        const params = [empId];
        if (month && year) {
            query += ` AND MONTH(AttendDate) = ? AND YEAR(AttendDate) = ?`;
            params.push(month, year);
        }
        query += ` ORDER BY AttendDate DESC`;
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch attendance' });
    }
});

// ── GET TODAY STATUS ──────────────────────────────────────────────────────────
router.get('/today', authenticateToken, async (req, res) => {
    const empId = req.user.empId;
    const today = new Date().toISOString().split('T')[0];
    try {
        const [rows] = await pool.query(
            'SELECT * FROM attendance WHERE EmpID = ? AND AttendDate = ?',
            [empId, today]
        );
        res.json(rows.length > 0 ? rows[0] : null);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch today status' });
    }
});

// ── GET ALL ATTENDANCE (HR/Admin) ─────────────────────────────────────────────
router.get('/all', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    const { month, year, empId } = req.query;
    try {
        let query = `
            SELECT a.*, CONCAT(e.FirstName,' ',e.LastName) AS EmployeeName,
                   d.DeptName,
                   CASE WHEN TIME(a.CheckInTime) > ? THEN 1 ELSE 0 END AS IsLate,
                   CASE WHEN a.CheckOutTime IS NOT NULL AND TIME(a.CheckOutTime) < ? THEN 1 ELSE 0 END AS IsEarlyCheckout
            FROM attendance a
            INNER JOIN employees e ON a.EmpID = e.EmpID
            LEFT JOIN departments d ON e.DeptID = d.DeptID
            WHERE 1=1`;
        const params = [LATE_THRESHOLD, EARLY_CHECKOUT_THRESHOLD];

        if (empId) { query += ' AND a.EmpID = ?'; params.push(empId); }
        if (month && year) {
            query += ' AND MONTH(a.AttendDate) = ? AND YEAR(a.AttendDate) = ?';
            params.push(month, year);
        }
        query += ' ORDER BY a.AttendDate DESC, e.FirstName';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch attendance records' });
    }
});

// ── MONTHLY SUMMARY VIEW (HR) ─────────────────────────────────────────────────
router.get('/summary', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    const { month, year } = req.query;
    try {
        const [rows] = await pool.query(
            `SELECT * FROM monthly_attendance_summary
             WHERE Month = ? AND Year = ?`,
            [month || new Date().getMonth() + 1, year || new Date().getFullYear()]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch summary' });
    }
});

module.exports = router;
