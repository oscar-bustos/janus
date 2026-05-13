# Plan y Análisis de Requerimientos - Experimento 5 (Hierarchical Social Indicators)

Basado en el documento proporcionado, a continuación se detallan los requerimientos extraídos para implementar y reproducir la metodología del estudio.

## 1. Objetivo Principal
Desarrollar y evaluar una metodología predictiva para 62 índices bursátiles globales que combine datos técnicos tradicionales con una estructura jerárquica de datos sociales (Twitter) en tres niveles: Global, País e Índice. El objetivo es comprobar si esta jerarquía aporta un poder predictivo complementario al análisis técnico.

## 2. Requerimientos de Datos (Data Acquisition)

### 2.1 Datos Sociales (Twitter)
- **Fuente**: Twitter Full-Archive API v2 (endpoint *Tweet Counts*).
- **Período**: 1 de enero de 2017 a 31 de julio de 2022.
- **Niveles Jerárquicos**:
  1. **Nivel Global**: Volumen total diario de tweets (consulta base sin filtros).
  2. **Nivel País**: Tweets filtrados por origen usando el operador `place_country` para 52 países.
  3. **Nivel Índice**: Tweets filtrados por *cashtag* (ej. `$SPX`) para discusiones específicas sobre 62 índices.

### 2.2 Datos Financieros (Mercado Bursátil)
- **Fuente**: Histórico de precios de cierre (investing.com).
- **Muestra**: 62 índices de 52 países.
- **Período**: 1 de enero de 2017 a 31 de julio de 2022 (sincronizado con los datos de Twitter).

## 3. Procesamiento de Datos (Data Processing)

### 3.1 Análisis de Sentimiento (Polaridad)
- **Método**: Conteo heurístico basado en emojis.
- **Lógica**:
  - *Positivo*: Mensaje cuenta con al menos un emoji del conjunto definido como positivo.
  - *Negativo*: Mensaje cuenta con al menos un emoji del conjunto definido como negativo.

### 3.2 Indicadores Jerárquicos Sociales (Features a construir)
Para cada día, se deben calcular los siguientes agregados:
- **World Sentiment (Global)**:
  - `WORLD_POS`: Conteo diario de tweets globales con emojis positivos.
  - `WORLD_NEG`: Conteo diario de tweets globales con emojis negativos.
  - `WORLD_EV` (Emoji Volume): `WORLD_POS + WORLD_NEG`
  - `WORLD_PSM` (Positive Sentiment Mean): `WORLD_POS / WORLD_EV`
  - `WORLD_NSM` (Negative Sentiment Mean): `WORLD_NEG / WORLD_EV`
  - `WORLD_SM` (Sentiment Mean): `(WORLD_POS - WORLD_NEG) / WORLD_EV`
- **Country Sentiment (País)**:
  - `COUNTRY_POS`, `COUNTRY_NEG`, `COUNTRY_EV`, `COUNTRY_PSM`, `COUNTRY_NSM`, `COUNTRY_SM` (calculados igual que el nivel Global, pero filtrados por el país anfitrión del índice).
  - `COUNTRY_TV` (Twitter Volume): Volumen total de tweets del país.
- **Index Sentiment (Índice)**:
  - `INDEX_TV`: Volumen total de tweets usando el cashtag específico del índice (nota: sin polaridad a este nivel por limitaciones de datos originales).

### 3.3 Indicadores Técnicos
A partir del precio de cierre del índice, calcular:
- Media Móvil Simple (SMA)
- Media Móvil Ponderada (WMA)
- Oscilador Estocástico (K% y D%)
- Índice de Fuerza Relativa (RSI)
- Convergencia/Divergencia de Medias Móviles (MACD)
- Rango Porcentual de Williams (W%R)
- Momentum (MOM)

### 3.4 Estimación de Eficiencia del Mercado (Opcional/Análisis)
- Ventana móvil de 252 días (recalculada mensualmente).
- Métricas: Hurst Exponent (H), Genton Fractal Dimension (FD), Hall-Wood Fractal Dimension.

## 4. Modelado Predictivo (Machine Learning)

### 4.1 Preparación de Datos
- **Variable Objetivo (Target)**: Clasificación binaria `UP_DOWN` (1 si el retorno del precio del día siguiente es positivo, 0 si es negativo o cero).
- **División de Datos (Train/Test Split)**: 
  - Entrenamiento: 70% cronológico inicial.
  - Prueba (Hold-out): 30% cronológico final.
- **Escalado**: Transformar las características al rango `[0, 1]` usando `MinMaxScaler` (Ajustado/Fit exclusivamente en el conjunto de entrenamiento para evitar *data leakage*).

### 4.2 Entrenamiento y Algoritmos
- Entrenar un **modelo independiente** para cada uno de los 62 índices.
- Evaluar los siguientes 7 algoritmos:
  1. Naive Bayes (NB)
  2. Regresión Logística (LR)
  3. Support Vector Machines (SVM)
  4. Random Forest (RF)
  5. Gradient Boosted Trees (GB)
  6. Multilayer Perceptron (MLP / ANN)
  7. Long Short-Term Memory (LSTM)

### 4.3 Ajuste de Hiperparámetros
- **Método**: Búsqueda aleatoria (`RandomizedSearchCV` con 100 combinaciones).
- **Validación Cruzada**: `TimeSeriesSplit` con 5 divisiones (crucial para series de tiempo).
- **Métrica de Optimización**: `F1-score` para balancear precisión y recall.

## 5. Evaluación y Experimentación Requerida
Una vez entrenados, el sistema debe ser capaz de reportar:
1. **Causalidad de Granger**: Validar si las series sociales tienen causalidad temporal sobre los precios del índice.
2. **Métricas de Rendimiento**: Reportar `Accuracy` y `MCC` (Matthews Correlation Coefficient) en el test set.
3. **Importancia de Variables (Feature Importance)**: Ejecutar pruebas de permutación (Permutation Feature Importance) para identificar qué variables aportaron realmente al modelo (técnicas vs. sociales).
4. **Relación Eficiencia vs Predictibilidad**: Correlacionar los estimadores de eficiencia de mercado (Hurst, FD) con el rendimiento (MCC) del modelo final.

---
**Siguientes pasos sugeridos para iterar:**
- Definir qué tecnologías usaremos para la ingesta y procesamiento (¿Python, Pandas, Scikit-learn, TensorFlow/Keras?).
- Determinar si implementaremos este *pipeline* de procesamiento como un proceso de backend (como se habló en previas conversaciones) generando JSON estáticos, o cómo será la arquitectura de software.
- Validar si tenemos la base de datos de precios y tweets disponible, o si hay que construir un flujo de descarga simulado/real.
