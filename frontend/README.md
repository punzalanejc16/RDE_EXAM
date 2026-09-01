How the RDE Technical Assessment Portal Works

The system operates as a full-stack web application split into three main layers: Frontend (React), Backend (Python Flask), and Data Storage (JSON).

1. Candidate Verification & Entry

User Action: The candidate enters their full name on the verification screen and clicks "Start Examination".
System Process:

Before allowing access, the frontend sends a request to the backend 
(POST /api/check-name).

The backend queries results.json to verify if that candidate name has already submitted an assessment.
Security Rule: If a match is found, the system blocks entry to prevent re-examination.

If the candidate is new, the application records the exact Start Date & Time (startTime).

2. Sequential Assessment Workflow

User Action: The candidate views one question at a time, complete with component diagrams/images loaded from the backend (backend/static/images/). They select an option and click "Next Question".

System Process:

Mandatory Selection: The "Next Question" button remains strictly disabled until an answer option is selected for the current item.

No Back Navigation: Previous question controls are omitted to preserve examination integrity and prevent back-tracking modifications.

Candidate selections are stored in the React application state (answers) as they progress through the items.

3. Automated Evaluation & Submission

User Action: On the final item, the action button changes to "Submit Examination". Clicking it routes the user to the Assessment Summary page.

System Process:

The frontend posts the complete payload (Candidate Name, Answers, Start Time) to POST /api/submit.

Scoring Logic: The Flask backend cross-references the candidate's submitted choices against the official answer keys.

95% Passing Threshold:
$\text{Percentage} \ge 95.0\% \rightarrow$ PASSED
$\text{Percentage} < 95.0\% \rightarrow$ FAILED

Data Persistence: The backend appends/updates the completed entry in results.json alongside the Completion Time (timestamp).

4. Interactive Answer Review Mode

User Action: The candidate clicks "Review Submitted Answers" on the summary view.

System Process:

The application renders all questions alongside the candidate's chosen options.

Interactive badges indicate performance details:

YOUR ANSWER (Red/Green badge denoting user selection)
✓ CORRECT KEY (Green badge identifying official correct option)

5. Hidden Administrator Dashboard & Authentication

User Action:

 The administrator accesses the hidden URL parameter:
 Plaintexthttp://localhost:5173/?view=admin

Authentication Process:
The portal prompts for the administrator passphrase.

Admin Password: admin123 (or your configured passphrase).

Upon typing the correct password, the frontend fetches all records from GET /api/results.

The portal formats the entire results.json dataset into an enterprise data table displaying names, scores, pass/fail status, start times, and completion times.