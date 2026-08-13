# Manual Test Cases: BobaHack Virtual Clinic

This document outlines step-by-step instructions for QA to manually verify core application workflows.

## TC01: E2E Emergency SOS Dispatch
**Objective:** Verify that a verified Health Worker can successfully create an SOS and it routes to an available Doctor.

**Pre-conditions:**
1. User A is logged in to the frontend app and has "Health Worker" verified status.
2. User B is logged in on a separate device and has "Doctor" verified status, and is set to `AVAILABLE`.

**Steps:**
1. **Health Worker**: Navigate to the SOS/Home screen.
2. **Health Worker**: Add a symptom description (e.g., "Patient has severe chest pain").
3. **Health Worker**: Take or attach a photo using the image picker.
4. **Health Worker**: Tap **Send SOS to Doctor**.
5. **Doctor**: Observe the "Alerts" dashboard.
6. **Doctor**: Accept the incoming SOS notification within the 15-second wave window.

**Expected Results:**
- **Health Worker**: Should hear the 30-second localized emergency siren. App should display "Finding an available doctor...".
- **Doctor**: Should receive the SOS alert with the worker's name, verified badge, patient case, and location.
- **Both**: Once the doctor accepts, both UIs should update to show they are connected.

---

## TC02: Offline Bluetooth Mesh Relay Simulation
**Objective:** Verify that the system attempts to bundle and broadcast an SOS when the internet is unavailable.

**Pre-conditions:**
1. Health Worker is logged into the app.

**Steps:**
1. Disable Wi-Fi and Cellular Data on the mobile device (Airplane mode with Bluetooth enabled).
2. Enter a symptom description and attach a photo.
3. Tap **Test Offline SMS / Send SOS**.

**Expected Results:**
- The app should detect it is offline and trigger the `bluetoothMeshService.ts`.
- The UI should indicate that the message is being broadcasted via the Bluetooth Mesh Network.
- (Simulation) Once an internet connection is simulated/restored, verify that the Formspree email log successfully captured the payload (Worker ID, Location, Encoded Images).

---

## TC03: AI-Powered Skin & Anomaly Detection
**Objective:** Verify that the ML inference engine successfully processes image uploads and returns a diagnosis.

**Pre-conditions:**
1. Health Worker is logged in. Backend server (FastAPI) is running.

**Steps:**
1. Navigate to the Skin AI analysis tab.
2. Upload a clear picture of a skin anomaly (e.g., a mole or rash).
3. Tap **Analyze Image**.

**Expected Results:**
- The image is converted to Base64 and sent to the backend.
- The UI displays a loading state.
- The backend returns disease probabilities, confidence scores, and localized diet/health precautions.
- The results are displayed cleanly on the frontend UI.

---

## TC04: Patient PDF Generation & Data Vanishing (HIPAA Compliance)
**Objective:** Ensure that after generating a patient report, the sensitive data is successfully wiped from the cloud.

**Pre-conditions:**
1. An SOS case has been accepted and resolved by a Doctor.
2. Both Health Worker and Doctor notes are present on the case.

**Steps:**
1. **Health Worker**: Open the resolved case details.
2. **Health Worker**: Tap **Generate Local PDF Report**.
3. Allow the PDF to save to the device's local file system.
4. **Admin/Tester**: Open the Supabase dashboard (or run a query via the backend).

**Expected Results:**
- The PDF is successfully generated and contains all AI analysis, doctor notes, and symptoms.
- In Supabase, the specific `SOS_REQUESTS` record should have its sensitive fields (Name, Location, Images, Description) overwritten with `[REDACTED FOR PRIVACY]`.
- An email is sent via Formspree confirming the case is "Resolved".
