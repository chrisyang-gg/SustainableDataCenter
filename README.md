# SustainableDataCenter

Research project of University of Pittsburgh, with Prof. Palanisamy.

The current slice is an Allegheny County data center map.

A county map of existing, planned, and proposed data centers in Allegheny County, Pennsylvania. Select a facility for the basic brief: place, companies, capacity when it is published, and the PA DEP permit file when one exists.

Click a neighborhood or municipality, or pick one from Places, for the zoning rule that applies there and for bedrock, elevation, flood, and nearby water at the pin. A parcel ID search on Projects or Places looks up the Allegheny County PIN and opens the area that contains that parcel. What-if is a separate tab: a click asks whether to build a data center there, and yes calculates noise, generator exhaust, cooling water, and feeder load at the nearest residential building. Pittsburgh uses the city’s 90 official neighborhoods. The rest of the county uses municipal boundaries, because those governments write the zoning.

Each area is colored from that zoning note. Green means the review found data centers permitted in at least one district. Yellow means the use is conditional, still a draft, or not named. Red means the ordinance blocks unlisted uses. A floodway or a mapped landslide deposit can make one pin stricter than the area color. Green is a reminder from the published review, not a permit.

Public opinion is a placeholder. Hearing minutes, comments, and a local stance are not collected yet.

This slice stays inside Allegheny County. It does not score a site or write a recommendation.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

```bash
npm test
npm run lint
```

## What a facility page shows

- Location, coordinates, and alternate names
- Companies, and capacity or acreage when a public project note states them
- PA DEP project name and permit rows: authorization, application type, number, submitted date, and status
- News stories that name that facility. If none was found, the page says so
- Distance to the nearest residential building, then noise, water, electricity, and air. A published study is shown when one names a number. Otherwise the same screens as What-if run at the published megawatts. A site with no published load is left unestimated
- An empty public-opinion section

Permit rows come from the [PA DEP Data Center Permit Tracker](https://gis.dep.pa.gov/DataCenterPermitTracker/) project and permit tables, retrieved October 31, 2026. Facility names, operators, and the two published capacity figures come from public facility pages such as the [Dynamo Springdale](https://trackdatacenters.com/usa/pennsylvania/data-centers/dynamo-springdale) brief. This app is not a DEP product.

ServaxNet New Castle is left off the map. Statewide lists sometimes file it under Allegheny County, but the published pin is in New Castle, Lawrence County.

Pins that share one published coordinate are nudged apart so each can be selected. The detail page keeps the published coordinate.

## What the What-if tab estimates

A click drops a pin and asks whether to build a data center there. Yes holds the chosen load, 5, 25, or 100 megawatts. 25 megawatts is the county large-load line. The distance that matters is the distance to the nearest residential building in the Allegheny County building file (feature code 210).

Noise at that building uses ISO 9613-2 geometrical divergence, `20 log10(d) + 11`, plus 0.002 dB per meter. The source is 108 dBA per cooling-tower cell, from the East Whiteland Township data-center noise study, with one cell per 2.5 MW so 25 MW matches that study’s 10-cell bank. If the level runs all night, the day-night level is about 6.4 dB higher. The decision line is the EPA 1974 outdoor level of 55 dBA Ldn.

Air at that building splits the backup load into 3 MW diesel stacks. Stack diameter, exit speed, and exhaust temperature come from the McLaren data center plume assessment (0.51 m, 59.2 m/s, 751 K), and the physical stack is 13.8 m. Briggs buoyant rise, the EPA ISC3 neutral-air formula, lifts each plume in a 2 m/s wind. Urban Briggs class D curves then give the ground-level centerline. If the homes are closer than the highest ground-level point, the screen uses that point, because the exhaust is still overhead at the house. Every running stack is added on the same centerline, which is higher than a yard that spreads the stacks. The emission rate is EPA AP-42 section 3.4 for uncontrolled large diesel engines, sized to the full load for one hour, with all NOx counted as NO₂. The decision line is the EPA 1-hour NO₂ standard, 100 ppb (188 µg/m³).

Water is the on-site cooling withdrawal from the LBNL 2024 averages (PUE 1.4, site WUE 0.36 L/kWh), stated as a share of the nearest USGS gage. A fresh discharge is used when the gage published one in the last 14 days. Otherwise the share uses that gage’s long-term mean for the same calendar day. Electricity is the load divided by 6 MVA, the top of the 4 to 6 MVA peak EPRI reports for most 15 kV neighborhood feeders. EPRI describes that peak as load the feeder already serves, and says maximum capacity is higher and depends on conductor size and length. A load above 6 MVA is scored as more than the neighborhood feeder can carry. A smaller load stays unscored, because no hosting-capacity figure is published at the pin. The same card gives the distance to the nearest in-service transmission line on the PASDA 2025 HIFLD layer. That line is not the neighborhood feeder and is not unused capacity. Water support compares the cooling estimate with the nearest gage using Richter et al. 2012: a daily alteration above 20% is past their water-supply planning line, and 10% is their high-protection band. The same block checks the estimate against the 10,000 and 100,000 gallon-a-day registration lines in 25 Pa. Code § 110.201. Remaining treatment and pipe capacity for the local water utility is not in a public layer, so the municipal system is left unscored. The framing follows Ngata, Bashir, and Westerlaken, “The Cloud Next Door,” ACM COMPASS 2025. None of these figures is a permit or a monitor reading.

The same estimate then lists siting rules. 44 CFR 60.3 stops a new building in a mapped floodway unless a no-rise analysis is accepted, and it treats a 1% floodplain as a design condition. NIST SP 800-53 PE-23 and ISO/IEC 27001:2022 Annex A 7.5 require the location plan to account for flood and other environmental hazards, including a mapped landslide deposit. TIA-942-C is named because its rated design includes site-selection risk, but the setback distances stay in the paid standard, so the pin is not given a rating. SOC 2, PCI DSS, and the HIPAA Security Rule are listed as customer requirements the coordinate does not decide. A row is not a certification. A potential violation is named only for the flood rule: a mapped floodway, or a 1% floodplain if the building would sit below the base flood elevation. A noise or one-hour NO₂ screen above its published level is a potential exceedance, because the screen is not a monitor. A landslide deposit is a control gap under PE-23, not a violation by itself.

## Data center simulator

The Simulator tab separates design inputs from the map and What-if review. Four profiles replace the previous size presets. Selecting a profile restores reference PUE and site WUE while preserving facility MW, cooling choice, and other design inputs. AI is a workload profile that can occur in hyperscale or colocation facilities, not a mutually exclusive size threshold.

`lib/lbnl-simulator.ts` records the central 2023 category values (medians) from [LBNL's 2024 report, Figure 4.5, p. 47](https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report_1.pdf#page=47). SMB maps to its broader Small group; SPs maps to Midsize and Colo. These modeled values reflect the category's cooling-system and location mixtures, not a measurement of the proposed facility.

| Profile | Report group | PUE | Site WUE (L/IT-kWh) | Fixed UPS range (Table 4.3, p. 43) |
| --- | --- | --- | --- | --- |
| SMB | Small | 1.91 | 0.32 | 77–85% |
| SPs (medium scale) | Midsize and Colo | 1.68 | 0.67 | 80–94% |
| Hyperscale | Hyperscale | 1.22 | 0.32 | 90–99% |
| AI-centered | AI Specialized | 1.14 | 0.61 | 90–99% |

UPS efficiency is a read-only range, because Table 4.3 supplies ranges rather than single values. UPS losses are already in PUE and are not multiplied into energy again. PUE and WUE remain editable for a design-specific estimate. Nine cooling families follow Table 4.2 (pp. 40–42). Selecting a cooling family records the design and explains its operation; it does not invent a scalar efficiency correction or set tower count. Reproducing cooling-specific PUE/WUE would require the report's hourly thermal simulation and climate/operating inputs, beyond these category references.

`simulateDataCenter` in `lib/simulator.ts` computes:

- Facility electricity (kWh/year) = operating facility MW × annual hours × 1,000.
- IT electricity = facility electricity / PUE; infrastructure = facility minus IT electricity.
- Direct consumption (L/year) = IT electricity × site WUE. Divide by 3.785411784 and 365 for annual-average US gal/day.
- Electricity-associated off-site water = facility electricity × 4.52 L/kWh; combined water is direct plus off-site water.

The water equation rearranges the original WUE definition in [The Green Grid (2011), White Paper 35, p. 6, equation (2)](https://www.thegreengrid.org/system/files/store/WUE_v1.pdf#page=6). Equations (3)–(4) support the combined boundary: source WUE = site WUE + PUE × energy-water intensity. LBNL's consumption-based data supply the inputs; this does not equate consumption with utility withdrawal. The 4.52 L/kWh input is the report's **2023 U.S. data-center electricity-mix proxy** (p. 57), not a local measurement, forecast, or marginal water factor. The 2011 paper's older grid factor is not used. Off-site water is excluded from the local water-price scenario.

Noise retains the ISO 9613-2 tower-cell screen. Air retains the one-hour diesel plume screen, with entered exhaust height and backup share. The feeder comparison retains the 6 MVA reference. Site area is displayed without an acreage-derived impact. Price increments remain illustrative proportional app assumptions using historical utility/rate baselines, not price forecasts. Only direct on-site water enters the water-price calculation.

Every impact has **Calculation & references**, with implemented equations, worked values from a normalized input snapshot, specific source pages, and limitations. The parameter guide maps each control to its actual effect. `lib/simulator-methodology.ts` records source roles, reviewed November 23, 2026. Run model checks with `node --import tsx --test lib/*.test.ts` and `npx tsc --noEmit`.

## What a place page shows

- A parcel ID lookup against the Allegheny County parcel map. The PIN and the dashed map-block-lot both work
- The Pittsburgh neighborhood, or the municipality outside the city
- The county rule for county-owned property: large-load data centers of 25 megawatts or more are prohibited there. Private land follows the municipality.
- The municipal data-center zoning note from the [Pennsylvania Data Center Ordinance Project](https://padatacenterordinances.org/), verified October 28, 2026, with the source that review used
- Facilities from this map that fall inside the area
- Bedrock units from [Macrostrat](https://macrostrat.org/), ground elevation from USGS 3DEP, and the flood zone from the FEMA National Flood Hazard Layer, read at the pin
- Nearby water from the USGS National Hydrography Dataset and active USGS stream and groundwater sites. A gage reading is not a cooling-water supply or a withdrawal permit

Neighborhood boundaries are the City of Pittsburgh file on the [Western Pennsylvania Regional Data Center](https://data.wprdc.org/dataset/neighborhoods2). Municipal boundaries are the [Allegheny County municipal boundary file](https://data.wprdc.org/dataset/allegheny-county-municipal-boundaries), reprojected from Pennsylvania State Plane South. `scripts/build-places.py` rebuilds those files and needs `pyproj`.

Springdale’s conditional-use approval for 151 Porter Street is taken from the county land-development review, not from the ordinance table. The table still lists no named data-center use there.
