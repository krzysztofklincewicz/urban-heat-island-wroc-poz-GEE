# Urban Heat Island (UHI) & Land Surface Temperature (LST) Analysis

This project provides an automated script for Google Earth Engine (GEE) to process satellite imagery and estimate Land Surface Temperature (LST) while analyzing the Urban Heat Island (UHI) effect.

The script enables fast generation of thermal maps and basic statistical analysis for any selected city.

---

## Project Overview

The main objectives of this script are:

- Generate a high-resolution thermal map (GeoTIFF) for any city  
- Perform statistical analysis by comparing mean LST across land cover classes  
- Create a clear bar chart for easy interpretation of results  

---

## Features

- Automated LST calculation using Landsat 8 imagery  
- Cloud masking and radiometric scaling (Collection 2 compliant)  
- NDVI-based emissivity correction  
- Integration with ESA WorldCover land classification  
- Statistical comparison of temperature across land cover types  
- Export results as GeoTIFF  
- Automatic chart generation in GEE console  

---

## Data Sources

### 1. Landsat 8 (C02/T1_L2)
- Optical bands → used for NDVI calculation  
- Thermal band (Band 10) → used for temperature retrieval  
- Cloud masking using QA_PIXEL  
- Scaling factors applied according to Collection 2 standards  

### 2. ESA WorldCover 2021 (v200)
- Land cover data at 10 m resolution  
- Used to classify the study area into categories (e.g., built-up, vegetation, water)  

---

## Methodology

The algorithm converts raw satellite data into Land Surface Temperature (LST) using the following steps:

1. NDVI (Normalized Difference Vegetation Index) – vegetation indicator  
2. FV (Fractional Vegetation) – proportion of vegetation per pixel  
3. EM (Emissivity) – surface emissivity estimation  
4. LST (Land Surface Temperature) – calculated using a single-channel algorithm based on the Planck equation with emissivity correction  

---

## Output

- GeoTIFF raster of Land Surface Temperature  
- Mean LST values for each land cover class  
- Bar chart visualization (exportable as PNG/SVG from GEE console)  

---

## Usage

1. Copy the `.js` script into the Google Earth Engine Code Editor  
   https://earthengine.google.com/

2. In the PARAMETERS section, modify:
   - `targetCity` – city name (in English, based on FAO GAUL dataset)  
   - `dateStart` / `dateEnd` – analysis time range  
     (recommended: May–August for best UHI visibility)  
   - `exportFileName` – name of the output file  

3. Click Run  

4. In the Tasks tab:
   - Export the GeoTIFF to Google Drive  
   - The statistical chart will be generated automatically in the console  
   - You can download it as PNG/SVG  

---

## Notes

- Best results are obtained during summer months due to stronger UHI effects  
- Cloud-free imagery is crucial for accurate temperature estimation  
- The script is designed for quick analysis but can be extended for time-series studies  

---
