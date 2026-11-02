# SustainableDataCenter

Research project of University of Pittsburgh, with Prof. Palanisamy.

The current slice is an Allegheny County data center map.

A county map of existing, planned, and proposed data centers in Allegheny County, Pennsylvania. Select a facility for the basic brief: place, companies, capacity when it is published, and the PA DEP permit file when one exists.

Click a neighborhood or municipality, or pick one from Places, for the zoning rule that applies there and for bedrock, elevation, and the flood zone at the pin. Pittsburgh uses the city’s 90 official neighborhoods. The rest of the county uses municipal boundaries, because those governments write the zoning.

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
- An empty public-opinion section

Permit rows come from the [PA DEP Data Center Permit Tracker](https://gis.dep.pa.gov/DataCenterPermitTracker/) project and permit tables, retrieved October 31, 2026. Facility names, operators, and the two published capacity figures come from public facility pages such as the [Dynamo Springdale](https://trackdatacenters.com/usa/pennsylvania/data-centers/dynamo-springdale) brief. This app is not a DEP product.

ServaxNet New Castle is left off the map. Statewide lists sometimes file it under Allegheny County, but the published pin is in New Castle, Lawrence County.

Pins that share one published coordinate are nudged apart so each can be selected. The detail page keeps the published coordinate.

## What a place page shows

- The Pittsburgh neighborhood, or the municipality outside the city
- The county rule for county-owned property: large-load data centers of 25 megawatts or more are prohibited there. Private land follows the municipality.
- The municipal data-center zoning note from the [Pennsylvania Data Center Ordinance Project](https://padatacenterordinances.org/), verified October 28, 2026, with the source that review used
- Facilities from this map that fall inside the area
- Bedrock units from [Macrostrat](https://macrostrat.org/), ground elevation from USGS 3DEP, and the flood zone from the FEMA National Flood Hazard Layer, read at the pin

Neighborhood boundaries are the City of Pittsburgh file on the [Western Pennsylvania Regional Data Center](https://data.wprdc.org/dataset/neighborhoods2). Municipal boundaries are the [Allegheny County municipal boundary file](https://data.wprdc.org/dataset/allegheny-county-municipal-boundaries), reprojected from Pennsylvania State Plane South. `scripts/build-places.py` rebuilds those files and needs `pyproj`.

Springdale’s conditional-use approval for 151 Porter Street is taken from the county land-development review, not from the ordinance table. The table still lists no named data-center use there.
