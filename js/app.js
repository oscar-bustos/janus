document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar instancias de ECharts
    const mainChart = echarts.init(document.getElementById('main-chart'));
    const sentimentChart = echarts.init(document.getElementById('sentiment-chart'));

    // Redimensionar gráficos al cambiar el tamaño de la ventana
    window.addEventListener('resize', () => {
        mainChart.resize();
        sentimentChart.resize();
    });

    try {
        // En una app real de GitHub Pages, la ruta sería relativa a la raíz del repo
        const response = await fetch('data/market_data.json');
        const data = await response.json();
        
        // Actualizar UI con metadatos
        document.getElementById('last-updated').textContent = new Date(data.metadata.last_updated).toLocaleString();
        document.getElementById('model-version').textContent = data.metadata.model_version;

        // Extraer series de tiempo
        const seriesData = data.timeseries;
        const dates = seriesData.map(item => item.date);
        
        // Formato para Candlestick: [Open, Close, Lowest, Highest] (Note the order for echarts: [open, close, low, high])
        const ohlcData = seriesData.map(item => [item.open, item.close, item.low, item.high]);
        const volumeData = seriesData.map((item, index) => [index, item.volume, item.close > item.open ? 1 : -1]);
        const smaData = seriesData.map(item => item.sma_20);
        const predictionData = seriesData.map(item => item.ml_prediction);
        const sentimentData = seriesData.map(item => item.sentiment);

        // Actualizar KPIs (último día)
        const lastDay = seriesData[seriesData.length - 1];
        const prevDay = seriesData[seriesData.length - 2];
        
        const priceEl = document.getElementById('current-price');
        priceEl.textContent = `$${lastDay.close.toFixed(2)}`;
        priceEl.className = `metric-value ${lastDay.close >= prevDay.close ? 'positive' : 'negative'}`;

        const predEl = document.getElementById('predicted-price');
        predEl.textContent = `$${lastDay.ml_prediction.toFixed(2)}`;
        predEl.className = `metric-value ${lastDay.ml_prediction >= lastDay.close ? 'positive' : 'negative'}`;

        const sentEl = document.getElementById('current-sentiment');
        const sentScore = lastDay.sentiment;
        sentEl.textContent = `${(sentScore > 0 ? '+' : '')}${sentScore.toFixed(2)}`;
        sentEl.className = `metric-value ${sentScore > 0 ? 'positive' : (sentScore < 0 ? 'negative' : 'neutral')}`;

        document.getElementById('current-volume').textContent = (lastDay.volume / 1000000).toFixed(2) + 'M';

        // Configuración Chart Principal (Candlestick + Lineas)
        const mainOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                backgroundColor: 'rgba(24, 27, 38, 0.9)',
                borderColor: '#3b82f6',
                textStyle: { color: '#fff' }
            },
            legend: {
                data: ['OHLC', 'SMA 20', 'ML Prediction'],
                textStyle: { color: '#94a3b8' },
                top: 0
            },
            grid: {
                left: '3%', right: '3%', bottom: '5%', top: '10%', containLabel: true
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                axisLabel: { color: '#94a3b8' }
            },
            yAxis: {
                type: 'value',
                scale: true,
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: { color: '#94a3b8' }
            },
            dataZoom: [
                { type: 'inside', start: 50, end: 100 },
                { show: true, type: 'slider', bottom: '0%', textStyle: {color: '#94a3b8'} }
            ],
            series: [
                {
                    name: 'OHLC',
                    type: 'candlestick',
                    data: ohlcData,
                    itemStyle: {
                        color: '#10b981', color0: '#ef4444',
                        borderColor: '#10b981', borderColor0: '#ef4444'
                    }
                },
                {
                    name: 'SMA 20',
                    type: 'line',
                    data: smaData,
                    smooth: true,
                    lineStyle: { color: '#f59e0b', width: 2 },
                    symbol: 'none'
                },
                {
                    name: 'ML Prediction',
                    type: 'line',
                    data: predictionData,
                    smooth: true,
                    lineStyle: { color: '#3b82f6', width: 2, type: 'dashed' },
                    symbol: 'none'
                }
            ]
        };

        // Configuración Chart Secundario (Sentimiento)
        const sentimentOption = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(24, 27, 38, 0.9)',
                textStyle: { color: '#fff' }
            },
            grid: {
                left: '3%', right: '3%', bottom: '5%', top: '5%', containLabel: true
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                axisLabel: { color: '#94a3b8' }
            },
            yAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: { color: '#94a3b8' },
                min: -1, max: 1
            },
            series: [
                {
                    name: 'Sentimiento Social',
                    type: 'bar',
                    data: sentimentData.map(val => {
                        return {
                            value: val,
                            itemStyle: {
                                color: val > 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
                            }
                        };
                    })
                }
            ]
        };

        mainChart.setOption(mainOption);
        sentimentChart.setOption(sentimentOption);

    } catch (error) {
        console.error("Error al cargar los datos:", error);
    }
});
