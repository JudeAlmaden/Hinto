HINTO MASCOT SOURCE

- mascot_sheet.png: the original generated composite sheet (6 pose columns x 4 rows,
  plus an 8-cell expression row).
- The shipped art lives in ../main_poses/ (18 poses) and ../expressions/ (8 busts),
  each cropped to the character and cleaned of neighbour bleed from the sheet cells.
- Pose keys are semantic and mapped in src/components/ui/mascot.tsx
  (hero, greeting, waiting, tracking, stale, paused, arrived, alarm, offline,
  battery, empty, saved, searching, permission, interrupted, error, pointing, night).
- To replace a piece of art, overwrite the PNG with the same filename and key;
  no screen code needs to change. Keep a transparent background and a tight crop.
