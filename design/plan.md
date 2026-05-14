# Diseño de la Interfaz de Usuario (Dashboard UI/UX)

El frontend (actualmente construido con HTML, CSS, y ECharts) integrará visualmente el modelo predictivo final utilizando un diseño inspirado en plataformas financieras profesionales (como Yahoo Finance), estructurado en 3 pestañas principales.

> **Arquitectura de Datos:** Se espera que un servicio externo o pipeline backend actualice periódicamente el archivo `data.json`, el cual sirve como única fuente de datos para este dashboard estático.

## 1. Tab 1: Visión Global
- **Market Correlation Network**: Grafo de nodos mostrando las correlaciones entre los índices globales.
- **Market Efficiency Scatter**: Gráfico de dispersión del Exponente de Hurst vs Genton FD para identificar índices ineficientes.

## 2. Tab 2: Detalle de Índice (Inspirado en Yahoo Finance)
- **KPI Header (Hero Section)**: Cabecera destacada con el último precio de cierre, cambio diario absoluto/porcentual y métricas clave en tiempo real.
- **Social Mood Gauge**: Un indicador visual (Bullish vs Bearish) junto a la etiqueta de predicción, que traduce la puntuación abstracta de sentimiento social en el "humor" del mercado.
- **Interactive Timeseries Chart**: Gráfico principal de velas japonesas (Price) con:
  - **Botones de temporalidad**: Filtros rápidos para hacer zoom (1M, 6M, 1Y, COVID-Crash, Max).
  - **Indicadores Técnicos (Overlays/Subcharts)**: Superposición de medias móviles (SMA) en el precio y paneles inferiores separados para osciladores (MACD, RSI).
  - **Event Annotations**: Marcadores interactivos (hitos) en días de ruido social anómalo para dar contexto de los eventos del mundo real.
- **Market Statistics Panel**: Tarjeta lateral ("Summary") mostrando estadísticas fundamentales históricas derivadas del estudio (Volatilidad CV%, Desviación Min/Max, Volumen Medio Diario de Tweets).
- **Rolling Market Efficiency**: Gráfico de líneas que ilustra cómo cambia el Exponente de Hurst y Fractal Dimension en una ventana de 252 días sobre el tiempo.

## 3. Tab 3: Explicabilidad
- **Hierarchical Social Volume**: Gráfico comparativo logarítmico para visibilizar la diferencia crítica de magnitud entre los tweets a nivel Mundo/País y el ruido específico del *cashtag*.
- **Technical vs Social Split**: Gráfico de dona (Donut chart) que divide el peso de la predicción final.
- **Feature Contributions**: Gráfico de barras mostrando la importancia de cada variable (Feature Importance), resaltando cómo el modelo se inclina en los indicadores técnicos para tomar la decisión.
