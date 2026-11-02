# GrowMate glossary

Use these terms exactly, in tickets and code. Source: PRD §3 (`prd-growmate/prd-growmate.md`).

- **Employee**: anyone with an account who is not Admin. An Employee can be a Learner on some Courses and a Mentor on others.
- **Admin**: the single administrator account. It manages Courses, Assessments, Registration decisions and Group assignments, and sees nothing of Requests or Matches.
- **Course**: the unit of learning, published by Admin and visible to all Employees. Each Course has exactly three Stages.
- **Stage**: Bronze, Silver or Gold for a Course. Each Stage has one Assessment and a Pass mark. Stage progress belongs to the Learner and the Course, never to a Match.
- **Assessment**: an Admin-entered bank of multiple-choice questions for one Stage, scored automatically as a percentage.
- **Pass mark**: the minimum percentage Admin sets for a Stage's Assessment.
- **Mentor (for a Course)**: an Employee allowed to receive Requests for that Course. Mentor status is always per Course.
- **Mentor route**: why someone is a Mentor for a Course. It is one of **Gold pass**, **Registration approval** or **Group assignment accepted**. It is stored but never shown to Employees.
- **Mentor check**: the optional signup step where an Employee names one or more Courses they can mentor. It is never rerun.
- **Registration decision**: Admin's bare, final yes or no on each Course named in a Mentor check.
- **Learner**: an Employee who requests, or is assigned, a Mentor for a Course.
- **Request**: a Learner's ask to one Mentor for one Course, with no reason. It stays pending until Accepted or Cancelled.
- **Group assignment**: Admin's action creating a pending Request from each of several Learners to one chosen Employee for one Course.
- **Accept**: the Mentor's only response to a Request. One Accept covers a whole Group assignment.
- **Cancel (day 6)**: automatic clearing of an un-Accepted Request six days after it was sent. It is not a rejection.
- **Match**: the live pairing of one Learner and one Mentor for one Course, created by Accept. It ends only by Quit or Course Completed.
- **Quit**: either party ending a Match unilaterally, with a free-text reason.
- **Course Completed**: the Mentor's click meaning "ready for the Assessment". It ends the Match and unlocks Bronze.
- **Retake rule**: two attempts per Stage, then a one-month Lock, then two attempts again, repeating.
- **Lock**: the fixed one-month period during which a Stage can't be attempted.
- **Progress status**: a Learner's state on a Course. **Not yet started** (grey), **In progress** (half blue), **Completed** (green) or **Quit** (red). If nothing is pending, live or in progress, the Learner has no status.
- **Upskilling list**: a read-only list, visible to everyone, of Employees who are In progress on some Course.
