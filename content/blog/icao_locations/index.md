+++
title = "ICAO location codes"
date = 2021-09-05T15:11:42-04:00
description = "What they are and where to get them."
[taxonomies]
tags = ["weather", "maps"]
+++

[METAR](https://en.wikipedia.org/wiki/METAR) is a common weather report format used by airports around the world.

Each station has a unique four letter location code assigned by the [International Civil Aviation Organization (ICAO)](https://en.wikipedia.org/wiki/International_Civil_Aviation_Organization).
The first letter identifies which part of the world the station is in. For instance, all codes beginning with K are within the continental United States.

![Mercator projection map of world regions classified according to the first letter or two of the ICAO location code](ICAO_FirstLetter.svg)
_Hytar [CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0), via Wikimedia Commons_

Now you might ask: given an ICAO location code, how do I find the station it corresponds to?
ICAO provides a list of all the assigned codes in [Doc 7910](https://store.icao.int/en/location-indicators-doc-7910): a $257 PDF.
Programmatic access to the [API for Doc 7910](https://applications.icao.int/dataservices/default.aspx) costs at least $400 :money_mouth_face:

Fortunately, there is a much more cost effective (read: free) alternative. Greg Thompson maintains a comprehensive list of stations: [stations.txt](https://weather.rap.ucar.edu/surface/stations.txt).
The format is pretty straightforward:

```
...
WASHINGTON         21-OCT-20
CD  STATION         ICAO  IATA  SYNOP   LAT     LONG   ELEV   M  N  V  U  A  C
WA SEATTLE/METRO    KSEA  SEA   72793  47 27N  122 19W  115   X     U     A    0 US
...
```

The file is split into sections by US state, Canadian province, and other countries.
Each 83-character entry contains a station's:

- Name
- Country
- Province/State if any
- [ICAO code](https://en.wikipedia.org/wiki/ICAO_airport_code) if assigned
- [IATA code](https://en.wikipedia.org/wiki/International_Air_Transport_Association_code) if assigned
- Location
- Elevation
- Capabilities & Type (i.e. whether it is a METAR reporting station)

I've mapped the stations with [OpenLayers](https://openlayers.github.io) below:

<div id="map" class="ol-map"></div>
<div id="popup" class="ol-popup">
    <a href="#" id="popup-closer" class="ol-popup-closer"></a>
    <div id="popup-content"></div>
</div>
<script src="https://cdn.polyfill.io/v2/polyfill.min.js?features=requestAnimationFrame,Element.prototype.classList"></script>
<script src="https://cdn.jsdelivr.net/npm/ol@v7.1.0/dist/ol.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.1.0/ol.css">
<script type="text/javascript" src="station_map.js"></script>

Click on a station for its name, location, and ICAO + IATA codes.
