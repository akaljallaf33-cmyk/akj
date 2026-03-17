# Well Intervention Dashboard — TODO

## Completed Features

- [x] Overview tab with monthly production recovery charts for all service lines
- [x] Three service line tabs (CT, Wireline, Pumping) with individual job tracking
- [x] Job data: Platform, Well Number, Job Type, Start Date, End Date, Production Before/After/+30 Days, Status
- [x] CT-specific: Unit selection (CT-1 or CT-2) with predefined job types
- [x] Wireline: Predefined job types (AP, RST)
- [x] Job Type Breakdown section showing count per job type for each service line
- [x] Well-by-well production charts (Before/After/+30 Days) on each service line tab
- [x] Monthly charts showing all 12 months (Jan-Dec) in correct order
- [x] Database backend (MySQL) for persistent data storage across devices
- [x] Login protection (username: aaljallaf, password: aljallaf) with JWT authentication
- [x] Dragon Oil branding (logo and blue #073674 color scheme)
- [x] Finance & ROI page with monthly ROI chart, KPI cards, per-well ROI table
- [x] Brent oil prices editor (Jan-Dec 2026)
- [x] CT-1: Jack-up daily rate, operational days, bad weather days (50% off), job bill
- [x] CT-2: Job bill only, or with rig daily rate + operational/bad weather days if on rig
- [x] ROI calculation using actual days from End Date + 30 to Dec 31, 2026
- [x] Replace single jobDate with startDate + endDate fields
- [x] Jobs grouped by End Date month in all charts and tables
- [x] ROI days count from End Date + 30 days to 31 Dec 2026
- [x] Start/End date display in job tables (shows arrow → if different dates)

## Pending Features

- [ ] Define and add Pumping job types dropdown
- [ ] Add default CT-1 daily rate setting to avoid re-entering each time
- [ ] Extend Finance/ROI tracking to Wireline and Pumping service lines
- [ ] Add "Pending +30 Days" indicator for wells missing 30-day data
- [ ] Add platform filter dropdown for large datasets
- [ ] Publish the dashboard to get shareable link
