const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── HR DASHBOARD STATS ────────────────────────────────────────────────────────
router.get('/stats', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();

        const [[{ totalEmployees }]] = await pool.query(
            `SELECT COUNT(*) AS totalEmployees FROM employees WHERE Status = 'Active'`
        );
        const [[{ presentToday }]] = await pool.query(
            `SELECT COUNT(*) AS presentToday FROM attendance
             WHERE AttendDate = ? AND Status IN ('Present','Late')`, [today]
        );
        const [[{ lateToday }]] = await pool.query(
            `SELECT COUNT(*) AS lateToday FROM attendance
             WHERE AttendDate = ? AND Status = 'Late'`, [today]
        );
        const [[{ pendingLeaves }]] = await pool.query(
            `SELECT COUNT(*) AS pendingLeaves FROM leave_requests WHERE Status = 'Pending'`
        );
        const [[{ onLeaveToday }]] = await pool.query(
            `SELECT COUNT(*) AS onLeaveToday FROM leave_requests
             WHERE Status = 'Approved' AND StartDate <= ? AND EndDate >= ?`, [today, today]
        );
        const [[{ newThisMonth }]] = await pool.query(
            `SELECT COUNT(*) AS newThisMonth FROM employees
             WHERE MONTH(JoinDate) = ? AND YEAR(JoinDate) = ?`, [month, year]
        );
        const [[{ totalPayroll }]] = await pool.query(
            `SELECT COALESCE(SUM(NetPay),0) AS totalPayroll FROM payroll
             WHERE MONTH(MonthYear) = ? AND YEAR(MonthYear) = ?`, [month, year]
        );

        const attendanceRate = totalEmployees > 0
            ? Math.round((presentToday / totalEmployees) * 100)
            : 0;

        res.json({
            totalEmployees,
            presentToday,
            lateToday,
            pendingLeaves,
            onLeaveToday,
            newThisMonth,
            totalPayroll: parseFloat(totalPayroll),
            attendanceRate
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
});

// ── ATTENDANCE CHART DATA (last 7 days) ───────────────────────────────────────
router.get('/attendance-chart', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT AttendDate,
                    SUM(Status IN ('Present','Late')) AS Present,
                    SUM(Status = 'Late') AS Late,
                    SUM(Status = 'Absent') AS Absent
             FROM attendance
             WHERE AttendDate >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             GROUP BY AttendDate
             ORDER BY AttendDate`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch chart data' });
    }
});

// ── EMPLOYEE DASHBOARD STATS ──────────────────────────────────────────────────
router.get('/my-stats', authenticateToken, async (req, res) => {
    const empId = req.user.empId;
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    try {
        const [[todayRecord]] = await pool.query(
            `SELECT * FROM attendance WHERE EmpID = ? AND AttendDate = ?`, [empId, today]
        );
        const [[{ presentDays }]] = await pool.query(
            `SELECT COUNT(*) AS presentDays FROM attendance
             WHERE EmpID = ? AND Status IN ('Present','Late')
             AND MONTH(AttendDate) = ? AND YEAR(AttendDate) = ?`, [empId, month, year]
        );
        const [[{ lateDays }]] = await pool.query(
            `SELECT COUNT(*) AS lateDays FROM attendance
             WHERE EmpID = ? AND Status = 'Late'
             AND MONTH(AttendDate) = ? AND YEAR(AttendDate) = ?`, [empId, month, year]
        );
        const [[{ pendingLeaves }]] = await pool.query(
            `SELECT COUNT(*) AS pendingLeaves FROM leave_requests
             WHERE EmpID = ? AND Status = 'Pending'`, [empId]
        );
        const [leaveBalance] = await pool.query(
            `SELECT * FROM employee_leave_balances WHERE EmpID = ?`, [empId]
        );
        const [latestPayroll] = await pool.query(
            `SELECT NetPay, MonthYear FROM payroll WHERE EmpID = ?
             ORDER BY MonthYear DESC LIMIT 1`, [empId]
        );

        res.json({
            todayRecord: todayRecord || null,
            presentDays,
            lateDays,
            pendingLeaves,
            leaveBalance,
            latestPayroll: latestPayroll[0] || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch employee stats' });
    }
});

module.exports = router;
