"""
Crop Recommendation System - Flask REST API
Serves the trained model via HTTP endpoints for production use.

To run: 
    pip install flask
    python crop_recommendation_api.py

API will be available at: http://localhost:5000
"""

from flask import Flask, request, jsonify
from training.crop_recommendation_inference import CropRecommendationPredictor
import pandas as pd
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Initialize predictor (loads model on startup)
try:
    predictor = CropRecommendationPredictor()
    logger.info("✓ Model loaded successfully")
except FileNotFoundError as e:
    logger.error(f"✗ Failed to load model: {e}")
    predictor = None


@app.route('/', methods=['GET'])
def home():
    """Home endpoint with API information."""
    return jsonify({
        'service': 'Crop Recommendation System',
        'version': '1.0.0',
        'status': 'active' if predictor else 'error',
        'endpoints': {
            'GET /': 'This help message',
            'POST /predict': 'Single crop prediction',
            'POST /predict-batch': 'Batch crop prediction',
            'GET /model-info': 'Model information',
            'GET /health': 'Health check'
        }
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    if predictor is None:
        return jsonify({'status': 'unhealthy', 'message': 'Model not loaded'}), 503
    
    return jsonify({
        'status': 'healthy',
        'model_accuracy': predictor.accuracy,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/model-info', methods=['GET'])
def model_info():
    """Get detailed model information."""
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    info = predictor.get_model_info()
    return jsonify({
        'model_type': info['model_type'],
        'accuracy': f"{info['accuracy']:.4f}",
        'accuracy_percentage': f"{info['accuracy']*100:.2f}%",
        'hyperparameters': info['hyperparameters'],
        'number_of_crops': info['number_of_crops'],
        'crops': sorted(info['crop_classes']),
        'features': info['features'],
        'number_of_features': info['number_of_features']
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Single crop prediction endpoint.
    
    Expected JSON request body:
    {
        "N": 90,
        "P": 42,
        "K": 43,
        "temperature": 20.88,
        "humidity": 82.0,
        "ph": 6.50,
        "rainfall": 202.94
    }
    """
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    try:
        # Get JSON data
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'missing_fields': missing_fields,
                'required_fields': required_fields
            }), 400
        
        # Make prediction
        result = predictor.predict(
            N=float(data['N']),
            P=float(data['P']),
            K=float(data['K']),
            temperature=float(data['temperature']),
            humidity=float(data['humidity']),
            ph=float(data['ph']),
            rainfall=float(data['rainfall'])
        )
        
        logger.info(f"Prediction made: {result['recommended_crop']}")
        
        return jsonify({
            'success': True,
            'recommendation': {
                'crop': result['recommended_crop'],
                'confidence': f"{result['confidence']:.2f}%",
                'confidence_score': round(result['confidence'], 2)
            },
            'input_conditions': result['input_features'],
            'timestamp': datetime.now().isoformat()
        })
    
    except ValueError as e:
        return jsonify({
            'error': 'Invalid input values',
            'message': str(e)
        }), 400
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500


@app.route('/predict-batch', methods=['POST'])
def predict_batch():
    """
    Batch prediction endpoint.
    
    Expected JSON request body (array of records):
    {
        "data": [
            {"N": 90, "P": 42, "K": 43, "temperature": 20.88, "humidity": 82.0, "ph": 6.50, "rainfall": 202.94},
            {"N": 85, "P": 58, "K": 41, "temperature": 21.77, "humidity": 80.32, "ph": 7.04, "rainfall": 226.66}
        ]
    }
    """
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    try:
        # Get JSON data
        payload = request.get_json()
        
        if 'data' not in payload or not isinstance(payload['data'], list):
            return jsonify({
                'error': 'Invalid request format',
                'message': 'Expected JSON with "data" field containing array of records'
            }), 400
        
        # Convert to DataFrame
        df = pd.DataFrame(payload['data'])
        
        # Make batch predictions
        results_df = predictor.predict_batch(df)
        
        logger.info(f"Batch prediction made for {len(results_df)} samples")
        
        # Prepare response
        predictions = []
        for idx, row in results_df.iterrows():
            predictions.append({
                'index': idx,
                'crop': row['recommended_crop'],
                'confidence': f"{row['confidence']:.2f}%"
            })
        
        return jsonify({
            'success': True,
            'total_predictions': len(predictions),
            'predictions': predictions,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        return jsonify({
            'error': 'Batch prediction failed',
            'message': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        'error': 'Endpoint not found',
        'message': 'Use GET / to see available endpoints'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({
        'error': 'Internal server error',
        'message': 'Something went wrong on the server'
    }), 500


def main():
    """Run the Flask app."""
    print("\n" + "="*60)
    print("CROP RECOMMENDATION SYSTEM - REST API")
    print("="*60)
    print("\n✓ Starting Flask API server...")
    print("\nAPI Endpoints:")
    print("  GET  http://localhost:5000/")
    print("  GET  http://localhost:5000/health")
    print("  GET  http://localhost:5000/model-info")
    print("  POST http://localhost:5000/predict")
    print("  POST http://localhost:5000/predict-batch")
    print("\n✓ Server running at http://localhost:5000")
    print("  Press CTRL+C to stop\n")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        use_reloader=False
    )


if __name__ == '__main__':
    main()
