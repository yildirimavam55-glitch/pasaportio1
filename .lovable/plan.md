# Admin V2 — Business Control Center Redesign

## Goal
Turn the existing protected Admin into one premium, compact business control center with `Genel / eSIM / Lounge` contexts, while preserving the storefront, database foundations, provider import, pricing, authentication, and all existing customer flows.

## Build plan

### 1. Global Admin shell and navigation
- Replace the flat desktop sidebar with grouped, collapsible sections: Business, eSIM, Lounge, Catalogue & Providers, Store Management, Finance & Operations, and System.
- Add a compact responsive top bar with page title, mobile navigation, operational-alert access, account context, and “Mağazayı görüntüle”.
- Keep every Admin page behind the existing authenticated route and server-side admin checks.
- Apply a dedicated Admin visual layer using the existing semantic palette: warm off-white canvas, petrol navigation, white surfaces, orange actions, mint eSIM accents, sand Lounge accents, compact spacing, consistent Lucide icons, and semantic status colors.

### 2. One dashboard with three service contexts
- Add a top `Genel / eSIM / Lounge` segmented switch using `?service=all|esim|lounge`.
- Reuse the current analytics endpoint and filters; changing context updates KPIs, chart data, insights, alerts, top products, and quick actions without duplicating dashboards.
- General: revenue, orders, provider cost, gross profit, gross margin, average order value, conversion, repeat purchase, service comparison, source performance, and combined alerts.
- eSIM: eSIM revenue/orders/sold units/cost/profit/margin plus destinations, regions, package sizes, route presets, route mode, Finder funnel, compatibility checks, provisioning/QR alert summaries.
- Lounge: Lounge revenue/bookings/guests/cost/profit/margin plus airports, lounges, trip situation, average travelers, Finder funnel, voucher/booking alert summaries.
- Keep honest zero states and never manufacture trends, conversion, profit, or operational success rates.

### 3. Dashboard controls and charts
- Keep Today, Yesterday, Last 7 days, Last 30 days, This month, and Custom date with previous-period comparison.
- Add reporting-currency presentation control without performing fake currency conversion.
- Consolidate the current chart area into a focused Revenue / Gross Profit / Orders switch with optional previous-period comparison and clear eSIM/Lounge breakdown.
- Make KPI surfaces link to their relevant detailed sections.

### 4. Operational pages from existing data
- Replace placeholder Orders with an existing-data table filtered by All/eSIM/Lounge, preserving separate payment and fulfillment states and financial columns.
- Replace placeholder Customers with an existing-data customer summary, keeping customer country separate from travel destination.
- Add eSIM Fulfillment and Lounge Bookings operational views using existing order/service delivery records, service-specific statuses, failure filters, and safe metadata display.
- Never expose activation secrets, QR contents, EID, IMEI, or serial data.

### 5. Provider and catalogue experience
- Redesign Provider Hub as one shell with eSIM/Lounge tabs, provider status, capabilities, latest sync, catalogue count, errors, and supported balance visibility.
- Preserve the completed eSIM provider import engine and its diff/idempotency/manual-price safeguards unchanged.
- Replace Products placeholder with service-specific grouped catalogue views: eSIM by country/region/coverage; Lounge by airport/terminal/lounge. Keep long product sets collapsed and use compact detail/edit affordances for existing admin-owned fields only.

### 6. Analytics, finance, and management areas
- Add dedicated Admin views for Analytics and Finance using the current order, attribution, event, and refund foundations: filters, source reporting, first/last touch, UTM, funnel, cross-sell, and separated revenue/cost/fees/refunds/profit.
- Add clearly separated CMS, Media, and Theme areas. Where the current backend has no editable implementation, provide honest protected management surfaces and zero/not-configured states rather than inventing persistence.
- Media includes All/eSIM/Lounge filtering and visual asset cards; Theme uses visual controls only, never raw CSS/token fields.

### 7. Existing specialist tools
- Restyle the existing eSIM Recommendation manager into compact grouped sections/tabs with its preview calculator.
- Preserve and restyle Device Compatibility, Test Catalogue, and Provider Import behavior.
- Ensure links referenced by the new navigation have real protected route files; disabled/not-configured functionality remains explicit and non-destructive.

### 8. Verification
- Add route-specific metadata to every Admin content route touched or created.
- Run focused analytics tests and the existing suite.
- Verify role denial, General/eSIM/Lounge filtering, honest empty data, desktop/tablet/mobile navigation, critical alerts, Orders, and service-specific operational pages with browser checks.
- Confirm no customer-facing route or layout changed and no provider/payment integration was added.

## Technical notes
- No database migration is planned unless inspection proves an unavoidable missing read model; existing tables remain the source of truth.
- New Admin reads use authenticated server functions with the existing `has_role` authorization pattern and row-level security.
- `service` remains a typed URL search parameter so views are linkable and reload-safe.
- Existing Provider Import functions and catalogue import logic are not rewritten.
- Unsupported operational success percentages display `—` until reliable event/status data exists.
