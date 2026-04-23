# NFL Draft Tracker - Continuity Guide

## Reference State
- **Stable Commit**: `4e37cf4c06725f9d9e5717b5355120ae0066147f`
- **Design Philosophy**: Premium dark mode, radial gradients, high transparency, clean typography.

## Technical Context
- **Files**: `src/DraftTracker.jsx`, `src/index.css`.
- **Logic**: Hybrid board merging OTC and PFF data. Real-time sync via Supabase.
- **Master Mode**: Uses `isMaster` state to show admin buttons and trade registration.

## Instructions for Next Steps
1. **Sticky Header**: The user wants the entire top section (Header, Progress Bar, OTC Banner, and Filters) to stay fixed at the top during scroll.
2. **Implementation**: 
   - Wrap the following elements in a `<div className="tracker-sticky-wrapper">`:
     - `.tracker-header`
     - `.tracker-progress-bar`
     - `.tracker-header-sticky` (which contains banner and filters).
   - In CSS, apply `position: sticky; top: 0; z-index: 1000; background-color: var(--bg-primary);`.
3. **DO NOT**:
   - Change the flex layout of the header (Title left, Controls right).
   - Add new fonts or complex clock widgets.
   - Use solid navy/black backgrounds that break the background gradient.
4. **Mobile Check**: Ensure the `.tbr-grade-col` remains fixed at 40-50px to keep player names aligned horizontally.

## Master Mode Details
- Login is handled via `showLogin` modal.
- `setIsMaster(true)` enables the admin view.
- Admin view includes: "Salvar" button, "Incluir/Excluir" buttons in board rows, and "TROCA" button in the OTC banner.
