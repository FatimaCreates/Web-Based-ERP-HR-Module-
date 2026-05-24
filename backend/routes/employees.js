const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Multer storage for profile pictures
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `emp_${req.params.empId}_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── GET ALL EMPLOYEES ─────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT e.EmpID, e.FirstName, e.LastName, e.Email, e.Phone,
                    e.JobTitle, e.JoinDate, e.Status, e.ProfilePic,
                    d.DeptName, ua.Role
             FROM employees e
             LEFT JOIN departments d ON e.DeptID = d.DeptID
             LEFT JOIN user_accounts ua ON e.EmpID = ua.EmpID
             ORDER BY e.FirstName`
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch employees' });
    }
});

// ── GET SINGLE EMPLOYEE ───────────────────────────────────────────────────────
router.get('/:empId', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT e.EmpID, e.FirstName, e.LastName, e.Email, e.Phone,
                    e.JobTitle, e.JoinDate, e.Status, e.ProfilePic,
                    d.DeptName, ua.Role, ua.Username
             FROM employees e
             LEFT JOIN departments d ON e.DeptID = d.DeptID
             LEFT JOIN user_accounts ua ON e.EmpID = ua.EmpID
             WHERE e.EmpID = ?`,
            [req.params.empId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch employee' });
    }
});

// ── UPDATE EMPLOYEE ───────────────────────────────────────────────────────────
router.put('/:empId', authenticateToken, async (req, res) => {
    const { firstName, lastName, phone, jobTitle, status } = req.body;
    try {
        await pool.query(
            `UPDATE employees SET FirstName=?, LastName=?, Phone=?, JobTitle=?, Status=? WHERE EmpID=?`,
            [firstName, lastName, phone, jobTitle, status || 'Active', req.params.empId]
        );
        res.json({ message: 'Employee updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update employee' });
    }
});

// ── UPLOAD PROFILE PICTURE ────────────────────────────────────────────────────
router.post('/:empId/upload-pic', authenticateToken, upload.single('profilePic'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const picUrl = `/uploads/${req.file.filename}`;
        await pool.query('UPDATE employees SET ProfilePic = ? WHERE EmpID = ?', [picUrl, req.params.empId]);
        res.json({ message: 'Profile picture updated', profilePic: picUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// ── GET EMPLOYEE SALARY ───────────────────────────────────────────────────────
router.get('/:empId/salary', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM salary_structure WHERE EmpID = ?', [req.params.empId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Salary structure not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch salary' });
    }
});

// ── SET / UPDATE SALARY STRUCTURE (HR/Admin only) ─────────────────────────────
router.post('/:empId/salary', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    const { baseSalary, allowances, taxRate, deductions } = req.body;
    try {
        const [existing] = await pool.query('SELECT SalaryID FROM salary_structure WHERE EmpID = ?', [req.params.empId]);
        if (existing.length > 0) {
            await pool.query(
                `UPDATE salary_structure SET BaseSalary=?, Allowances=?, TaxRate=?, Deductions=?, EffectiveDate=CURDATE()
                 WHERE EmpID=?`,
                [baseSalary, allowances || 0, taxRate || 0, deductions || 0, req.params.empId]
            );
        } else {
            await pool.query(
                `INSERT INTO salary_structure (EmpID, BaseSalary, Allowances, TaxRate, Deductions, EffectiveDate)
                 VALUES (?, ?, ?, ?, ?, CURDATE())`,
                [req.params.empId, baseSalary, allowances || 0, taxRate || 0, deductions || 0]
            );
        }
        res.json({ message: 'Salary structure saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to save salary structure' });
    }
});

// ── DELETE EMPLOYEE (Admin only) ──────────────────────────────────────────────
router.delete('/:empId', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM employees WHERE EmpID = ?', [req.params.empId]);
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete employee' });
    }
});

module.exports = router;
