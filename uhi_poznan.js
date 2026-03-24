/**
 * Analiza Temperatury Powierzchni Ziemi (LST) i Miejskiej Wyspy Ciepła (MWC)
 * Obszar analizy: Poznań, Polska
 * Źródło danych: Landsat 8 (C02/T1_L2) oraz ESA WorldCover 2021
 */

//
// 1. PARAMETRY ANALIZY
//
var targetCity = "Poznan";
var dateStart = "2024-05-01";
var dateEnd = "2024-06-30";
var exportFileName = "lst_poznan_2024";

var aoi = ee.FeatureCollection("FAO/GAUL/2015/level2")
  .filter(ee.Filter.eq("ADM2_NAME", targetCity));

Map.addLayer(aoi, {}, 'AOI - ' + targetCity);
Map.centerObject(aoi, 11);

//
// 2. FUNKCJE POMOCNICZE (PRZETWARZANIE OBRAZÓW)
//

function applyScaleFactors(image) {
  var opticalBands = image.select("SR_B.*").multiply(0.0000275).add(-0.2);
  var thermalBands = image.select("ST_B.*").multiply(0.00341802).add(149.0);
  
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

function maskClouds(image) {
  var cloudShadowBitmask = (1 << 3);
  var cloudBitmask = (1 << 5);
  var qa = image.select('QA_PIXEL');

  var mask = qa.bitwiseAnd(cloudShadowBitmask).eq(0)
               .and(qa.bitwiseAnd(cloudBitmask).eq(0));

  return image.updateMask(mask);
}

//
// 3. POBRANIE I FILTROWANIE DANYCH
//

var landsatCol = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
  .filterBounds(aoi)
  .filterDate(dateStart, dateEnd)
  .map(applyScaleFactors)
  .map(maskClouds);

var medianImage = landsatCol.median().clip(aoi);

var landCover = ee.Image("ESA/WorldCover/v200/2021").select("Map").clip(aoi);

//
// 4. WYLICZENIE WSKAŹNIKÓW (NDVI, FV, EM, LST)
// 

var ndvi = medianImage.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');

var ndviStats = ndvi.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: aoi,
  scale: 30,
  maxPixels: 1e9
});
var ndviMin = ee.Number(ndviStats.get('NDVI_min'));
var ndviMax = ee.Number(ndviStats.get('NDVI_max'));

var fv = ((ndvi.subtract(ndviMin)).divide(ndviMax.subtract(ndviMin))).pow(2).rename('FV');

var em = fv.multiply(0.004).add(0.986).rename('EM');

var thermalBand = medianImage.select('ST_B10').rename('thermal');

var lst = thermalBand.expression(
  '(TB / (1 + (0.00115 * (TB / 1.438)) * log(em))) - 273.15', {
    'TB': thermalBand.select('thermal'),
    'em': em
  }).rename('LST');

var lstStats = lst.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: aoi,
  scale: 30,
  maxPixels: 1e9
});
print("Min LST:", lstStats.get('LST_min'));
print("Max LST:", lstStats.get('LST_max'));

//
// 5. ANALIZA STATYSTYCZNA W OPARCIU O POKRYCIE TERENU
// 

var combinedLST_LC = lst.addBands(landCover.rename("land_class"));

var zonalStats = combinedLST_LC.reduceRegion({
  reducer: ee.Reducer.mean().group({
    groupField: 1,
    groupName: "land_class"
  }),
  geometry: aoi,
  scale: 100,
  maxPixels: 1e9
});

var lcDict = ee.Dictionary({
  10: "Lasy",
  20: "Zarośla",
  30: "Trawiaste tereny",
  40: "Grunty uprawne",
  50: "Obszary zabudowane",
  60: "Nieużytki / skąpa roślinność",
  70: "Śnieg i lód",
  80: "Stałe zbiorniki wodne",
  90: "Zielne tereny podmokłe",
  95: "Namorzyny",
  100: "Mech i porosty"
});

var chartFeatures = ee.List(zonalStats.get("groups")).map(function(item) {
  var dict = ee.Dictionary(item);
  var classCode = ee.Number(dict.get("land_class")).toInt();
  var className = lcDict.get(classCode, "Nieznana klasa");

  return ee.Feature(null, {
    "land_class": ee.String(className),
    "temperature": dict.get("mean")
  });
});

// 
// 6. WIZUALIZACJA
// 

// RGB
Map.addLayer(medianImage, {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0.0, max: 0.15}, 'Landsat RGB', false);

// Pokrycie terenu
Map.addLayer(landCover, {bands: ['Map']}, 'ESA WorldCover', false);

// NDVI
Map.addLayer(ndvi, {min: -1, max: 1, palette: ['blue', 'white', 'green']}, 'NDVI', false);

// LST (Mapa Ciepła)
var lstPalette = [
  '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
  '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
  '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
  'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
  'ff0000', 'de0101', 'c21301', 'a71001', '911003'
];
Map.addLayer(lst, {min: 15, max: 45, palette: lstPalette}, 'LST Map');

var lstChart = ui.Chart.feature.byFeature({
  features: ee.FeatureCollection(chartFeatures),
  xProperty: "land_class",
  yProperties: ["temperature"]
}).setChartType("ColumnChart")
  .setOptions({
    title: "Średnia temperatura (LST) wg klas pokrycia terenu - " + targetCity,
    hAxis: { title: "Klasa pokrycia terenu", slantedText: true },
    vAxis: { 
      title: "Temperatura (°C)",
      viewWindow: { min: 20, max: 36 },
      ticks: [20, 22, 24, 26, 28, 30, 32, 34, 36]
    },
    legend: { position: "none" },
    colors: ["#d95f02"]
  });

print(lstChart);

//
// 7. EKSPORT DANYCH DO GOOGLE DRIVE
//

Export.image.toDrive({
  image: lst,
  description: exportFileName,
  folder: "GEE_Exports",
  region: aoi,
  scale: 30,
  fileFormat: 'GeoTiff',
  maxPixels: 1e13
});