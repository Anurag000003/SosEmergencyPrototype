import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function generatePatientReport(data: {
  patientId: string;
  workerId: string;
  caseDescription: string;
  doctorNotes: string;
  severity: string;
  healthWorkerNotes: string;
}) {
  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #ea7a53; border-bottom: 2px solid #eee; padding-bottom: 10px; }
          .section { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eee; }
          .title { font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #555; }
          .content { font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
          .footer { margin-top: 40px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
          .tag { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; background: #ea7a53; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <h1>Secure Patient Report</h1>
        <p><strong>Date Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Patient ID:</strong> ${data.patientId || 'N/A'}</p>
        <p><strong>Attending Health Worker:</strong> ${data.workerId}</p>
        <div class="tag">Severity: ${data.severity}</div>

        <div class="section">
          <div class="title">Initial Case Description</div>
          <div class="content">${data.caseDescription}</div>
        </div>

        <div class="section">
          <div class="title">Doctor's Response & Notes</div>
          <div class="content">${data.doctorNotes || 'No notes provided by the doctor.'}</div>
        </div>

        <div class="section">
          <div class="title">Health Worker's Final Notes</div>
          <div class="content">${data.healthWorkerNotes || 'No additional notes.'}</div>
        </div>

        <div class="footer">
          This document was generated securely on the device. Sensitive data has been vanished from the centralized servers to protect patient privacy.
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      return true;
    } else {
      console.warn("Sharing is not available on this device.");
      return false;
    }
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return false;
  }
}
