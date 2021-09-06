ol.proj.useGeographic();

const map = new ol.Map({
  target: "map",
  controls: ol.control
    .defaults({ attributionOptions: { collapsible: true } })
    .extend([new ol.control.FullScreen()]),
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM(),
    }),
  ],
  view: new ol.View({
    center: [0, 0],
    zoom: 1,
  }),
});

const vectorSource = new ol.source.Vector({
  features: [],
  attributions: "&copy; <a href='https://www.linkedin.com/in/greg-thompson-6b29763/' target='_blank'>Greg Thompson</a>. &copy; <a href='#'>Sameer Puri</a>.",
});

fetch("stations.tsv")
  .then((res) => res.text())
  .then((text) => {
    const features = [];
    const lines = text.split("\n");
    for (let i = 1; i < lines.length; i++) {
      const [
        station,
        pos,
        icao,
        iata,
        synop,
        elevation,
        country_code,
        province,
        priority,
      ] = lines[i].split("\t");
      let [latitude, longitude] = pos.split(" ");
      features.push(
        new ol.Feature({
          geometry: new ol.geom.Point(
            ol.proj.fromLonLat([parseFloat(longitude), parseFloat(latitude)])
          ),
        })
      );
    }
    vectorSource.addFeatures(features);
  });

map.addLayer(
  new ol.layer.WebGLPoints({
    source: vectorSource,
    style: {
      symbol: {
        symbolType: "circle",
        size: 8,
        color: "rgba(0,0,255,0.5)",
      },
    },
  })
);
