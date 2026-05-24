const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── SIGN UP ──────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
    const { username, email, password, firstName, lastName, phone, jobTitle, role } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Check duplicate email or username
        const [existing] = await pool.query(
            'SELECT EmpID FROM employees WHERE Email = ?', [email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }
        const [existingUser] = await pool.query(
            'SELECT UserID FROM user_accounts WHERE Username = ?', [username]
        );
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Username already taken' });
        }

        // Get HR department (only dept in scope)
        const [depts] = await pool.query('SELECT DeptID FROM departments LIMIT 1');
        const deptId = depts.length > 0 ? depts[0].DeptID : null;
        if (!deptId) {
            return res.status(500).json({ message: 'No department found. Run database.sql first.' });
        }

        // Insert employee
        const [empResult] = await pool.query(
            `INSERT INTO employees (FirstName, LastName, Email, Phone, DeptID, JobTitle, JoinDate, Status)
             VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'Active')`,
            [firstName, lastName, email, phone || null, deptId, jobTitle || 'Employee']
        );
        const empId = empResult.insertId;

        // Hash password
        const hashed = await bcrypt.hash(password, 10);

        // Assign role — default Employee, allow HR_Manager/Admin if specified
        const assignedRole = ['Admin', 'HR_Manager', 'Employee'].includes(role) ? role : 'Employee';

        // Insert user account
        const [userResult] = await pool.query(
            `INSERT INTO user_accounts (EmpID, Username, Password, Role) VALUES (?, ?, ?, ?)`,
            [empId, username, hashed, assignedRole]
        );

        // Create default salary structure
        await pool.query(
            `INSERT INTO salary_structure (EmpID, BaseSalary, Allowances, TaxRate, Deductions, EffectiveDate)
             VALUES (?, 0.00, 0.00, 0.00, 0.00, CURDATE())`,
            [empId]
        );

        const token = jwt.sign(
            { userId: userResult.insertId, empId, username, email, role: assignedRole },
            process.env.JWT_SECRET || 'supersecretkey123',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: { userId: userResult.insertId, empId, username, email, role: assignedRole, firstName, lastName }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT ua.UserID, ua.EmpID, ua.Username, ua.Password, ua.Role,
                    e.FirstName, e.LastName, e.Email, e.ProfilePic
             FROM user_accounts ua
             INNER JOIN employees e ON ua.EmpID = e.EmpID
             WHERE e.Email = ?`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.Password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Update last login
        await pool.query('UPDATE user_accounts SET LastLogin = NOW() WHERE UserID = ?', [user.UserID]);

        const token = jwt.sign(
            { userId: user.UserID, empId: user.EmpID, username: user.Username, email: user.Email, role: user.Role },
            process.env.JWT_SECRET || 'supersecretkey123',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.UserID,
                empId: user.EmpID,
                username: user.Username,
                email: user.Email,
                role: user.Role,
                firstName: user.FirstName,
                lastName: user.LastName,
                profilePic: user.ProfilePic
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// ── GET CURRENT USER ──────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT ua.UserID, ua.EmpID, ua.Username, ua.Role,
                    e.FirstName, e.LastName, e.Email, e.Phone,
                    e.JobTitle, e.JoinDate, e.Status, e.ProfilePic,
                    d.DeptName
             FROM user_accounts ua
             INNER JOIN employees e ON ua.EmpID = e.EmpID
             LEFT JOIN departments d ON e.DeptID = d.DeptID
             WHERE ua.UserID = ?`,
            [req.user.userId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        const u = rows[0];
        res.json({
            userId: u.UserID, empId: u.EmpID, username: u.Username,
            role: u.Role, firstName: u.FirstName, lastName: u.LastName,
            email: u.Email, phone: u.Phone, jobTitle: u.JobTitle,
            joinDate: u.JoinDate, status: u.Status, profilePic: u.ProfilePic,
            department: u.DeptName
        });
    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
