# Staff Feature

## Purpose
Employee-facing self-service portal with PIN-based authentication, schedule viewing, time clock, availability management, shift swap requests, PTO, and notifications.

## Routes
- `/staff` — StaffPortal (no auth guard — uses its own PIN login)

## Components

### StaffPortal (`os-staff-portal`)
Full-screen component with PIN pad login (4-6 digit). After PIN auth, shows tabbed interface:

**Tabs:**
- **Schedule** — Weekly shift view with day-by-day breakdown, total hours, earnings summary. Week navigation (prev/next/this week). PTO request form with balance display.
- **Availability** — 7-day availability grid. Edit mode toggles day available/unavailable with preferred start/end times and notes.
- **Swaps** — Shift swap request creation, incoming swap response (approve/reject), outgoing request status.
- **Timeclock** — Sub-tabs: clock (clock in/out, break start/end), history (today's timecards). PIN-based clock-in with optional job title selection for multi-job employees. Break types loaded from LaborService. Declared tips on clock-out. Schedule enforcement with configurable grace minutes. Manager PIN override for off-schedule clock-ins. Auto clock-out timer (after shift end or business day cutoff). Timecard edit requests.
- **Notifications** — Bell icon with unread count badge. Types: schedule_published, shift_changed, swap_approved/rejected, timecard_approved/rejected, announcement.

**Services:** LaborService, RestaurantSettingsService, StaffManagementService

## Models
- StaffMember, Shift, StaffPortalTab, AvailabilityPreference, SwapRequest
- StaffEarnings, ShiftPosition, Timecard, TimecardBreak, BreakType
- TimeclockTab, TimecardEditType, StaffNotification
- PtoType, PtoRequest, PtoRequestStatus, PtoBalance, TeamMember

## Key Patterns
- No AuthService guard — portal uses its own PIN validation via `laborService.validateStaffPin()`
- Job switching: clock out current job, immediately clock in with new job title (two API calls)
- Schedule enforcement checks shift start time against current time with grace window
- Manager override requires a separate manager-level PIN validation
- Auto clock-out uses `setTimeout` with cleanup on logout/destroy
- Shift position colors: server (blue), cook (red), bartender (purple), host (green), manager (gold), expo (orange)
- Logout clears all state and returns to PIN pad
