# Christmas Is Loading… Europe's Christmas markets, 2026

**#30DayMapChallenge 2026 · Day 7 · 10 minute map · Europe**
Live: https://barisparlatangiller.github.io/30DMC26-D07-10MinuteMap-Europe-Christmas-Markets/

The map shows 1,265 Christmas markets from OpenStreetMap (`xmas:feature=market`) on a 2026 calendar. Move the slider or press play, and the markets light up on the days they are open. The "loading" bar shows how close the selected day is to the busiest day of the season. The page was made in under 10 minutes.

## Dates
`pipeline/build.py` reads the free-text tag `xmas:day_date`, which comes in many formats, and sorts each market into one of four groups:

* **checked**: 7 large markets whose 2026 dates were checked with the organiser or city on 6 Nov 2026 (`VERIFIED` in the script, sources linked on the map). The markets are Nürnberg, Vienna Rathausplatz, Munich Marienplatz, Stuttgart, Salzburg, Aachen and Heidelberg. The Heidelberg dates come from local press.
* **dated for 2026**: OSM already has 2026 dates.
* **yearly date**: OSM has a date range without a year, applied to 2026.
* **estimated from an earlier year**: only a 2010–2025 date exists in OSM. The estimate keeps the weekday the market opened on (a Friday stays a Friday). Fixed closing days such as 23 or 24 December stay as they are.
* **no date**: the market appears on the map but not on the calendar.

Each market also gets a country and the nearest town from Natural Earth 1:10m. All other dates were not checked against the organisers. OSM does not include every market in Europe.

Data © OpenStreetMap contributors (ODbL), export of 6 Nov 2026. The basemap is CARTO Dark Matter, recoloured for Christmas.

Barış Parlatangiller · built with Claude
