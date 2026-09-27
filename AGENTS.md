# OmniSight Project Rules & Agent Directives

## Mandatory Automatic Git Push Directive

**CRITICAL REQUIREMENT**: After making ANY code changes or completing ANY task in this project:
1. You MUST ALWAYS automatically stage all modified files:
   ```bash
   git add .
   ```
2. You MUST ALWAYS create a descriptive commit message following conventional commits format (e.g. `feat(...)`, `fix(...)`, `chore(...)`, `refactor(...)`).
3. You MUST ALWAYS push all commits to GitHub:
   ```bash
   git push origin main
   ```
4. Verify the push succeeds before concluding your turn.
5. Report the commit hash and GitHub push confirmation to the user.

Do not leave uncommitted or unpushed work in this repository.
