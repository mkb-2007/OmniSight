---
description: Automatically commit and push all project changes to GitHub after each task
globs: *
---

# Mandatory Automatic Git Push Rule

After modifying, adding, or deleting any files in this project:
1. Always run:
   ```bash
   git add .
   git commit -m "<descriptive message>"
   git push origin main
   ```
2. Never finish a turn leaving changes uncommitted or unpushed to `origin main`.
3. Confirm push success in your response.
