import json
import random
from datetime import datetime, timedelta

def generate_market_data(days=100):
    data = []
    start_date = datetime.now() - timedelta(days=days)
    
    current_price = 150.0
    
    for i in range(days):
        date_str = (start_date + timedelta(days=i)).strftime('%Y-%m-%d')
        
        # Random walk for price
        volatility = current_price * 0.02
        open_p = current_price + random.uniform(-volatility, volatility)
        close_p = open_p + random.uniform(-volatility, volatility)
        high_p = max(open_p, close_p) + random.uniform(0, volatility)
        low_p = min(open_p, close_p) - random.uniform(0, volatility)
        volume = int(random.uniform(1000000, 5000000))
        
        # NLP sentiment (-1.0 to 1.0)
        sentiment = random.uniform(-1.0, 1.0)
        
        # ML prediction for next day
        prediction = close_p + random.uniform(-volatility*1.5, volatility*1.5)
        if sentiment > 0.5:
            prediction += volatility * 0.5
        elif sentiment < -0.5:
            prediction -= volatility * 0.5
            
        # SMA calculation (mocked for simplicity, normally requires previous prices)
        sma = close_p + random.uniform(-volatility*2, volatility*2)
        
        day_data = {
            "date": date_str,
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "close": round(close_p, 2),
            "volume": volume,
            "sentiment": round(sentiment, 2),
            "ml_prediction": round(prediction, 2),
            "sma_20": round(sma, 2)
        }
        data.append(day_data)
        
        current_price = close_p
        
    return {
        "metadata": {
            "symbol": "AAPL (Mocked)",
            "last_updated": datetime.now().isoformat(),
            "model_version": "v1.2.4-xgboost",
            "nlp_source": "Twitter + NewsAPI"
        },
        "timeseries": data
    }

if __name__ == "__main__":
    market_data = generate_market_data(150)
    with open('data/market_data.json', 'w') as f:
        json.dump(market_data, f, indent=4)
    print("Mock data generated in data/market_data.json")
