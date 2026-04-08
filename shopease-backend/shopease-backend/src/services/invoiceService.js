/**
 * src/services/invoiceService.js
 * PDF Invoice generation using PDFKit
 */

const PDFDocument = require('pdfkit');

/**
 * Generate a PDF invoice for an order
 * @param {Object} order - The order document
 * @param {Object} user - The user document (optional for guest orders)
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generateInvoice = (order, user = null) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Invoice #${order._id.toString().slice(-8).toUpperCase()}`,
          Author: 'ShopEase',
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const primaryColor = '#6366f1';
      const grayColor = '#6b7280';
      const darkColor = '#1f2937';

      // ── Header ───────────────────────────────────────────────
      doc
        .fillColor(primaryColor)
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('ShopEase', 50, 50);

      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica')
        .text('Your One-Stop Shop', 50, 80);

      // Invoice title on right
      doc
        .fillColor(darkColor)
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('INVOICE', 400, 50, { align: 'right' });

      const invoiceNumber = order._id.toString().slice(-8).toUpperCase();
      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica')
        .text(`#INV-${invoiceNumber}`, 400, 80, { align: 'right' });

      // ── Line separator ───────────────────────────────────────
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(50, 110)
        .lineTo(545, 110)
        .stroke();

      // ── Bill To & Invoice Details ────────────────────────────
      let y = 130;

      // Bill To (left side)
      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('BILL TO', 50, y);

      y += 15;
      const customerName = user?.name || order.guestName || 'Guest Customer';
      const customerEmail = user?.email || order.guestEmail || '';
      
      doc
        .fillColor(darkColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(customerName, 50, y);
      
      y += 15;
      if (customerEmail) {
        doc
          .fillColor(grayColor)
          .fontSize(10)
          .font('Helvetica')
          .text(customerEmail, 50, y);
        y += 12;
      }

      // Shipping address
      const addr = order.shippingAddress;
      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica')
        .text(addr.street, 50, y);
      y += 12;
      doc.text(`${addr.city}, ${addr.state} ${addr.zip}`, 50, y);
      y += 12;
      if (addr.country) {
        doc.text(addr.country, 50, y);
      }

      // Invoice details (right side)
      let rightY = 130;
      
      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('INVOICE DETAILS', 350, rightY, { align: 'right' });

      rightY += 18;
      doc
        .fillColor(grayColor)
        .fontSize(10)
        .font('Helvetica')
        .text('Date:', 350, rightY)
        .fillColor(darkColor)
        .text(new Date(order.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric', month: 'long', day: 'numeric'
        }), 450, rightY, { align: 'right' });

      rightY += 15;
      doc
        .fillColor(grayColor)
        .text('Status:', 350, rightY)
        .fillColor(order.paymentStatus === 'paid' ? '#10b981' : '#f59e0b')
        .font('Helvetica-Bold')
        .text(order.paymentStatus.toUpperCase(), 450, rightY, { align: 'right' });

      rightY += 15;
      doc
        .fillColor(grayColor)
        .font('Helvetica')
        .text('Payment:', 350, rightY)
        .fillColor(darkColor)
        .text(order.paymentMethod.toUpperCase(), 450, rightY, { align: 'right' });

      // ── Items Table ──────────────────────────────────────────
      let tableY = 230;

      // Table header background
      doc
        .fillColor('#f3f4f6')
        .rect(50, tableY, 495, 25)
        .fill();

      // Table headers
      doc
        .fillColor(darkColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('ITEM', 60, tableY + 8)
        .text('QTY', 350, tableY + 8, { width: 50, align: 'center' })
        .text('PRICE', 410, tableY + 8, { width: 60, align: 'right' })
        .text('TOTAL', 480, tableY + 8, { width: 60, align: 'right' });

      tableY += 30;

      // Table rows
      doc.font('Helvetica').fontSize(10);
      
      order.items.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        
        // Alternate row background
        if (index % 2 === 1) {
          doc.fillColor('#fafafa').rect(50, tableY - 5, 495, 25).fill();
        }

        doc
          .fillColor(darkColor)
          .text(item.title.substring(0, 40) + (item.title.length > 40 ? '...' : ''), 60, tableY, { width: 280 })
          .text(item.qty.toString(), 350, tableY, { width: 50, align: 'center' })
          .text(`₹${item.price.toLocaleString('en-IN')}`, 410, tableY, { width: 60, align: 'right' })
          .text(`₹${itemTotal.toLocaleString('en-IN')}`, 480, tableY, { width: 60, align: 'right' });

        tableY += 25;
      });

      // ── Totals Section ───────────────────────────────────────
      tableY += 10;
      
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(350, tableY)
        .lineTo(545, tableY)
        .stroke();

      tableY += 15;

      // Subtotal
      doc
        .fillColor(grayColor)
        .fontSize(10)
        .text('Subtotal:', 350, tableY)
        .fillColor(darkColor)
        .text(`₹${order.subtotal.toLocaleString('en-IN')}`, 480, tableY, { width: 60, align: 'right' });

      tableY += 18;

      // Discount (if any)
      if (order.discount > 0) {
        doc
          .fillColor(grayColor)
          .text('Discount:', 350, tableY)
          .fillColor('#10b981')
          .text(`-₹${order.discount.toLocaleString('en-IN')}`, 480, tableY, { width: 60, align: 'right' });
        tableY += 18;
      }

      // Shipping
      doc
        .fillColor(grayColor)
        .text('Shipping:', 350, tableY)
        .fillColor(darkColor)
        .text(order.shipping > 0 ? `₹${order.shipping.toLocaleString('en-IN')}` : 'FREE', 480, tableY, { width: 60, align: 'right' });

      tableY += 20;

      // Total line
      doc
        .strokeColor(primaryColor)
        .lineWidth(2)
        .moveTo(350, tableY)
        .lineTo(545, tableY)
        .stroke();

      tableY += 12;

      // Grand Total
      doc
        .fillColor(darkColor)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('TOTAL:', 350, tableY)
        .fillColor(primaryColor)
        .text(`₹${order.total.toLocaleString('en-IN')}`, 450, tableY, { width: 90, align: 'right' });

      // ── Footer ───────────────────────────────────────────────
      const footerY = 750;

      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(50, footerY)
        .lineTo(545, footerY)
        .stroke();

      doc
        .fillColor(grayColor)
        .fontSize(9)
        .font('Helvetica')
        .text('Thank you for shopping with ShopEase!', 50, footerY + 15, { align: 'center', width: 495 })
        .text('For questions, contact support@shopease.com', 50, footerY + 28, { align: 'center', width: 495 });

      // Order ID at bottom
      doc
        .fillColor('#9ca3af')
        .fontSize(8)
        .text(`Order ID: ${order._id}`, 50, footerY + 50, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoice };
