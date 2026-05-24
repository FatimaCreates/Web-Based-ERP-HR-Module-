const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET LEAVE TYPES ───────────────────────────────────────────────────────────
router.get('/types', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM leave_types');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch leave types' });
    }
});

// ── GET MY LEAVE BALANCE ──────────────────────────────────────────────────────
router.get('/balance', authenticateToken, async (req, res) => {
    const empId = req.user.empId;
    try {
        const [rows] = await pool.query(
            `SELECT * FROM employee_leave_balances WHERE EmpID = ?`, [empId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch leave balance' });
    }
});

// ── GET LEAVE BALANCE FOR SPECIFIC EMPLOYEE (HR) ──────────────────────────────
router.get('/balance/:empId', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM employee_leave_balances WHERE EmpID = ?`, [req.params.empId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch leave balance' });
    }
});

// ── SUBMIT LEAVE REQUEST ──────────────────────────────────────────────────────
router.post('/request', authenticateToken, async (req, res) => {
    const empId = req.user.empId;
    const { typeId, startDate, endDate, reason } = req.body;

    if (!typeId || !startDate || !endDate) {
        return res.status(400).json({ message: 'typeId, startDate and endDate are required' });
    }

    try {
        await pool.query(
            `INSERT INTO leave_requests (EmpID, TypeID, StartDate, EndDate, Reason, Status)
             VALUES (?, ?, ?, ?, ?, 'Pending')`,
            [empId, typeId, startDate, endDate, reason || null]
        );
        res.status(201).json({ message: 'Leave request submitted successfully' });
    } catch (error) {
        console.error(error);
        // Trigger fires if balance insufficient
        if (error.sqlState === '45000') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to submit leave request', error: error.message });
    }
});

// ── GET MY LEAVE REQUESTS ─────────────────────────────────────────────────────
router.get('/my', authenticateToken, async (req, res) => {
    const empId = req.user.empId;
    try {
        const [rows] = await pool.query(
            `SELECT lr.*, lt.TypeName,
                    DATEDIFF(lr.EndDate, lr.StartDate) + 1 AS TotalDays,
                    CONCAT(e.FirstName,' ',e.LastName) AS ApprovedByName
             FROM leave_requests lr
             INNER JOIN leave_types lt ON lr.TypeID = lt.TypeID
             LEFT JOIN employees e ON lr.ApprovedBy = e.EmpID
             WHERE lr.EmpID = ?
             ORDER BY lr.RequestedDate DESC`,
            [empId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch leave requests' });
    }
});

// ── GET ALL LEAVE REQUESTS (HR/Admin) ─────────────────────────────────────────
router.get('/all', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    const { status } = req.query;
    try {
        let query = `
            SELECT lr.*, lt.TypeName,
                   CONCAT(e.FirstName,' ',e.LastName) AS EmployeeName,
                   e.Email, d.DeptName,
                   DATEDIFF(lr.EndDate, lr.StartDate) + 1 AS TotalDays
            FROM leave_requests lr
            INNER JOIN employees e ON lr.EmpID = e.EmpID
            INNER JOIN leave_types lt ON lr.TypeID = lt.TypeID
            LEFT JOIN departments d ON e.DeptID = d.DeptID
            WHERE 1=1`;
        const params = [];
        if (status) { query += ' AND lr.Status = ?'; params.push(status); }
        query += ' ORDER BY lr.RequestedDate DESC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch leave requests' });
    }
});

// ── APPROVE / REJECT LEAVE (HR/Admin) ────────────────────────────────────────
router.put('/:leaveId/status', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    const { status } = req.body;
    const approverId = req.user.empId;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status must be Approved or Rejected' });
    }

    try {
        const [result] = await pool.query(
            `UPDATE leave_requests SET Status = ?, ApprovedBy = ? WHERE LeaveID = ? AND Status = 'Pending'`,
            [status, approverId, req.params.leaveId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found or already processed' });
        }
        res.json({ message: `Leave request ${status.toLowerCase()} successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update leave status' });
    }
});

module.exports = router;
