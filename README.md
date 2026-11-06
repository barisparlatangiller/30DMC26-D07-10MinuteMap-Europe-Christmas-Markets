# Christmas Is Loading… Europe's Christmas markets, 2026

**#30DayMapChallenge 2026 · Day 7 · 10 minute map · Europe**
Live: https://barisparlatangiller.github.io/30DMC26-D07-10MinuteMap-Europe-Christmas-Markets/

The map shows 1,265 Christmas markets from OpenStreetMap (`xmas:feature=market`) on a 2026 calendar. Move the slider or press play, and the markets light up on the days they are open. The "loading" bar shows how close the selected day is to the busiest day of the season. The page was made in under 10 minutes.

## Dates
`pipeline/build.py` reads the free-text tag `xmas:day_date`, which comes in many formats, and sorts each market into one of four groups:

* **dated for 2026**: OSM already has 2026 dates.
* **yearly date**: OSM has a date range without a year, applied to 2026.
* **estimated from an earlier year**: only a 2010–2025 date exists in OSM. The same calendar days are shown for 2026.
* **no date**: the market appears on the map but not on the calendar.

None of the dates were checked against the organisers. OSM does not include every market in Europe.

Data © OpenStreetMap contributors (ODbL), export of 6 Nov 2026. The basemap is CARTO Dark Matter, recoloured for Christmas.

Barış Parlatangiller · built with Claude
