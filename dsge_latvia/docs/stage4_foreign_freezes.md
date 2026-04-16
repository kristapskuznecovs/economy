# Stage 4 Foreign Freeze Analysis

- Generated: `2026-04-16T19:36:15.883178+00:00`

## Stage 3 to Stage 4 Delta

- Stage 3 count: `135` equations
- Stage 4 count: `139` equations
- Delta: `4` equations

Stage 4 differs from Stage 3 only by the foreign freeze equations. If a configured environment reaches Stage 3 successfully and fails first at Stage 4, the freeze set is the immediate suspect set before broader foreign-block debugging.

## Added Freeze Equations

- `freeze_R_star`: `R_t_star = R_star`
  pins: `R_t_star`
  notes: Freeze foreign rate at steady state until SVAR block is wired.
- `freeze_pi_star`: `pi_t_star = pi_star`
  pins: `pi_t_star`
  notes: Freeze foreign inflation at steady state until SVAR block is wired.
- `freeze_yf`: `y_t_f = y_f`
  pins: `y_t_f`
  notes: Freeze foreign demand at steady state until SVAR block is wired.
- `freeze_s`: `s_t = 1`
  pins: `s_t`
  notes: Freeze nominal exchange rate growth at steady state until SVAR block is wired.
