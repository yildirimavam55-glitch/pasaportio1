# Remix of Remix of Pasaport

TRAVEL PLATFORM V2

PHASE 0 — FOUNDATION + MULTI-SERVICE ARCHITECTURE



ROLE



Act as:

- Senior Software Architect

- Senior Full-Stack Engineer

- Product Architect



IMPORTANT:



This is a NEW V2 project.



Do not build the finished website yet.

Do not invent the final visual design yet.

Do not connect live provider APIs yet.



First create a clean architecture that will support the complete platform.



==================================================

PROJECT VISION

==================================================



This is not only an eSIM website.



It is a modular TRAVEL SERVICES PLATFORM.



CUSTOMER-VISIBLE V1 SERVICES:



1. ESIM

2. AIRPORT LOUNGE



FUTURE SERVICES:



3. CAR RENTAL

4. AIRPORT TRANSFER



Car Rental and Transfer must be supported by the architecture,

but MUST remain disabled and invisible to customers in V1.



==================================================

CORE PRINCIPLES

==================================================



- mobile-first

- Turkish default

- German and English supported

- ADMIN / CUSTOMER roles

- modular service architecture

- external provider APIs

- automatic catalogue synchronization

- no-code customer-facing CMS

- provider credentials server-side only

- payment secrets server-side only

- no fake production data

- no hard-coded dependency on a single provider



Do not start another phase automatically.



==================================================

1. SERVICE ARCHITECTURE

==================================================



Create a service abstraction supporting:



ESIM

LOUNGE

CAR_RENTAL

TRANSFER



V1 configuration:



ESIM = ENABLED

LOUNGE = ENABLED



CAR_RENTAL = DISABLED

TRANSFER = DISABLED



The system must allow adding new service types later without rebuilding the entire platform.



==================================================

2. COMMON PRODUCT LAYER

==================================================



Create a reusable common service/product layer.



Do NOT treat every product as an eSIM.



The common layer should support concepts such as:



serviceType

provider

productId

name

status

currency

customer visibility

featured

sort order

sale pricing

provider cost reference

availability

created/updated timestamps



Do NOT force service-specific attributes into this common model.



==================================================

3. ESIM DOMAIN

==================================================



Create a separate eSIM-specific detail model.



Support:



country

country ISO

region

coverage

data GB

validity days

provider bundle ID

provider cost

availability

technical provider metadata



Prepare for:



single-country packages

regional packages

special route packages such as Sıla Yolu

global packages



==================================================

4. LOUNGE DOMAIN

==================================================



Create a separate Lounge-specific detail model.



Support:



airport

IATA code

terminal

lounge name

opening hours

entry duration

amenities

provider lounge/product ID

provider cost

availability



Prepare for multiple lounges at one airport.



==================================================

5. LOCATION ARCHITECTURE

==================================================



Create/reuse clean entities for:



countries

regions

destinations

airports



Do not duplicate the same country or airport for every product.



Examples:



Turkey

Europe

Global



Airport:

Frankfurt

IATA: FRA



==================================================

6. PROVIDER ARCHITECTURE

==================================================



Create a generic provider adapter architecture.



IMPORTANT:



Do NOT hard-code eSIM Go into the core business model.



Architecture:



Provider

→ Provider API Adapter

→ Raw Provider Item

→ Normalizer

→ Internal Catalogue Product

→ Pricing Rules

→ Publish Rules

→ Storefront



Prepare for:



multiple eSIM providers

multiple Lounge providers



==================================================

7. PROVIDER HUB FOUNDATION

==================================================



Prepare architecture for future Admin Provider Hub.



Support:



providers

provider connections

provider sync runs

raw provider catalogue items

provider product mappings

sync errors



Future Provider Hub should show:



connection status

last synchronization

new products

updated products

unavailable products

errors



Do NOT connect real providers in Phase 0.



==================================================

8. DATA OWNERSHIP

==================================================



Clearly separate PROVIDER-OWNED data and ADMIN-OWNED data.



Provider-owned examples:



provider ID

technical bundle data

provider cost

availability

coverage

GB

validity

airport

terminal

opening hours

amenities



Admin-owned examples:



customer sale price

pricing rule

badge

featured

sort order

marketing copy

images

SEO

visibility



Future provider synchronization must NEVER overwrite admin-owned marketing data.



==================================================

9. PRICING FOUNDATION

==================================================



Prepare pricing rules for:



MANUAL PRICE

MARKUP %

FIXED MARKUP

MINIMUM MARGIN

PRICE ROUNDING



Example:



provider cost:

5.13 EUR



pricing logic:

markup



customer price:

9.99 EUR



Do not create fake real-world provider prices.



==================================================

10. ORDERS

==================================================



Create a service-independent order architecture.



One order must later be able to contain:



one eSIM



or



one Lounge booking



or



multiple services



Store purchase-time snapshots:



service type

product name

sale price

provider cost

discount

currency



Historical reporting must not change when current product prices change.



==================================================

11. CUSTOMER TRIPS

==================================================



Create a travel-centric customer model.



Primary concept:



TRIP / SEYAHAT



Example:



Trip:

Istanbul

12–22 July



Services:



eSIM

Lounge



Future:



Car Rental

Transfer



One customer can have multiple trips.

One trip can contain multiple service purchases.



==================================================

12. ESIM CUSTOMER SERVICE

==================================================



Prepare future support for:



owner label

destination

package

status

total data

remaining data

expiry

ICCID

QR

installation information

top-up



Do NOT create real eSIMs in Phase 0.



==================================================

13. LOUNGE CUSTOMER SERVICE

==================================================



Prepare future support for:



airport

terminal

lounge

booking date/time

travelers

booking status

booking reference

voucher / QR



Do NOT create real Lounge bookings in Phase 0.



==================================================

14. CUSTOMER AUTH

==================================================



Roles:



ADMIN

CUSTOMER



Never use:

“first registered account becomes admin”.



Admin privileges must be explicitly assigned.



Protected data must have server-side authorization.



==================================================

15. INTERNATIONALIZATION

==================================================



Prepare:



TR

DE

EN



Default:

TR



All customer-facing CMS content must be translatable later.



==================================================

16. CMS FOUNDATION

==================================================



Prepare architecture so customer-facing presentation can later be controlled from Admin without code.



Future configurable areas:



brand

logo

colors

fonts

Hero

images

CTA

section order

visibility

service content

popular products

badges

campaigns

navigation

support

TR/DE/EN content



Do not build the complete Admin Studio in this phase.



==================================================

17. BUSINESS ANALYTICS FOUNDATION

==================================================



Prepare architecture for future tracking of:



revenue

orders

provider cost

gross profit

service sold

conversion

repeat purchase



Traffic attribution should later support:



utm_source

utm_medium

utm_campaign

utm_content

utm_term



and:



first touch

last touch



Do not insert fake production analytics.



==================================================

18. ROUTES FOUNDATION

==================================================



Prepare clean route structure for:



/

 /esim

 /lounge

 /hesabim

 /hesabim/seyahatler



/admin

/admin/orders

/admin/customers

/admin/products

/admin/providers



Do not unnecessarily build every page yet.



==================================================

19. SECURITY

==================================================



Provider API keys:

SERVER ONLY



Payment secrets:

SERVER ONLY



Never expose secrets in browser bundles.



Do not store secrets in public CMS configuration.



==================================================

20. DATABASE

==================================================



Inspect the database architecture before creating tables.



Create only necessary normalized tables.



Avoid duplicated concepts.



Expected concepts may include:



profiles

user_roles

services

service_products

esim_product_details

lounge_product_details

countries

regions

airports

providers

provider_connections

provider_raw_items

provider_product_mappings

pricing_rules

orders

order_items

customer_trips

customer_trip_services

analytics_events

traffic_attribution



Names may differ if a cleaner structure is used.



==================================================

21. PHASE 0 DO

==================================================



DO:



- establish clean architecture

- create database foundation

- create service abstraction

- create eSIM domain

- create Lounge domain

- prepare provider adapters

- prepare pricing architecture

- prepare order architecture

- prepare trip architecture

- prepare auth/roles

- prepare TR/DE/EN foundation

- prepare CMS architecture

- prepare routes



==================================================

22. PHASE 0 DO NOT

==================================================



DO NOT:



- redesign the full public website

- connect eSIM Go

- connect a Lounge provider

- process payments

- place real provider orders

- generate real QR codes

- implement Car Rental

- implement Transfer

- build fake dashboards with fake production numbers

- automatically start Phase 1



==================================================

23. PASS CRITERIA

==================================================



PHASE 0 is PASS only if:



[ ] Multi-service architecture exists

[ ] eSIM and Lounge are independent service detail models

[ ] Car Rental and Transfer are future-ready but disabled

[ ] Provider adapter architecture exists

[ ] Provider-specific code is not embedded in core domain

[ ] Pricing foundation exists

[ ] Orders use historical snapshots

[ ] Travel/Trip model exists

[ ] ADMIN/CUSTOMER architecture exists

[ ] TR/DE/EN foundation exists

[ ] CMS foundation exists

[ ] Security boundaries exist

[ ] No live provider connection was started

[ ] No unnecessary final UI work was started



==================================================

FINAL REPORT

==================================================



Return only:



STATUS:

PASS / BLOCKED



SERVICE ARCHITECTURE:

PASS / FAIL



ESIM DOMAIN:

PASS / FAIL



LOUNGE DOMAIN:

PASS / FAIL



FUTURE SERVICES:

PASS / FAIL



PROVIDER FOUNDATION:

PASS / FAIL



PRICING FOUNDATION:

PASS / FAIL



ORDER FOUNDATION:

PASS / FAIL



TRIP MODEL:

PASS / FAIL



AUTH & ROLES:

PASS / FAIL



I18N:

PASS / FAIL



CMS FOUNDATION:

PASS / FAIL



SECURITY:

PASS / FAIL



DATABASE TABLES:

-



ROUTES:

-



BLOCKERS:

-



NEXT PHASE:

PHASE 1 — VISUAL SYSTEM + APPROVED UI MIGRATION



DO NOT START PHASE 1.



==================================================

PHASE 0 ADDENDUM — PRODUCTION-GRADE AUTOMATION,

OPERATIONS, FINANCE & ANALYTICS FOUNDATION

==================================================



The architecture must support a global automated travel-commerce

platform, not only a manually managed catalogue.



Do not implement live provider transactions in Phase 0,

but prepare the following foundations correctly.



==================================================

24. PROVIDER SYNC ENGINE

==================================================



Prepare a generic synchronization framework.



Support:



- scheduled catalogue sync

- manual "Sync now"

- provider webhooks

- rate-limit-aware requests

- retry with backoff

- idempotent imports

- duplicate prevention

- sync diff detection

- sync audit logs

- sync errors

- stale item detection



A provider item must have a stable external identifier.



The same provider item must NOT create duplicate internal products

during multiple sync runs.



Never delete historical commercial data because a provider item

disappears.



If a product disappears from the provider catalogue:



mark it unavailable/inactive.



==================================================

25. SYNC RUN MODEL

==================================================



Each provider sync should support:



startedAt

completedAt

status



itemsReceived

itemsCreated

itemsUpdated

itemsUnchanged

itemsUnavailable

itemsFailed



error summary



Admin should later be able to inspect each sync run.



==================================================

26. PROVIDER CAPABILITIES

==================================================



Different providers may support different features.



Prepare provider capability flags such as:



CATALOGUE

REAL_TIME_AVAILABILITY

ORDER

CANCEL

REFUND

QR_OR_VOUCHER

USAGE

TOPUP

WEBHOOKS

BALANCE



Do not assume every provider supports everything.



==================================================

27. PROVIDER ROUTING FOUNDATION

==================================================



Prepare future support for multiple providers offering similar services.



A future routing engine may consider:



availability

provider cost

required margin

provider priority

reliability



Do NOT implement automatic provider switching yet.



Do not couple customer products permanently to one provider

where architecture can avoid it.



==================================================

28. PRODUCT LIFECYCLE

==================================================



Products must support lifecycle states such as:



IMPORTED

DRAFT

READY

PUBLISHED

PAUSED

UNAVAILABLE

ARCHIVED



A newly imported provider item should normally become:



DRAFT



until rules or admin publish it.



==================================================

29. MANUAL OVERRIDES

==================================================



Admin must later be able to override:



visibility

featured state

badge

marketing text

sale pricing

sort order



Provider sync must preserve these values.



==================================================

30. MARGIN PROTECTION

==================================================



Prepare future pricing protection.



Example:



provider cost increases



→ recalculate margin



If margin falls below configured minimum:



flag product



Future rule may:

pause product

or require admin review



Do not silently sell below configured margin.



==================================================

31. ESIM PRODUCT EXTENSIBILITY

==================================================



Prepare eSIM details for optional fields such as:



network/operator

4G/5G capability

hotspot support

data-only

activation policy

validity start rule

APN information

top-up capability

coverage countries



Not every provider must supply every field.



==================================================

32. LOUNGE PRODUCT EXTENSIBILITY

==================================================



Prepare Lounge details for:



airport timezone

terminal

airside / landside

departure eligibility

transit eligibility

arrival eligibility

opening hours

maximum stay

amenities

adult/child rules

minimum age

booking window

boarding pass requirements

cancellation rules

voucher requirements



Not every provider must supply every field.



==================================================

33. REAL-TIME VALIDATION FOUNDATION

==================================================



Catalogue data and transactional availability must be separate concepts.



Prepare future flow:



Catalogue

→ Customer selects product

→ Checkout

→ Provider validation

→ Payment / Order

→ Fulfillment



This is especially important for Lounge availability.



Do NOT perform live provider calls in Phase 0.



==================================================

34. ORDER STATE MACHINES

==================================================



Keep separate status domains.



ORDER STATUS example:



DRAFT

PENDING

CONFIRMED

COMPLETED

CANCELLED

REFUNDED



PAYMENT STATUS:



PENDING

AUTHORIZED

PAID

FAILED

REFUNDED

PARTIALLY_REFUNDED

CHARGEBACK



FULFILLMENT STATUS:



PENDING

PROCESSING

FULFILLED

FAILED

CANCELLED



Do not use one single status field for everything.



==================================================

35. IDEMPOTENCY

==================================================



Prepare idempotency for:



checkout

payment webhook

provider order

provider webhook

fulfillment



The same confirmed payment must NEVER accidentally generate

two eSIMs or two Lounge bookings.



==================================================

36. TRAVELERS

==================================================



Customer and traveler are different concepts.



Prepare traveler entities/profiles.



A customer may book for:



self

partner

child

other traveler



This is useful for:



multiple eSIM owner labels

Lounge traveler counts

future travel services



==================================================

37. GUEST CHECKOUT FOUNDATION

==================================================



Architecturally allow future guest checkout.



Do not require implementation now.



A guest purchase should later be claimable by a customer account

after email verification if product strategy enables this.



==================================================

38. FINANCIAL LEDGER FOUNDATION

==================================================



Prepare reporting fields for:



gross revenue

provider cost

discount

payment fee

refund

chargeback

tax

currency

net contribution



Revenue must never be displayed as profit.



==================================================

39. MULTI-CURRENCY

==================================================



Initial reporting currency may be EUR.



Architecture must remain currency-aware.



Never aggregate mixed currencies without conversion.



Prepare future exchange-rate snapshot support.



==================================================

40. PAYMENT RECONCILIATION

==================================================



Prepare architecture so future payment provider transactions

can be reconciled against orders.



Support references for:



payment transaction

refund

chargeback

provider payout



==================================================

41. PROVIDER RECONCILIATION

==================================================



Prepare future comparison between:



our recorded provider cost/order



and



provider transaction/reference/invoice data



This helps find billing mismatches.



==================================================

42. SALES ANALYTICS DIMENSIONS

==================================================



Analytics architecture must allow reports by:



date

service type

customer country

travel destination

airport

product

provider

traffic source

campaign

language

new vs returning customer



Customer country and travel destination MUST be separate dimensions.



==================================================

43. BUSINESS KPI FOUNDATION

==================================================



Prepare metrics for:



gross revenue

orders

services sold

provider cost

gross profit

payment fees

refunds

average order value

conversion rate

repeat purchase rate



Later optional:



CAC

ROAS

lifetime value



Do not create fake values.



==================================================

44. SERVICE ANALYTICS

==================================================



Reports must support separate analysis for:



ESIM

LOUNGE



Examples:



eSIM:

sales by destination

sales by GB size

top packages

top regions



Lounge:

sales by airport

sales by terminal

top lounges

average travelers per booking



==================================================

45. ATTRIBUTION

==================================================



Prepare traffic attribution for:



GOOGLE_ADS

META

TIKTOK

GOOGLE_ORGANIC

DIRECT

CRM

EMAIL

WHATSAPP

AFFILIATE

PARTNER

UNKNOWN



Store where available:



utm_source

utm_medium

utm_campaign

utm_content

utm_term



and:



firstTouchSource

lastTouchSource



Purchase-time attribution should be snapshotted.



==================================================

46. FINDER ANALYTICS EVENTS

==================================================



Create internal event contracts for:



service_selected



finder_viewed

finder_started



destination_selected

airport_selected



usage_selected

recommendation_viewed



product_selected

checkout_started

purchase_completed



The analytics layer must not depend directly on one external

analytics vendor.



==================================================

47. OPERATIONS / ATTENTION REQUIRED

==================================================



Prepare operational alerts.



Future alert types:



PAID_NOT_FULFILLED

PROVIDER_ERROR

PROVISIONING_DELAYED

WEBHOOK_FAILED

QR_DELIVERY_FAILED

VOUCHER_DELIVERY_FAILED

CATALOGUE_SYNC_FAILED

CATALOGUE_STALE

LOW_PROVIDER_BALANCE

MARGIN_BELOW_MINIMUM

REFUND_REQUEST



Admin dashboard should later have:



"Attention required"



with a count and filtered issue list.



==================================================

48. CANCELLATIONS & REFUNDS

==================================================



Prepare service-specific cancellation/refund architecture.



eSIM rules and Lounge rules may differ.



Support:



requested

approved

rejected

processed



Store reason and audit trail.



==================================================

49. ADMIN AUDIT LOG

==================================================



Track important admin actions later:



price changed

product published

product disabled

provider settings changed

refund initiated

role changed

content published



Record:



admin user

action

entity

before/after where appropriate

timestamp



==================================================

50. CONTENT PUBLICATION

==================================================



Prepare CMS content lifecycle:



DRAFT

PUBLISHED



Where practical prepare:



preview

scheduled publish

rollback/version snapshot



Do not build an enterprise CMS.



==================================================

51. FEATURE FLAGS / KILL SWITCHES

==================================================



Prepare safe feature/service toggles.



Examples:



disable Lounge checkout

disable one provider

disable one destination

pause new eSIM orders



These controls must not require a code deployment.



==================================================

52. OBSERVABILITY

==================================================



Prepare structured server-side logging and health concepts for:



provider API

webhooks

orders

payments

catalogue sync

fulfillment



Never log secrets or sensitive credentials.



==================================================

53. BACKUP & RECOVERY

==================================================



Architecture must support:



database backups

configuration recovery

critical audit/history preservation



Do not rely only on browser state.



==================================================

54. SECURITY EXTENSIONS

==================================================



Prepare for:



server-side authorization

least privilege

encrypted secrets

secret rotation

admin audit trail



Admin 2FA should be architecturally possible later.



==================================================

55. PHASE 0 LIMIT

==================================================



IMPORTANT:



Phase 0 should build FOUNDATION / INTERFACES / SCHEMA only.



Do NOT spend credits implementing:



live provider sync

live payments

live provider orders

live financial reporting

real advertisement APIs



Those belong to later phases.



==================================================

ADDITIONAL PASS CRITERIA

==================================================



PASS only if architecture supports:



[ ] idempotent provider imports

[ ] scheduled and manual synchronization

[ ] retry/error handling foundation

[ ] product lifecycle

[ ] provider capabilities

[ ] real-time validation concept

[ ] separate order/payment/fulfillment status

[ ] transaction idempotency

[ ] traveler model

[ ] financial reporting foundation

[ ] customer country vs destination reporting

[ ] provider-level reporting

[ ] traffic attribution

[ ] service-specific analytics

[ ] operational alerts

[ ] refunds/cancellations

[ ] admin audit log

[ ] feature flags

[ ] backup/recovery foundation

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pasaportio1.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0f8d131d-7438-424e-bdeb-40a342b1acf3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
