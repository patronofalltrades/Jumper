# Source: Jumper — Product requirements and user stories (v0.1)

> Source text, not edited. It is not in ASD-STE100, because it is the input of the product interviews (3 users of one persona). Hanif gave it on November 21, 2026. The scoped version is [TRD-learning-journey.md](../TRD-learning-journey.md) and [PLAN-learning-journey.md](../PLAN-learning-journey.md).

Version 0.1 · 20 November 2026 · Draft for product and engineering scoping

## 1. Product outcome

Help students connect electronic concepts to circuit behavior, diagnose a failed circuit, and apply the same reasoning to a different physical layout.

The initial audience is undergraduate electrical engineering students in an introductory circuits course, particularly those who recently struggled to make a circuit work. Jumper's broader ambition includes beginners and self-taught learners.

This document defines three features for a single learning journey.

| Priority | Feature | Intended outcome |
| --- | --- | --- |
| P1 | Same Circuit, Three Worlds | Recognize the same electrical connection across schematic, virtual breadboard, and physical build |
| P2 | Predict, Build, Explain | Predict circuit behavior and explain the observed result |
| P3 | Circuit Change Replay | Identify which change affected circuit behavior and test a correction |

## 2. Evidence and scope assumptions

The shared product discussion selected conceptual understanding, diagnosis, and transfer as core benefits. It ultimately selected Same Circuit, Three Worlds as the concept that best supports Jumper's digital-to-physical learning goal. Interview summaries in that discussion describe useful virtual practice, difficulty with physical faults such as loose wires, and questions about the current exercises' relevance to university coursework.

These findings are directional. This document uses the discussion's interview summaries. Original interview transcripts and the current codebase were not reviewed for this deliverable. Feature requirements, implementation boundaries, and validation proposals below are recommendations for team review.

Source — Jumper product discovery discussion.

### Proposed first release

- Use one existing Arduino LED circuit as the shared lesson, with its board model, resistor value, LED orientation, and code fixed in versioned lesson content.
- Reuse Jumper's breadboard, editor, Run control, lesson navigation, and progress storage where available. Engineering must verify their current capabilities.
- Provide an authored schematic, physical-build photo, and short physical-fault clip for that exact circuit.
- Support connection changes and code edits already supported by Jumper's execution model.
- Use authored questions, answer options, and explanations for the pilot. Short written reflections can be collected for review.
- Treat desktop as the initial build-and-debug experience. Provide a readable stacked comparison on smaller screens, with mobile editing support decided during scoping.

## 3. Feature 1 — Same Circuit, Three Worlds

### Problem and user story

Students may recognize a wiring tutorial yet struggle to identify the same connection in a schematic or on a differently arranged physical board.

- **US-1.1** As an introductory circuits student, I want to inspect the same circuit in schematic, virtual, and physical views so that I can relate electrical connections to the parts in front of me.
- **US-1.2** As a student preparing for a lab, I want to examine a physical failure and choose what to check so that I can practice applying my virtual learning to real hardware.

### User flow

1. Open the lesson and select Compare views.
2. View the reference schematic, editable virtual build, and matching physical photo.
3. Select a labeled component terminal or connection in any view.
4. See corresponding locations highlighted across the other views, with a short explanation.
5. Watch the physical-fault clip and answer which connection to check first and why.
6. Complete a transfer question using a second physical photo with a different layout.

### Functional requirements

| ID | Requirement |
| --- | --- |
| F1-R1 | Display all three representations for the same versioned reference circuit. On narrow screens, retain selection when switching between views. |
| F1-R2 | Map component terminals, breadboard holes, and connections using stable identifiers. Highlight equivalent locations with labels and a visual outline. |
| F1-R3 | Explain the selected connection using authored text, including relevant internally connected breadboard holes. |
| F1-R4 | Clearly label schematic and physical media as reference views. When the learner changes the virtual build, show which virtual connections differ from the reference. |
| F1-R5 | Present a short authored physical-fault clip with captions and a text description, followed by a first-check question and explanation. |
| F1-R6 | Present a new-layout transfer question. Record the first answer, hints used, and final answer separately. |

### Acceptance criteria

- **F1-AC1** Given a mapped terminal, when the student selects it from any view, all corresponding locations are highlighted and a matching label is available.
- **F1-AC2** Given a moved virtual wire, when comparison is opened, the reference media retain their reference label and the changed virtual connection is identified accurately.
- **F1-AC3** Given the physical-fault question, submitting an answer displays authored feedback and records whether help was used.
- **F1-AC4** Given the second board layout, the answer mapping follows its electrical connections even when component positions differ from the first photo.
- **F1-AC5** Given unavailable media, the student receives a retry action and a text alternative while their current circuit and answers remain available.

### Dependencies and estimate drivers

Requires a stable circuit identity model, reference-to-board mapping, schematic rendering, annotated physical media, and reviewed educational content. Accurate mapping and handling differences between reference and edited circuits are the main engineering unknowns. The pilot uses predefined photos and manually authored hotspots.

## 4. Feature 2 — Predict, Build, Explain

### Problem and user story

A working circuit alone gives limited evidence that the student understands why it works or can predict what a change will do.

- **US-2.1** As a circuits student, I want to predict a change's effect before running it so that I can compare my reasoning with the observed behavior.
- **US-2.2** As a student who made an incorrect prediction, I want a targeted explanation and another attempt so that I can correct the concept I misunderstood.

### User flow

1. Start the lesson's prediction challenge from its defined baseline circuit.
2. Read a proposed wire move and select the expected LED behavior with a reason.
3. Apply the change in the breadboard and select Run.
4. Compare the prediction with the observed result.
5. Select an explanation, receive feedback, and optionally write a short reflection.
6. Try a variation that tests the same concept on a different layout.

### Functional requirements

| ID | Requirement |
| --- | --- |
| F2-R1 | Define each challenge with a baseline circuit, proposed change, prediction choices, expected result, explanation choices, and concept tag. |
| F2-R2 | Capture the prediction before the first challenge run. If a student chooses to skip prediction, allow exploration and mark the attempt as unscored. |
| F2-R3 | Check that the learner's circuit matches the challenge's supported configuration before assessing the result. Explain any required correction. |
| F2-R4 | Show prediction and actual behavior together after a completed run. Grade behavior prediction and conceptual explanation separately. |
| F2-R5 | Provide progressive authored hints, ending with a highlighted connection and explanation. Record hint use. |
| F2-R6 | Preserve the original attempt when a student retries. Offer a transfer variation after feedback. |

### Acceptance criteria

- **F2-AC1** Given a fresh challenge, the first prediction is recorded before its result is revealed. Skipping records an unscored attempt.
- **F2-AC2** Given a valid challenge configuration, a completed run displays the observed behavior beside the original prediction.
- **F2-AC3** Given a compile error, unsupported configuration, or simulation failure, the UI explains the problem and permits retry without assigning a conceptual correctness score.
- **F2-AC4** Given a correct behavior prediction with an incorrect explanation, feedback identifies the explanation as needing review.
- **F2-AC5** Given a retry, the first attempt remains available for measurement and the retry is recorded separately.
- **F2-AC6** Given the transfer variation, its answer is assessed against the variation's own circuit mapping and explanation rubric.

### Dependencies and estimate drivers

Requires a challenge state machine, deterministic lesson checks, observable simulation results, and a content rubric. Confirm how the existing runtime reports LED state and compile/runtime errors. Authored explanations can support the pilot without introducing automatic grading of open-ended text.

## 5. Feature 3 — Circuit Change Replay

### Problem and user story

After several edits, students can lose track of which wire move or code change caused a circuit to stop working.

- **US-3.1** As a student debugging a circuit, I want to compare my current build with the previous run so that I can identify changes that may explain the new behavior.
- **US-3.2** As a student testing a diagnosis, I want to restore a prior build and rerun it so that I can check whether reversing the change restores the expected behavior.

### User flow

1. Run the circuit and capture its build, code, and observed outcome.
2. Change a connection or code and run again.
3. Select Compare with last run.
4. Inspect the two build states, changed connections or code lines, and both outcomes.
5. Choose a suspected cause and read the relevant concept prompt.
6. Restore the previous state or manually correct the current state, then rerun to test the diagnosis.

### Functional requirements

| ID | Requirement |
| --- | --- |
| F3-R1 | Capture an immutable snapshot at each Run containing circuit state, code, lesson version, runtime version, and a unique run ID. Attach the outcome to that run. |
| F3-R2 | Compare the latest run with its predecessor, including a failed run where its error is relevant. Preserve at least the latest three run snapshots for the pilot. |
| F3-R3 | Identify added, removed, and moved connections, changed supported component values, and code-line differences. Show all relevant edits when several occurred. |
| F3-R4 | Present before-and-after outcomes with their snapshots. Label pending, successful, and failed runs explicitly. |
| F3-R5 | Explain that the comparison identifies candidate causes. Ask the student to test their diagnosis with a new run. |
| F3-R6 | Before restoring a prior snapshot, save the current working state for undo. Restore circuit and code together and require a new run to produce a current result. |

### Acceptance criteria

- **F3-AC1** Given only one run, comparison explains that another run is needed.
- **F3-AC2** Given a single wire move between runs, comparison highlights the old and new endpoints and the corresponding outcomes.
- **F3-AC3** Given multiple wiring and code edits, comparison lists each change without asserting a unique cause.
- **F3-AC4** Given edits made during an in-flight run, the returned result remains attached to the exact snapshot that initiated that run.
- **F3-AC5** Given a restore, circuit and code return to the selected snapshot together. Undo recovers the pre-restore working state, including unsaved edits.
- **F3-AC6** Given a failed run, its error appears alongside the attempted state and the student can still compare or restore the earlier state.

### Dependencies and estimate drivers

Requires reliable circuit serialization, code snapshots, stable connection identifiers, a diff renderer, and atomic restore. The pilot presents two selectable snapshots and their outcomes. A full timeline, animated execution playback, and arbitrary historical replay are later expansion options.

## 6. Shared technical requirements

### Proposed data contracts

Reuse equivalent existing models where they satisfy these requirements. The names below describe responsibilities for estimation.

| Object | Minimum information |
| --- | --- |
| LessonVersion | Lesson ID, version, baseline circuit/code, supported board, component inventory, concept tags |
| RepresentationMap | Stable component/terminal/connection IDs, schematic anchors, breadboard coordinates, physical-media hotspots |
| ChallengeDefinition | Baseline reference, allowed change, answer options, expected outcome, explanation rubric, hints, variation |
| LearningAttempt | Attempt ID, lesson version, prediction, explanation response, hint use, first/retry designation, status |
| RunSnapshot | Run ID, immutable circuit/code, runtime version, timestamp, status, observed result or error |
| WorkingStateBackup | Circuit/code before restore, associated lesson version, undo availability |

### State, accessibility, and reliability

- Bind every result and assessment to the originating run and lesson version. Discard duplicate result processing using the run ID.
- Save attempts and the minimum snapshot history through the existing project/session storage. Resume after refresh when that storage supports it. Engineering must choose local or account-backed persistence and document its limitations before estimation is final.
- If stored data is incompatible with a newer lesson or runtime, explain the incompatibility and offer a fresh attempt while retaining the prior record where feasible.
- Keep inspection and answering usable by keyboard. Provide labeled alternatives for visual mappings and wire-change summaries.
- Combine color with text, outlines, or patterns. Caption media and respect reduced-motion settings.
- Define and measure response-time targets against the existing application baseline during the technical spike. Preserve user work when media, simulation, or persistence fails.
- Keep optional written reflections in the intended learning record. Analytics events should carry identifiers and scores rather than raw reflections or source code.

## 7. Measurement and pilot validation

The primary outcome is successful transfer to a differently arranged physical circuit. Define a shared rubric before recruiting the pilot.

| Measure | Definition |
| --- | --- |
| Transfer success | Student identifies the relevant connection, chooses a valid diagnostic check, and explains the concept on a new physical layout |
| Prediction accuracy | Correct first predictions divided by scored first prediction attempts |
| Explanation accuracy | Correct first explanation choices divided by scored first explanation attempts |
| Debugging efficiency | Time and unrelated edits between fault presentation and a verified correction |
| Help dependence | Hints used and assisted versus independent task completion |
| Completion | Students reaching the transfer task divided by students starting the lesson |

Suggested events include comparison_opened, connection_selected, prediction_submitted, run_completed, explanation_submitted, hint_used, snapshot_compared, snapshot_restored, and transfer_completed. Include lesson version, attempt ID, and run ID where relevant. Emit completion events once per corresponding record.

For an initial qualitative pilot, recruit 5–8 introductory EE students who recently encountered a failed circuit. Observe the shared LED lesson, then use a differently arranged physical circuit and the same rubric. This sample can reveal usability and learning problems. Set quantitative launch thresholds after establishing a baseline and testing the rubric.

## 8. Delivery slices and engineering scoping

| Slice | Work package | Demonstrable result |
| --- | --- | --- |
| 0 | Audit circuit serialization, runtime results, stable IDs, persistence, and existing editor controls | One canonical LED circuit can be saved, run, and restored with consistent observations |
| 1 | Author physical media and schematic, create mapping, build linked selection and reference-difference UI | Same Circuit, Three Worlds works end to end for one lesson |
| 2 | Add prediction/explanation state, content rubric, hints, and transfer variation | One student can complete and retry a scored challenge |
| 3 | Add immutable snapshots, diff, restore/undo, and error handling | Student can inspect a change and verify a correction through rerun |
| 4 | Verify accessibility, persistence, instrumentation, and learning content | Pilot participants can complete the full journey with usable records |

Engineering should estimate each slice after the initial audit. Current repository capabilities, simulation fidelity, asset preparation effort, and team capacity remain unverified, so this document assigns no delivery dates or effort points.

## 9. Decisions to resolve during scoping

| Decision | Proposed starting point | Suggested owner |
| --- | --- | --- |
| Pilot board and circuit | Reuse one existing Arduino LED lesson and its supported components | Product + engineering |
| Physical media production | Photograph the exact reference build and a new-layout variation, record one visible fault scenario | Learning design |
| Level of circuit simulation | Use the existing runtime for supported behavior and author the physical-fault lesson around observed media | Engineering + learning design |
| Snapshot persistence | Reuse project/session storage and retain the latest three runs plus restore backup | Engineering |
| Explanation grading | Authored choices for scoring, optional written reflection for qualitative review | Product + learning design |
| Supported devices | Desktop editing and responsive comparison views for the pilot | Product + design |
| Evidence of learning | Agree a transfer rubric, baseline task, and success threshold before wider release | Product + research |

## 10. Release acceptance checklist

- [ ] Every feature's acceptance criteria pass through the normal lesson entry point.
- [ ] A subject reviewer verifies circuit mappings, prediction answers, explanations, and physical-fault content.
- [ ] Reference diagrams, photos, virtual state, and lesson versions stay correctly associated after edits.
- [ ] Failed runs, rapid successive runs, refresh, retries, and restore/undo preserve consistent state.
- [ ] Keyboard navigation, text alternatives, captions, and narrow-screen comparison are usable.
- [ ] First attempts, retries, hints, and transfer responses can be distinguished in the pilot records.
- [ ] The complete LED lesson has been tried with target students and the team has reviewed the observed learning outcomes.
