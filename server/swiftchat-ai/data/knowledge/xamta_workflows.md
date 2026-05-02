# XAMTA Workflows

## What XAMTA does
XAMTA is SwiftChat's assessment scanner. It scores answer sheets / OMRs / classroom worksheets against the GCERT learning-outcome rubric. Teachers and Principals use it to track per-student mastery without manual marking.

## Inputs accepted
- Image (JPG, PNG, HEIC) — up to 10 MB.
- PDF — single-sheet or multi-sheet.
- Live camera capture on mobile (Android Chrome, iPhone Safari).

## Scan flow
1. Type "xamta" / "scan" / "answer sheet" in chat, or tap the XAMTA Scan tile.
2. Choose **Upload Image/PDF** or, on mobile, **Open Camera**.
3. Pick the answer key template (subject + grade). Templates are pre-loaded for Math, Science, Gujarati, English for Grades 3–10.
4. The scanner detects bubbles / written answers and produces a per-student score.
5. Tap **Save results** to write back into the gradebook. Results sync to the Class Dashboard immediately.

## Manual entry fallback
If the scan fails or the worksheet is non-OMR, tap **Enter marks by form** to type marks directly.

## Outputs
- Per-student score (correct/total).
- Per-question hit-map.
- Learning-outcome (LO) coverage report, viewable from "View past XAMTA results" or by typing "learning outcomes".

## Privacy
XAMTA images stay on the school's tenant. Nothing leaves the school except aggregated LO scores reported to the District.
