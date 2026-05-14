// Chart Instances
let networkChart, efficiencyChart, priceChart, sentimentChart, shapChart, moodGaugeChart, rollingEfficiencyChart, hierarchyChart, treemapChart;
let globalData = null;

// Initialize ECharts instances
function initCharts() {
    networkChart = echarts.init(document.getElementById('correlationChart'), 'dark');
    efficiencyChart = echarts.init(document.getElementById('efficiencyChart'), 'dark');
    treemapChart = echarts.init(document.getElementById('treemapChart'), 'dark');
    priceChart = echarts.init(document.getElementById('priceChart'), 'dark');
    sentimentChart = echarts.init(document.getElementById('sentimentChart'), 'dark');
    shapChart = echarts.init(document.getElementById('shapChart'), 'dark');
    moodGaugeChart = echarts.init(document.getElementById('moodGaugeChart'), 'dark');
    rollingEfficiencyChart = echarts.init(document.getElementById('rollingEfficiencyChart'), 'dark');
    hierarchyChart = echarts.init(document.getElementById('hierarchyChart'), 'dark');

    // Handle resize
    window.addEventListener('resize', resizeCharts);

    // Tab Logic
    setupTabs();
    setupTimeframes();
}

function resizeCharts() {
    networkChart.resize();
    efficiencyChart.resize();
    treemapChart.resize();
    priceChart.resize();
    sentimentChart.resize();
    shapChart.resize();
    moodGaugeChart.resize();
    rollingEfficiencyChart.resize();
    hierarchyChart.resize();
}

function setupTabs() {
    const buttons = document.querySelectorAll('.tab-button');
    const panes = document.querySelectorAll('.tab-pane');
    const searchContainer = document.getElementById('globalSearch');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            buttons.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            
            // Add active to selected
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Handle Search Bar visibility
            if (targetId === 'tab-1') {
                searchContainer.style.display = 'none';
            } else {
                searchContainer.style.display = 'block';
            }

            // Force resize of charts since display changed
            setTimeout(resizeCharts, 50);
        });
    });
}

function setupTimeframes() {
    const buttons = document.querySelectorAll('.tf-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            buttons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const days = e.target.getAttribute('data-days');
            
            let start = 0;
            if (days !== 'all') {
                const totalDays = globalData.market_data[document.getElementById('assetSelector').value].timeseries.length;
                start = Math.max(0, 100 - (parseInt(days) / totalDays * 100));
            }
            priceChart.dispatchAction({ type: 'dataZoom', start: start, end: 100 });
            sentimentChart.dispatchAction({ type: 'dataZoom', start: start, end: 100 });
        });
    });
}

// Fetch and load data
async function loadData() {
    try {
        const response = await fetch('data.json');
        globalData = await response.json();
        
        populateSelector();
        renderTreemap();
        renderNetworkGraph();
        renderEfficiencyChart();
        
        // Initial selection
        const initialAsset = Object.keys(globalData.market_data)[0];
        updateAssetView(initialAsset);
        
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Populate the select dropdown
function populateSelector() {
    const selector = document.getElementById('assetSelector');
    selector.innerHTML = '';
    
    for (const [key, asset] of Object.entries(globalData.market_data)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        selector.appendChild(option);
    }

    selector.addEventListener('change', (e) => {
        updateAssetView(e.target.value);
    });
}

// Update charts specific to an asset
function updateAssetView(assetKey) {
    const assetData = globalData.market_data[assetKey];
    if (!assetData) return;

    // Update all span elements with the active asset name
    document.querySelectorAll('.activeAssetName').forEach(el => {
        el.textContent = assetData.info.name;
    });

    updateKPIs(assetData);
    updateMarketStats(assetData);
    renderTimeseries(assetData.timeseries);
    renderPrediction(assetData.prediction);
    renderMoodGauge(assetData.prediction);
    renderRollingEfficiency(assetData.timeseries);
    renderHierarchy(assetData.timeseries);
    renderCorrelations(assetKey);
    
    highlightNetworkNode(assetKey);
    highlightEfficiencyPoint(assetKey);
}

function getNextTradingDay(dateString) {
    const d = new Date(dateString + 'T00:00:00'); // ensure local time doesn't shift day
    d.setDate(d.getDate() + 1);
    // If Saturday (6), add 2 days to get to Monday (1)
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    // If Sunday (0), add 1 day to get to Monday (1)
    else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('es-ES', options);
}

function updateKPIs(assetData) {
    const ts = assetData.timeseries;
    const latest = ts[ts.length - 1];
    const prev = ts[ts.length - 2] || latest;

    const closePrice = latest.close.toFixed(2);
    const change = (latest.close - prev.close);
    const changePct = ((change / prev.close) * 100).toFixed(2);
    
    document.getElementById('kpiClose').textContent = closePrice;
    
    const changeEl = document.getElementById('kpiChange');
    changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePct}%)`;
    changeEl.className = 'kpi-value ' + (change >= 0 ? 'up' : 'down');

    const socChange = latest.index_tv - prev.index_tv;
    const socChangePct = prev.index_tv > 0 ? ((socChange / prev.index_tv) * 100).toFixed(1) : 0;
    const socEl = document.getElementById('kpiSocial');
    socEl.textContent = `${socChange > 0 ? '+' : ''}${socChangePct}%`;
    socEl.className = 'kpi-value ' + (socChange >= 0 ? 'up' : 'down');

    // Date logic
    const latestDateStr = latest.date;
    const nextDayFormatted = getNextTradingDay(latestDateStr);

    if (document.getElementById('lastCloseDate')) {
        document.getElementById('lastCloseDate').textContent = latestDateStr;
    }
    if (document.getElementById('targetDateTab2')) {
        document.getElementById('targetDateTab2').textContent = `Target: ${nextDayFormatted}`;
    }
    if (document.getElementById('targetDateTab3')) {
        document.getElementById('targetDateTab3').textContent = `Target: ${nextDayFormatted}`;
    }
}

function updateMarketStats(assetData) {
    if(!assetData.market_stats) return;
    document.getElementById('statVol').textContent = assetData.market_stats.volatility_cv + "%";
    document.getElementById('statMinDev').textContent = assetData.market_stats.min_dev + "%";
    document.getElementById('statMaxDev').textContent = "+" + assetData.market_stats.max_dev + "%";
    document.getElementById('statTweets').textContent = assetData.market_stats.avg_daily_tweets.toLocaleString();
}

// 0. Treemap Chart
function renderTreemap() {
    const data = [];
    let latestDate = '--';

    for (const [key, asset] of Object.entries(globalData.market_data)) {
        const ts = asset.timeseries;
        if (!ts || ts.length === 0) continue;
        
        const latest = ts[ts.length - 1];
        const prev = ts.length > 1 ? ts[ts.length - 2] : latest;
        const change = (latest.close - prev.close);
        const changePct = prev.close !== 0 ? (change / prev.close) * 100 : 0;
        
        latestDate = latest.date;

        data.push({
            name: asset.info.name || key,
            value: asset.market_stats ? asset.market_stats.avg_daily_tweets || 100 : 100,
            itemStyle: {
                color: changePct >= 0 ? '#10b981' : '#ef4444' // up-color : down-color
            },
            changePct: changePct.toFixed(2)
        });
    }
    
    const dateEl = document.getElementById('globalDate');
    if(dateEl) {
        dateEl.textContent = 'Fecha: ' + latestDate;
    }

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            formatter: function (info) {
                const change = info.data.changePct;
                return [
                    '<strong>' + info.name + '</strong>',
                    'Cambio: ' + (change >= 0 ? '+' : '') + change + '%'
                ].join('<br>');
            }
        },
        series: [{
            type: 'treemap',
            data: data,
            roam: false,
            label: {
                show: true,
                formatter: function (info) {
                    return info.name + '\n' + (info.data.changePct >= 0 ? '+' : '') + info.data.changePct + '%';
                }
            },
            itemStyle: {
                borderColor: '#0b0f19',
                borderWidth: 2,
                gapWidth: 2
            }
        }]
    };

    treemapChart.setOption(option);
}

// 1. Market Correlation Network
function renderNetworkGraph() {
    const data = globalData.market_correlation;
    
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            formatter: '{b}'
        },
        series: [{
            type: 'graph',
            layout: 'force',
            data: data.nodes.map(n => {
                let nodeColor = '#94a3b8';
                if (globalData.market_data[n.id]) {
                    const forecast = globalData.market_data[n.id].prediction.forecast;
                    nodeColor = forecast === 'UP' ? '#10b981' : '#ef4444';
                }
                
                return {
                    id: n.id,
                    name: n.id,
                    symbolSize: n.symbolSize || 20,
                    itemStyle: {
                        color: nodeColor
                    }
                };
            }),
            links: data.links,
            roam: true,
            label: {
                show: true,
                position: 'right',
                color: '#fff'
            },
            force: {
                repulsion: 200,
                edgeLength: [50, 150]
            },
            lineStyle: {
                color: 'source',
                curveness: 0.3,
                opacity: 0.7
            }
        }]
    };
    networkChart.setOption(option);
}

function highlightNetworkNode(assetKey) {
    networkChart.dispatchAction({
        type: 'highlight',
        name: assetKey
    });
}

// 2. Market Efficiency Scatter
function renderEfficiencyChart() {
    const scatterData = [];
    for (const [key, asset] of Object.entries(globalData.market_data)) {
        scatterData.push({
            name: key,
            value: [asset.efficiency.hurst, asset.efficiency.genton],
            itemStyle: {
                color: asset.efficiency.hurst > 0.5 ? '#ef4444' : '#10b981'
            }
        });
    }

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            formatter: (params) => {
                return `${params.data.name}<br/>Hurst: ${params.value[0]}<br/>FD: ${params.value[1]}`;
            }
        },
        xAxis: {
            name: 'Hurst Exponent (H)',
            nameLocation: 'middle',
            nameGap: 30,
            type: 'value',
            min: 0.4,
            max: 0.9,
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        yAxis: {
            name: 'Genton FD',
            nameLocation: 'middle',
            nameGap: 40,
            type: 'value',
            min: 1.0,
            max: 1.7,
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        series: [{
            symbolSize: 20,
            data: scatterData,
            type: 'scatter',
            markLine: {
                lineStyle: { type: 'dashed', color: '#94a3b8' },
                data: [
                    { xAxis: 0.5, name: 'Efficiency Baseline' }
                ]
            }
        }]
    };
    efficiencyChart.setOption(option);
}

function highlightEfficiencyPoint(assetKey) {
}

// 3. Timeseries (Candlestick + Social + Technical)
function renderTimeseries(timeseries) {
    const dates = timeseries.map(t => t.date);
    const candleData = timeseries.map(t => [t.open, t.close, t.low, t.high]);
    const volData = timeseries.map(t => t.index_tv);
    const sentData = timeseries.map(t => t.country_neg_sentiment);

    const markPointData = [];
    timeseries.forEach((t, i) => {
        if(t.event) {
            markPointData.push({
                name: 'Event',
                coord: [t.date, t.high],
                value: t.event,
                itemStyle: { color: '#fbbf24' }
            });
        }
    });

    const priceOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        grid: { left: '10%', right: '5%', bottom: '15%', top: '10%' },
        xAxis: {
            type: 'category',
            data: dates,
            scale: true,
            boundaryGap: false,
            axisLine: { onZero: false },
            splitLine: { show: false }
        },
        yAxis: {
            scale: true,
            splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)','rgba(255,255,255,0.05)'] } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        dataZoom: [
            { type: 'inside', start: 0, end: 100 }
        ],
        series: [
            {
                name: 'Price',
                type: 'candlestick',
                data: candleData,
                itemStyle: {
                    color: '#10b981',
                    color0: '#ef4444',
                    borderColor: '#10b981',
                    borderColor0: '#ef4444'
                },
                markPoint: {
                    data: markPointData,
                    label: { show: false },
                    tooltip: { formatter: '{c}' },
                    symbol: 'pin',
                    symbolSize: 40
                }
            },
            {
                name: 'SMA',
                type: 'line',
                data: timeseries.map(t => t.index_sma),
                itemStyle: { color: '#3b82f6' },
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 2, opacity: 0.8 }
            }
        ]
    };
    priceChart.setOption(priceOption);

    const sentimentOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        grid: [
            { left: '10%', right: '5%', top: '5%', height: '35%' },
            { left: '10%', right: '5%', top: '50%', height: '35%' }
        ],
        xAxis: [
            { type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false }, axisTick: { show: false } },
            { type: 'category', data: dates, gridIndex: 1, axisLabel: { show: false }, axisTick: { show: false } }
        ],
        yAxis: [
            { type: 'value', name: 'Vol', gridIndex: 0, splitLine: { show: false }, axisLabel: { show: false } },
            { type: 'value', name: 'Sent', gridIndex: 0, splitLine: { show: false }, axisLabel: { show: false } },
            { type: 'value', name: 'MACD', gridIndex: 1, splitLine: { show: false }, axisLabel: { show: false } },
            { type: 'value', name: 'RSI', gridIndex: 1, splitLine: { show: false }, axisLabel: { show: false } }
        ],
        dataZoom: [
            { type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100 }
        ],
        series: [
            { name: 'Index Vol', type: 'bar', xAxisIndex: 0, yAxisIndex: 0, data: volData, itemStyle: { color: '#8b5cf6', opacity: 0.6 } },
            { name: 'Neg Sentiment', type: 'line', xAxisIndex: 0, yAxisIndex: 1, data: sentData, itemStyle: { color: '#ef4444' } },
            { name: 'MACD', type: 'bar', xAxisIndex: 1, yAxisIndex: 2, data: timeseries.map(t => t.index_macd), itemStyle: { color: '#3b82f6' } },
            { name: 'RSI', type: 'line', xAxisIndex: 1, yAxisIndex: 3, data: timeseries.map(t => t.index_rsi), itemStyle: { color: '#10b981' } }
        ]
    };
    sentimentChart.setOption(sentimentOption);

    // Sync charts
    echarts.connect([priceChart, sentimentChart]);
}

// 4. Prediction & Explainability
function renderPrediction(prediction) {
    // Tab 2 prediction card
    const badge = document.getElementById('predictionBadge');
    badge.textContent = prediction.forecast;
    badge.className = 'prediction-badge ' + prediction.forecast.toLowerCase();
    document.getElementById('predictionProb').textContent = Math.round(prediction.probability * 100) + '%';

    // Tab 3 prediction card
    const tab3Badge = document.getElementById('tab3PredictionBadge');
    if (tab3Badge) {
        tab3Badge.textContent = prediction.forecast;
        tab3Badge.className = 'prediction-badge ' + prediction.forecast.toLowerCase();
        document.getElementById('tab3PredictionProb').textContent = Math.round(prediction.probability * 100) + '%';
        document.getElementById('tab3Confidence').textContent = prediction.probability > 0.7 ? 'Alta' : 'Media';
    }

    const features = prediction.feature_contributions.sort((a, b) => Math.abs(a.weight) - Math.abs(b.weight));
    const names = features.map(f => f.feature);
    const values = features.map(f => f.weight);
    
    let totalShap = 0;
    features.forEach(f => {
        totalShap += f.weight;
    });

    if (document.getElementById('tab3TotalShap')) {
        document.getElementById('tab3TotalShap').textContent = totalShap.toFixed(3);
        const primary = [...features].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0];
        document.getElementById('tab3PrimaryDriver').textContent = primary ? primary.feature : '--';
    }

    const shapOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '30%', right: '10%', bottom: '10%', top: '10%' },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }, axisLabel: { color: '#94a3b8' } },
        yAxis: { type: 'category', data: names, axisLabel: { color: '#94a3b8' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } } },
        series: [
            {
                name: 'SHAP Value',
                type: 'bar',
                data: values.map((v, i) => ({
                    value: v,
                    itemStyle: { color: v > 0 ? '#10b981' : '#ef4444' }
                })),
                label: {
                    show: true,
                    position: 'right',
                    formatter: (params) => params.value > 0 ? `+${params.value.toFixed(2)}` : params.value.toFixed(2),
                    color: '#fff',
                    fontSize: 10
                }
            }
        ]
    };
    if (shapChart) {
        shapChart.setOption(shapOption);
    }
}

function renderMoodGauge(prediction) {
    if (!prediction.social_mood) return;
    const isBullish = prediction.social_mood === 'Bullish';
    const score = isBullish ? 0.8 : 0.2; 

    const option = {
        backgroundColor: 'transparent',
        series: [{
            type: 'gauge',
            startAngle: 180,
            endAngle: 0,
            min: 0,
            max: 1,
            splitNumber: 2,
            axisLine: {
                lineStyle: {
                    width: 10,
                    color: [
                        [0.5, '#ef4444'],
                        [1, '#10b981']
                    ]
                }
            },
            pointer: {
                icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                length: '60%',
                width: 6,
                itemStyle: { color: 'auto' }
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: { show: false },
            detail: {
                fontSize: 14,
                offsetCenter: [0, '20%'],
                formatter: function () {
                    return prediction.social_mood;
                },
                color: 'inherit'
            },
            data: [{ value: score }]
        }]
    };
    moodGaugeChart.setOption(option);
}

function renderRollingEfficiency(timeseries) {
    const dates = timeseries.map(t => t.date);
    const hurst = timeseries.map(t => t.rolling_hurst);
    const fd = timeseries.map(t => t.rolling_fd);

    const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        grid: { left: '15%', right: '15%', bottom: '20%', top: '10%' },
        xAxis: { type: 'category', data: dates, show: false },
        yAxis: [
            { type: 'value', position: 'left', min: 0.4, max: 0.9, splitLine: { show: false }, axisLabel: {color: '#8b5cf6', fontSize: 10} },
            { type: 'value', position: 'right', min: 1.0, max: 1.8, splitLine: { show: false }, axisLabel: {color: '#3b82f6', fontSize: 10} }
        ],
        series: [
            { name: 'Hurst', type: 'line', data: hurst, itemStyle: {color: '#8b5cf6'}, showSymbol: false, smooth: true },
            { name: 'FD', type: 'line', yAxisIndex: 1, data: fd, itemStyle: {color: '#3b82f6'}, showSymbol: false, smooth: true }
        ]
    };
    rollingEfficiencyChart.setOption(option);
}

function renderHierarchy(timeseries) {
    const slice = timeseries.slice(-30);
    const avgWorld = slice.reduce((a, b) => a + (b.world_tv || 0), 0) / slice.length;
    const avgCountry = slice.reduce((a, b) => a + (b.country_tv || 0), 0) / slice.length;
    const avgIndex = slice.reduce((a, b) => a + (b.index_tv || 0), 0) / slice.length;

    const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '20%', right: '10%', bottom: '15%', top: '10%' },
        xAxis: {
            type: 'log',
            name: 'Log Volume',
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisLabel: { formatter: '{value}' }
        },
        yAxis: {
            type: 'category',
            data: ['World', 'Country', 'Index'],
            axisLabel: { color: '#94a3b8' }
        },
        series: [
            {
                type: 'bar',
                data: [
                    {value: avgWorld, itemStyle: {color: '#3b82f6'}},
                    {value: avgCountry, itemStyle: {color: '#c084fc'}},
                    {value: avgIndex, itemStyle: {color: '#10b981'}}
                ],
                label: { show: true, position: 'right', formatter: (params) => Math.round(params.value).toLocaleString(), color: '#fff' }
            }
        ]
    };
    hierarchyChart.setOption(option);
}

// 5. Correlation List
function renderCorrelations(assetKey) {
    const listContainer = document.getElementById('correlationsList');
    listContainer.innerHTML = '';

    const links = globalData.market_correlation.links;
    let assetLinks = [];

    links.forEach(l => {
        if (l.source === assetKey) assetLinks.push({ target: l.target, value: l.value });
        if (l.target === assetKey) assetLinks.push({ target: l.source, value: l.value });
    });

    if (assetLinks.length === 0) {
        listContainer.innerHTML = '<p style="color:var(--text-secondary)">No correlation data available.</p>';
        return;
    }

    assetLinks.sort((a, b) => b.value - a.value);

    assetLinks.forEach(link => {
        const item = document.createElement('div');
        const typeClass = link.value >= 0.5 ? 'positive' : 'negative';
        item.className = `corr-item ${typeClass}`;
        
        let targetName = link.target;
        if (globalData.market_data[link.target]) {
            targetName = globalData.market_data[link.target].info.name;
        }

        item.innerHTML = `
            <span class="corr-asset">${targetName}</span>
            <span class="corr-value">${link.value.toFixed(2)}</span>
        `;
        listContainer.appendChild(item);
    });
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    loadData();
});
