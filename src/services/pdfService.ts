import RNHTMLtoPDF from 'react-native-html-to-pdf';
import type {JobCard} from './jobCardService';

export class PDFService {
  /**
   * Format date for display
   */
  private static formatDate(date: Date | any): string {
    try {
      if (!date) return 'Not set';
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  /**
   * Format time for display
   */
  private static formatTime(date: Date | any): string {
    try {
      if (!date) return 'Not set';
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid time';
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid time';
    }
  }

  /**
   * Format date and time together
   */
  private static formatDateTime(date: Date | any): string {
    try {
      if (!date) return 'Not set';
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return dateObj.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  /**
   * Generate professional job done card PDF
   */
  private static generateJobCardHTML(
    jobCard: JobCard,
    amount?: number,
    materials?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      total?: number;
    }>,
    timeStarted?: Date | string,
    timeCompleted?: Date | string,
  ): string {
    const jobDate = this.formatDate(jobCard.createdAt);
    const startTime = timeStarted ? this.formatTime(timeStarted) : 'Not set';
    const endTime = timeCompleted ? this.formatTime(timeCompleted) : 'Not set';
    const jobCardNumber = jobCard.id || jobCard._id || 'N/A';
    const location = jobCard.customerAddress
      ? `${jobCard.customerAddress.address}${jobCard.customerAddress.city ? ', ' + jobCard.customerAddress.city : ''}${jobCard.customerAddress.state ? ', ' + jobCard.customerAddress.state : ''} - ${jobCard.customerAddress.pincode}`
      : 'Not provided';

    // Calculate materials total if provided
    let materialsTotal = 0;
    if (materials && materials.length > 0) {
      materialsTotal = materials.reduce((sum, item) => {
        return sum + (item.total || (item.quantity || 0) * (item.unitPrice || 0));
      }, 0);
    }

    // Total cost = amount (service fee) + materials total
    const totalCost = (amount || 0) + materialsTotal;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: #F2F2F2;
            padding: 20px;
            color: #1a1a1a;
          }

          .card-container {
            max-width: 800px;
            margin: 0 auto;
            background: #FFFFFF;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            position: relative;
          }

          .brand-name {
            font-size: 32px;
            font-weight: 700;
            color: #1a1a1a;
            letter-spacing: -0.5px;
          }

          .logo-container {
            position: relative;
            width: 80px;
            height: 80px;
          }

          .logo-bg {
            position: absolute;
            top: -10px;
            right: -10px;
            width: 60px;
            height: 60px;
            background: #FF6B35;
            clip-path: polygon(0 0, 100% 0, 100% 100%);
            opacity: 0.3;
          }

          .logo-icon {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 50px;
            height: 50px;
            background: #1a1a1a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FF6B35;
            font-size: 24px;
            font-weight: bold;
          }

          .title {
            text-align: center;
            font-size: 28px;
            font-weight: 700;
            color: #FF6B35;
            margin: 20px 0 40px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .job-details {
            margin-bottom: 30px;
          }

          .job-details table {
            width: 100%;
            border-collapse: collapse;
            background: #FFFFFF;
            border: 1px solid #E0E0E0;
          }

          .job-details td {
            padding: 12px 15px;
            border: 1px solid #E0E0E0;
            font-size: 14px;
          }

          .job-details td:first-child {
            font-weight: 600;
            color: #666;
            width: 40%;
            background: #F9F9F9;
          }

          .job-details td:last-child {
            color: #1a1a1a;
          }

          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1a1a1a;
            margin: 30px 0 15px 0;
          }

          .provider-details table {
            width: 100%;
            border-collapse: collapse;
            background: #FFFFFF;
            border: 1px solid #E0E0E0;
          }

          .provider-details td {
            padding: 12px 15px;
            border: 1px solid #E0E0E0;
            font-size: 14px;
          }

          .provider-details td:first-child {
            font-weight: 600;
            color: #666;
            width: 40%;
            background: #F9F9F9;
          }

          .provider-details td:last-child {
            color: #1a1a1a;
          }

          .materials-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background: #FFFFFF;
            border: 1px solid #E0E0E0;
          }

          .materials-table thead {
            background: #FF6B35;
            color: #FFFFFF;
          }

          .materials-table th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            border: 1px solid #FF6B35;
          }

          .materials-table td {
            padding: 12px 15px;
            border: 1px solid #E0E0E0;
            font-size: 14px;
            color: #1a1a1a;
          }

          .materials-table tbody tr {
            background: #FFFFFF;
          }

          .materials-table tbody tr:nth-child(even) {
            background: #F9F9F9;
          }

          .total-row {
            background: #FF6B35 !important;
            color: #FFFFFF !important;
            font-weight: 700;
          }

          .total-row td {
            color: #FFFFFF !important;
            border-color: #FF6B35 !important;
            font-size: 16px;
          }

          .total-row td:first-child {
            text-align: right;
            padding-right: 20px;
          }

          .total-row td:last-child {
            font-size: 20px;
            text-align: right;
          }

          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #E0E0E0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }

          @media print {
            body {
              padding: 0;
              background: #FFFFFF;
            }
            .card-container {
              box-shadow: none;
              padding: 30px;
            }
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          <div class="header">
            <div class="brand-name">HomeServices</div>
            <div class="logo-container">
              <div class="logo-bg"></div>
              <div class="logo-icon">⚡</div>
            </div>
          </div>

          <div class="title">${jobCard.serviceType.toUpperCase()} JOB CARD</div>

          <!-- Job Details -->
          <div class="job-details">
            <table>
              <tr>
                <td>Date:</td>
                <td>${jobDate}</td>
              </tr>
              <tr>
                <td>Job Card Number:</td>
                <td>${jobCardNumber}</td>
              </tr>
              <tr>
                <td>Location of Work:</td>
                <td>${location}</td>
              </tr>
              <tr>
                <td>Time Started:</td>
                <td>${startTime}</td>
              </tr>
              <tr>
                <td>Time Completed:</td>
                <td>${endTime}</td>
              </tr>
            </table>
          </div>

          <!-- Service Provider Details -->
          <div class="provider-details">
            <div class="section-title">Service Provider Details</div>
            <table>
              <tr>
                <td>Name:</td>
                <td>${jobCard.providerName || 'Not provided'}</td>
              </tr>
              <tr>
                <td>Job Title:</td>
                <td>${jobCard.serviceType || 'Service Provider'}</td>
              </tr>
              <tr>
                <td>Provider ID:</td>
                <td>${jobCard.providerId || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <!-- Materials Used -->
          ${materials && materials.length > 0 ? `
          <div class="materials-section">
            <div class="section-title">Materials Used</div>
            <table class="materials-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${materials.map(material => `
                  <tr>
                    <td>${material.description || 'N/A'}</td>
                    <td>${material.quantity || '-'}</td>
                    <td>${material.unitPrice ? '₹' + material.unitPrice.toFixed(2) : '-'}</td>
                    <td>₹${(material.total || (material.quantity || 0) * (material.unitPrice || 0)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <!-- Total Cost -->
          <div class="materials-section" style="margin-top: 20px;">
            <table class="materials-table">
              <tbody>
                <tr class="total-row">
                  <td colspan="3">Total Cost of Job:</td>
                  <td>₹${totalCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${amount ? `
          <div style="margin-top: 15px; padding: 10px; background: #F9F9F9; border-radius: 4px; font-size: 12px; color: #666;">
            <strong>Service Fee:</strong> ₹${amount.toFixed(2)}
            ${materialsTotal > 0 ? ` | <strong>Materials:</strong> ₹${materialsTotal.toFixed(2)}` : ''}
          </div>
          ` : ''}

          <div class="footer">
            <p>Generated on ${new Date().toLocaleString('en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
            <p style="margin-top: 5px;">HomeServices - Professional Service Management</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate professional job done card PDF
   * @param jobCard - The job card data
   * @param amount - Optional service fee amount
   * @param materials - Optional array of materials used
   * @param timeStarted - Optional job start time
   * @param timeCompleted - Optional job completion time
   */
  static async generateJobCardPDF(
    jobCard: JobCard,
    amount?: number,
    materials?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      total?: number;
    }>,
    timeStarted?: Date | string,
    timeCompleted?: Date | string,
  ): Promise<string> {
    try {
      const htmlContent = this.generateJobCardHTML(
        jobCard,
        amount,
        materials,
        timeStarted,
        timeCompleted,
      );
      const fileName = `JobCard_${jobCard.id || jobCard._id || 'Job'}_${Date.now()}`;

      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: 'Documents',
      };

      const file = await RNHTMLtoPDF.convert(options);
      return file.filePath || '';
    } catch (error) {
      console.error('Error generating job card PDF:', error);
      throw new Error('Failed to generate job card PDF');
    }
  }
}
