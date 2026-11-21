# Zewnętrzne API – ściąga

Wszystkie zapytania to `GET`, bez kluczy. Przykładowe odpowiedzi (17.11.2026, Poznań) są w `server/test/fixtures/`.

## Open-Meteo – prognoza + 14 dni wstecz

```
https://api.open-meteo.com/v1/forecast?latitude=52.40&longitude=16.92&daily=precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&hourly=soil_moisture_3_to_9cm,soil_moisture_27_to_81cm&past_days=14&forecast_days=7&timezone=Europe/Warsaw&wind_speed_unit=kmh
```

- `daily.*`: tablice równoległe do `daily.time`. Jednostki w `daily_units`.
- `hourly.soil_moisture_*` w m³/m³. **Używaj tylko bieżącej godziny**, bo dalej są skoki przy zmianie modelu.

## Open-Meteo – archiwum (tryb demo)

```
https://archive-api.open-meteo.com/v1/archive?latitude=52.40&longitude=16.92&start_date=2015-07-25&end_date=2015-08-14&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&hourly=soil_moisture_7_to_28cm,soil_moisture_28_to_100cm&timezone=Europe/Warsaw&wind_speed_unit=kmh
```

ERA5 ma inne warstwy gleby (`0_to_7`, `7_to_28`, `28_to_100`, `100_to_255`) i nie ma `precipitation_probability_max`.

## IMGW-PIB

| Endpoint | Co zwraca | Uwagi |
|---|---|---|
| `https://danepubliczne.imgw.pl/api/data/synop` | ~62 stacje, ostatni pomiar | brak współrzędnych, liczby jako stringi, `null` |
| `https://danepubliczne.imgw.pl/api/data/synop/station/poznan` | jedna stacja | nazwa małymi literami, bez polskich znaków (np. `poznan`) |
| `https://danepubliczne.imgw.pl/api/data/warningsmeteo` | ostrzeżenia meteo | `teryt`: tablica 4-cyfrowych kodów powiatów, czas lokalny `YYYY-MM-DD HH:MM:SS` |
| `https://danepubliczne.imgw.pl/api/data/hydro` | stany wód | nieużywane |

## ULDK (GUGiK)

```
https://uldk.gugik.gov.pl/?request=GetCommuneByXY&xy=16.92,52.40,4326&result=teryt,commune,county,voivodeship
```

Odpowiedź tekstowa:

```
0
306401_1|Poznań (miasto)|powiat Poznań|wielkopolskie
```

Linia 1 to status (`0` = OK, `-1` = błąd). Kod powiatu to pierwsze 4 znaki TERYT.

Działka (niezweryfikowane):

```
https://uldk.gugik.gov.pl/?request=GetParcelByXY&xy=16.92,52.40,4326&result=id,parcel,region,geom_wkt&srid=4326
```

## Nasze API

```
GET /api/health
GET /api/meta                       -> { soils[], scenarios[] }
GET /api/report?lat&lon&soil[&scenario]
```

## Nowe źródła (21.11.2026, fixtury w `server/test/fixtures/`)

| Źródło | Zapytanie | Uwagi |
|---|---|---|
| ULDK działka po ID | `?request=GetParcelById&id=302502_2.0009.387&result=id,parcel,region,commune,county,voivodeship,geom_wkt&srid=4326` | 1. linia `0` = OK, `-1 brak wyników` |
| ULDK obręb + numer | `?request=GetParcelByIdOrNr&id=Sulęcin 387&result=...` | 1. linia = liczba wyników, potem po jednej działce w linii |
| IUNG kategorie gleb | `https://sgeo.iung.pl/geoserver/Susza/wms?REQUEST=GetFeatureInfo&LAYERS=Susza:katgl_landuse2024&SRS=EPSG:2180&...&INFO_FORMAT=application/json` | `properties.GRAY_INDEX`; legenda przez GetLegendGraphic |
| IUNG progi KBW | `https://susza.iung.pulawy.pl/progi/` (HTML) | przetworzone do `server/src/data/iungKbw.js` |
| NMT GUGiK | `https://services.gugik.gov.pl/nmt/?request=GetHByPointList&list=x y,x y` | PUWG 1992, `x` = północ; odpowiedź `x y h,x y h` |
| SoilGrids | `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=&lat=&property=clay&...&depth=0-5cm&...&value=mean` | wartość / `d_factor`; bywa wolne (~16 s) |
| NASA POWER | `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN&community=AG&...` | `-999` = brak; brak ET0 |
| Sentinel-2 STAC | `POST https://earth-search.aws.element84.com/v1/search` | duplikaty scen (`_0`/`_1`), COG Deflate + predyktor 2, kafle 512/1024 |
| IMGW hydro | `https://danepubliczne.imgw.pl/api/data/hydro`, `/warningshydro` | hydro ma `lat`/`lon`; ostrzeżenia po województwie i kodach zlewni |
| Overpass | `POST https://overpass-api.de/api/interpreter` | `out tags geom` |
