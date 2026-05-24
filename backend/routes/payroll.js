const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const LATE_DEDUCTION_PER_SET = 500; // PKR deducted per 4 late check-ins

// ── RUN PAYROLL (HR/Admin) ────────────────────────────────────────────────────
router.post('/run', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ message: 'Month and year required' });

    try {
        // Get all active employees with salary structure
        const [employees] = await pool.query(
            `SELECT e.EmpID, e.FirstName, e.LastName,
                    ss.SalaryID, ss.BaseSalary, ss.Allowances, ss.TaxRate, ss.Deductions
             FROM employees e
             INNER JOIN salary_structure ss ON e.EmpID = ss.EmpID
             WHERE e.Status = 'Active'`
        );

        if (employees.length === 0) {
            return res.status(400).json({ message: 'No active employees with salary structure found' });
        }

        const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
        let processed = 0;

        for (const emp of employees) {
            // Count late check-ins for the month
            const [lateRows] = await pool.query(
                `SELECT COUNT(*) AS LateCount FROM attendance
                 WHERE EmpID = ? AND Status = 'Late'
                 AND MONTH(AttendDate) = ? AND YEAR(AttendDate) = ?`,
                [emp.EmpID, month, year]
            );
            const lateCount = lateRows[0].LateCount;
            const lateSets = Math.floor(lateCount / 4);
            const lateDeduction = lateSets * LATE_DEDUCTION_PER_SET;

            const grossPay = parseFloat(emp.BaseSalary) + parseFloat(emp.Allowances);
            const taxAmount = (grossPay * parseFloat(emp.TaxRate)) / 100;
            const otherDeductions = parseFloat(emp.Deductions);
            const netPay = grossPay - lateDeduction - taxAmount - otherDeductions;

            // Upsert payroll record
            const [existing] = await pool.query(
                'SELECT PayrollID FROM payroll WHERE EmpID = ? AND MonthYear = ?',
                [emp.EmpID, monthDate]
            );

            if (existing.length > 0) {
                await pool.query(
                    `UPDATE payroll SET BaseSalary=?, Allowances=?, LateDeduction=?,
                     TaxAmount=?, OtherDeductions=?, GrossPay=?, NetPay=?, Status='Processed'
                     WHERE EmpID=? AND MonthYear=?`,
                    [emp.BaseSalary, emp.Allowances, lateDeduction, taxAmount,
                     otherDeductions, grossPay, netPay, emp.EmpID, monthDate]
                );
            } else {
                await pool.query(
                    `INSERT INTO payroll (EmpID, SalaryID, MonthYear, BaseSalary, Allowances,
                     LateDeduction, TaxAmount, OtherDeductions, GrossPay, NetPay, Status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Processed')`,
                    [emp.EmpID, emp.SalaryID, monthDate, emp.BaseSalary, emp.Allowances,
                     lateDeduction, taxAmount, otherDeductions, grossPay, netPay]
                );
            }
            processed++;
        }

        res.json({ message: `Payroll processed for ${processed} employees`, month, year });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Payroll processing failed', error: error.message });
    }
});

// ── GET ALL PAYROLL RECORDS (HR/Admin) ────────────────────────────────────────
router.get('/all', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    const { month, year } = req.query;
    try {
        let query = `
            SELECT p.*, CONCAT(e.FirstName,' ',e.LastName) AS EmployeeName,
                   d.DeptName, e.JobTitle
            FROM payroll p
            INNER JOIN employees e ON p.EmpID = e.EmpID
            LEFT JOIN departments d ON e.DeptID = d.DeptID
            WHERE 1=1`;
        const params = [];
        if (month && year) {
            const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
            query += ' AND p.MonthYear = ?';
            params.push(monthDate);
        }
        query += ' ORDER BY e.FirstName';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch payroll' });
    }
});

// ── GET MY PAYROLL (Employee) ─────────────────────────────────────────────────
router.get('/my', authenticateToken, async (req, res) => {
    const empId = req.user.empId;
    try {
        const [rows] = await pool.query(
            `SELECT p.*, CONCAT(e.FirstName,' ',e.LastName) AS EmployeeName,
                    d.DeptName, e.JobTitle, e.Email
             FROM payroll p
             INNER JOIN employees e ON p.EmpID = e.EmpID
             LEFT JOIN departments d ON e.DeptID = d.DeptID
             WHERE p.EmpID = ?
             ORDER BY p.MonthYear DESC`,
            [empId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch payroll' });
    }
});

// ── GET PAYSLIP RECEIPT ───────────────────────────────────────────────────────
router.get('/receipt/:payrollId', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.*, CONCAT(e.FirstName,' ',e.LastName) AS EmployeeName,
                    e.Email, e.Phone, e.JobTitle, e.ProfilePic,
                    d.DeptName, ua.Username
             FROM payroll p
             INNER JOIN employees e ON p.EmpID = e.EmpID
             LEFT JOIN departments d ON e.DeptID = d.DeptID
             LEFT JOIN user_accounts ua ON e.EmpID = ua.EmpID
             WHERE p.PayrollID = ?`,
            [req.params.payrollId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Payslip not found' });

        const p = rows[0];
        const monthNames = ['January','February','March','April','May','June',
                            'July','August','September','October','November','December'];
        const d = new Date(p.MonthYear);

        res.json({
            payrollId: p.PayrollID,
            payPeriod: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
            generatedAt: new Date(p.ProcessedDate).toLocaleDateString(),
            employeeName: p.EmployeeName,
            email: p.Email,
            phone: p.Phone,
            jobTitle: p.JobTitle,
            department: p.DeptName,
            profilePic: p.ProfilePic,
            earnings: {
                baseSalary: parseFloat(p.BaseSalary),
                allowances: parseFloat(p.Allowances),
                grossPay: parseFloat(p.GrossPay)
            },
            deductions: {
                lateDeduction: parseFloat(p.LateDeduction),
                taxAmount: parseFloat(p.TaxAmount),
                otherDeductions: parseFloat(p.OtherDeductions),
                totalDeductions: parseFloat(p.LateDeduction) + parseFloat(p.TaxAmount) + parseFloat(p.OtherDeductions)
            },
            netPay: parseFloat(p.NetPay),
            status: p.Status
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch payslip' });
    }
});

// ── UPDATE PAYROLL STATUS (HR/Admin) ──────────────────────────────────────────
router.put('/:payrollId/status', authenticateToken, requireRole('HR_Manager', 'Admin'), async (req, res) => {
    const { status } = req.body;
    if (!['Draft', 'Processed', 'Paid'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }
    try {
        await pool.query('UPDATE payroll SET Status = ? WHERE PayrollID = ?', [status, req.params.payrollId]);
        res.json({ message: 'Payroll status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update status' });
    }
});

module.exports = router;
