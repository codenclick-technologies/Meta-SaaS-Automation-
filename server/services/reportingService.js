const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Session = require('../models/Session');

class ReportingService {
    async generateSecurityReport(organizationId) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                // Header
                doc.fillColor('#444444').fontSize(20).text('Enterprise Security Audit Report', { align: 'center' });
                doc.moveDown();
                doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
                doc.text(`Organization ID: ${organizationId}`, { align: 'right' });
                doc.moveDown();
                doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                doc.moveDown();

                // Section: User Activity Summary
                const userCount = await User.countDocuments({ organizationId });
                const activeSessions = await Session.countDocuments({ organizationId, isValid: true });

                doc.fontSize(16).fillColor('#1a237e').text('Executive Summary');
                doc.moveDown(0.5);
                doc.fontSize(12).fillColor('#333333').text(`Total Licensed Users: ${userCount}`);
                doc.text(`Current Active Sessions: ${activeSessions}`);
                doc.moveDown();

                // Section: Recent Security Events
                doc.fontSize(16).fillColor('#1a237e').text('Recent Security Events (Audit Trail)');
                doc.moveDown(0.5);

                const recentLogs = await AuditLog.find({ organizationId })
                    .sort({ createdAt: -1 })
                    .limit(15)
                    .populate('userId', 'name');

                recentLogs.forEach((log, index) => {
                    doc.fontSize(10).fillColor('#444444').text(
                        `${index + 1}. [${new Date(log.createdAt).toLocaleDateString()}] ${log.userId?.name || 'System'}: ${log.action} - Status: ${log.status.toUpperCase()}`
                    );
                    doc.fontSize(8).fillColor('#777777').text(`   IP: ${log.ipAddress} | Resource: ${log.resource}`);
                    doc.moveDown(0.3);
                });

                if (recentLogs.length === 0) {
                    doc.fontSize(10).text('No recent security logs found.');
                }

                // Footer
                const pageCount = doc.bufferedPageRange().count;
                for (let i = 0; i < pageCount; i++) {
                    doc.switchToPage(i);
                    doc.fontSize(8).fillColor('#999999').text(
                        `Meta-SaaS Automation Security Framework | Page ${i + 1} of ${pageCount}`,
                        50,
                        doc.page.height - 50,
                        { align: 'center' }
                    );
                }

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new ReportingService();
