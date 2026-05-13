// Chart Instances
let networkChart, efficiencyChart, priceChart, sentimentChart, splitChart, featureChart;
let globalData = null;

// Initialize ECharts instances
function initCharts() {
    networkChart = echarts.init(document.getElementById('correlationChart'), 'dark');
    efficiencyChart = echarts.init(document.getElementById('efficiencyChart'), 'dark');
    priceChart = echarts.init(document.getElementById('priceChart'), 'dark');
    sentimentChart = echarts.init(document.getElementById('sentimentChart'), 'dark');
    splitChart = echarts.init(document.getElementById('splitChart'), 'dark');
    featureChart = echarts.init(document.getElementById('featureImportanceChart'), 'dark');

    // Handle resize
    window.addEventListener('resize', resizeCharts);

    // Tab Logic
    setupTabs();
}

function resizeCharts() {
    networkChart.resize();
    efficiencyChart.resize();
    priceChart.resize();
    sentimentChart.resize();
    splitChart.resize();
    featureChart.resize();
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

// Fetch and load data
async function loadData() {
    try {
        const response = await fetch('data.json');
        globalData = await response.json();
        
        populateSelector();
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

    renderTimeseries(assetData.timeseries);
    renderPrediction(assetData.prediction);
    renderCorrelations(assetKey);
    
    // Highlight node in network graph
    highlightNetworkNode(assetKey);
    // Highlight point in efficiency scatter
    highlightEfficiencyPoint(assetKey);
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
                // Determine color based on prediction
                let nodeColor = '#94a3b8'; // default gray
                if (globalData.market_data[n.id]) {
                    const forecast = globalData.market_data[n.id].prediction.forecast;
                    nodeColor = forecast === 'UP' ? '#10b981' : '#ef4444'; // Green if up, Red if down
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
    // Simple highlight by re-setting option with emphasis
    networkChart.dispatchAction({
        type: 'highlight',
        name: assetKey
    });
}

// 2. Market Efficiency Scatter
function renderEfficiencyChart() {
    // Extract efficiency data
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
    // Echarts dispatch action to highlight point
}

// 3. Timeseries (Candlestick + Social)
function renderTimeseries(timeseries) {
    const dates = timeseries.map(t => t.date);
    const candleData = timeseries.map(t => [t.open, t.close, t.low, t.high]);
    const volData = timeseries.map(t => t.index_tv);
    const sentData = timeseries.map(t => t.country_neg_sentiment);

    // Candlestick Chart
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
                }
            }
        ]
    };
    priceChart.setOption(priceOption);

    // Social Footer Chart
    const sentimentOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        grid: { left: '10%', right: '5%', bottom: '20%', top: '10%' },
        xAxis: {
            type: 'category',
            data: dates,
            axisLabel: { show: false },
            axisTick: { show: false }
        },
        yAxis: [
            {
                type: 'value',
                name: 'Index TV',
                splitLine: { show: false },
                axisLabel: { color: '#8b5cf6' }
            },
            {
                type: 'value',
                name: 'Neg. Sentiment',
                splitLine: { show: false },
                axisLabel: { color: '#ef4444' }
            }
        ],
        series: [
            {
                name: 'Index Vol',
                type: 'bar',
                data: volData,
                itemStyle: { color: '#8b5cf6', opacity: 0.6 }
            },
            {
                name: 'Neg Sentiment',
                type: 'line',
                yAxisIndex: 1,
                data: sentData,
                itemStyle: { color: '#ef4444' },
                lineStyle: { width: 2 }
            }
        ]
    };
    sentimentChart.setOption(sentimentOption);

    // Sync charts
    echarts.connect([priceChart, sentimentChart]);
}

// 4. Prediction & Explainability
function renderPrediction(prediction) {
    const badge = document.getElementById('predictionBadge');
    badge.textContent = prediction.forecast;
    badge.className = 'prediction-badge ' + prediction.forecast.toLowerCase();
    
    document.getElementById('predictionProb').textContent = Math.round(prediction.probability * 100) + '%';

    const features = prediction.feature_contributions.sort((a, b) => Math.abs(a.weight) - Math.abs(b.weight));
    const names = features.map(f => f.feature);
    const values = features.map(f => f.weight);
    
    // Calculate split
    let techSum = 0;
    let socSum = 0;
    features.forEach(f => {
        if (f.category === 'technical') {
            techSum += Math.abs(f.weight);
        } else {
            socSum += Math.abs(f.weight);
        }
    });

    // Render Split Donut Chart
    const splitOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item' },
        legend: { top: '5%', left: 'center', textStyle: { color: '#f8fafc' } },
        series: [
            {
                name: 'Contribution',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 5,
                    borderColor: '#0b0f19',
                    borderWidth: 2
                },
                label: { show: false },
                data: [
                    { value: techSum, name: 'Technical', itemStyle: { color: '#3b82f6' } },
                    { value: socSum, name: 'Social', itemStyle: { color: '#c084fc' } }
                ]
            }
        ]
    };
    splitChart.setOption(splitOption);

    // Render Feature Bar Chart
    const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '30%', right: '5%', bottom: '10%', top: '5%' },
        xAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        yAxis: {
            type: 'category',
            data: names,
            axisLabel: { color: '#94a3b8' }
        },
        series: [
            {
                name: 'Contribution',
                type: 'bar',
                data: values.map((v, i) => ({
                    value: v,
                    itemStyle: { color: features[i].category === 'technical' ? '#3b82f6' : '#c084fc' }
                }))
            }
        ]
    };
    featureChart.setOption(option);
}

// 5. Correlation List
function renderCorrelations(assetKey) {
    const listContainer = document.getElementById('correlationsList');
    listContainer.innerHTML = '';

    const links = globalData.market_correlation.links;
    let assetLinks = [];

    // Find all links involving this asset
    links.forEach(l => {
        if (l.source === assetKey) assetLinks.push({ target: l.target, value: l.value });
        if (l.target === assetKey) assetLinks.push({ target: l.source, value: l.value });
    });

    if (assetLinks.length === 0) {
        listContainer.innerHTML = '<p style="color:var(--text-secondary)">No correlation data available.</p>';
        return;
    }

    // Sort by correlation value
    assetLinks.sort((a, b) => b.value - a.value);

    // Create HTML for each item
    assetLinks.forEach(link => {
        const item = document.createElement('div');
        // If value > 0.5 we consider it highly positive, if < 0.3 we consider it low/negative for styling purposes
        const typeClass = link.value >= 0.5 ? 'positive' : 'negative';
        item.className = `corr-item ${typeClass}`;
        
        let targetName = link.target;
        // Try to get full name if available in market_data
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
