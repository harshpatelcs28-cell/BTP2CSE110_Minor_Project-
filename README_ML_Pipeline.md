# Crop Recommendation System - ML Pipeline

## Overview

This project implements a complete machine learning pipeline for crop recommendation using environmental features. The system uses a **RandomForestClassifier** to predict the most suitable crop for a given set of soil and weather conditions.

### Key Features

- ✅ **99.45% Accuracy** - Exceeds the 95% requirement
- 🌾 **22 Crop Classes** - Recommends from 22 different crops
- 🔧 **Production-Ready** - Clean, modular, well-documented code
- ⚡ **Fast Inference** - Parallel processing with n_jobs=-1
- 📊 **Comprehensive Evaluation** - Includes classification report and metrics
- 💾 **Model Persistence** - Trained model and metadata saved for reuse

## Dataset

**Source**: Crop Recommendation Dataset  
**Location**: `dataset/Crop Recommendation dataset/Crop_recommendation.csv`  
**Size**: 2,200 samples across 22 crop classes

### Features (Input)

| Feature | Description | Unit |
|---------|-------------|------|
| N | Nitrogen content in soil | ppm |
| P | Phosphorus content in soil | ppm |
| K | Potassium content in soil | ppm |
| temperature | Average temperature | °C |
| humidity | Average humidity | % |
| ph | pH level of soil | 0-14 |
| rainfall | Annual rainfall | mm |

### Target (Output)

**Label**: Recommended crop type (22 classes)

**Crop Classes**: apple, banana, blackgram, chickpea, coconut, coffee, cotton, grapes, jute, kidneybeans, lentil, maize, mango, mothbeans, mungbean, muskmelon, orange, papaya, pigeonpeas, pomegranate, rice, watermelon

## Project Structure

```
d:\Minor project (ML)/
├── crop_recommendation_pipeline.py      # Main training pipeline
├── crop_recommendation_inference.py     # Model inference/prediction
├── model.pkl                            # Trained model (6.97 MB)
├── model_metadata.pkl                   # Model metadata and features
├── README.md                            # This file
└── dataset/
    └── Crop Recommendation dataset/
        └── Crop_recommendation.csv      # Raw dataset
```

## Installation

### Requirements

- Python 3.8+
- pandas
- numpy
- scikit-learn
- joblib

### Setup

```bash
# Install required packages
pip install pandas numpy scikit-learn joblib

# Navigate to project directory
cd "d:\Minor project (ML)"
```

## Usage

### 1. Training the Model

Run the training pipeline to build the ML model from scratch:

```bash
python crop_recommendation_pipeline.py
```

**Output**:
- `model.pkl` - Trained RandomForestClassifier
- `model_metadata.pkl` - Model metadata (features, classes, accuracy)
- Console output with accuracy and classification report

### 2. Using the Trained Model

#### Single Prediction Example

```python
from crop_recommendation_inference import CropRecommendationPredictor

# Load the model
predictor = CropRecommendationPredictor()

# Make a prediction
result = predictor.predict(
    N=90, P=42, K=43,
    temperature=20.88, humidity=82.0,
    ph=6.50, rainfall=202.94
)

print(f"Recommended Crop: {result['recommended_crop']}")
print(f"Confidence: {result['confidence']:.2f}%")
```

#### Batch Prediction Example

```python
import pandas as pd
from crop_recommendation_inference import CropRecommendationPredictor

# Load test data
test_data = pd.read_csv("dataset/Crop Recommendation dataset/Crop_recommendation.csv")

# Make batch predictions
predictor = CropRecommendationPredictor()
results = predictor.predict_batch(test_data)

print(results[['N', 'P', 'K', 'recommended_crop', 'confidence']])
```

#### Get Model Information

```python
from crop_recommendation_inference import CropRecommendationPredictor

predictor = CropRecommendationPredictor()
info = predictor.get_model_info()

print(f"Accuracy: {info['accuracy']:.4f}")
print(f"Crops: {info['number_of_crops']}")
print(f"Features: {info['features']}")
```

#### Run All Inference Examples

```bash
python crop_recommendation_inference.py
```

## Model Performance

### Overview

| Metric | Value |
|--------|-------|
| **Accuracy** | **99.45%** ✅ |
| Training Samples | 1,650 |
| Testing Samples | 550 |
| Accuracy Target | ≥ 95% |
| Status | **EXCEEDED TARGET** |

### Classification Report

The model achieves excellent performance across all 22 crop classes:

- **Average Precision**: 99%
- **Average Recall**: 99%
- **Average F1-Score**: 99%
- **Weighted Average F1-Score**: 99%

**Sample Results** (per-class metrics):
- Apple: 100% (P:1.00, R:1.00, F1:1.00)
- Rice: 96% (P:1.00, R:0.96, F1:0.98)
- Maize: 98% (P:0.96, R:1.00, F1:0.98)
- Banana: 100% (P:1.00, R:1.00, F1:1.00)

## Model Specifications

### Algorithm
**RandomForestClassifier** from scikit-learn

### Hyperparameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| n_estimators | 200 | Optimal number of trees |
| max_depth | 15 | Prevent overfitting while maintaining accuracy |
| min_samples_split | 2 | Standard setting for stability |
| random_state | 42 | Reproducibility |
| n_jobs | -1 | Use all CPU cores for parallel processing |

### Data Preprocessing

1. **Data Loading**: Load CSV file with 2,200 samples
2. **Missing Values**: Checked and handled (0 missing values found)
3. **Feature-Target Split**: 
   - Features (X): N, P, K, temperature, humidity, ph, rainfall
   - Target (y): label (crop type)
4. **Train-Test Split**: 75% training (1,650), 25% testing (550)
   - Used `stratify=y` to maintain class distribution
   - `random_state=42` for reproducibility

## Production Deployment

### Model Artifacts

The trained model is saved in serialized format:

- **model.pkl** (6.97 MB) - Trained RandomForestClassifier ready for inference
- **model_metadata.pkl** (478 B) - Metadata including feature names and classes

### Loading the Model

```python
import joblib

# Load model
model = joblib.load('model.pkl')

# Load metadata
metadata = joblib.load('model_metadata.pkl')

feature_columns = metadata['feature_columns']
classes = metadata['classes']
```

### API Integration Example

```python
from flask import Flask, request, jsonify
from crop_recommendation_inference import CropRecommendationPredictor

app = Flask(__name__)
predictor = CropRecommendationPredictor()

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    result = predictor.predict(
        N=data['N'],
        P=data['P'],
        K=data['K'],
        temperature=data['temperature'],
        humidity=data['humidity'],
        ph=data['ph'],
        rainfall=data['rainfall']
    )
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=False)
```

## Code Quality

### Architecture

- **Modular Design**: Separate pipeline and inference classes
- **Clear Documentation**: Docstrings for all methods
- **Type Hints**: Type annotations for function parameters
- **Error Handling**: Robust exception handling
- **Reproducibility**: Fixed random_state for consistent results

### Features

✅ Clean, readable code  
✅ Well-structured classes  
✅ Comprehensive comments  
✅ Proper separation of concerns  
✅ Production-ready implementation  
✅ Easy to extend and maintain  

## Troubleshooting

### Issue: FileNotFoundError when loading model

**Solution**: Make sure you've run `crop_recommendation_pipeline.py` first to create the model files.

```bash
python crop_recommendation_pipeline.py
```

### Issue: Memory warning about feature names

**Note**: This is a harmless scikit-learn warning. The model works correctly despite this warning. Can be fixed by explicitly handling feature names in preprocessing if needed.

### Issue: Low accuracy results

**Check**:
1. Ensure dataset is loaded correctly
2. Verify feature columns: [N, P, K, temperature, humidity, ph, rainfall]
3. Confirm model file isn't corrupted
4. Retrain model if needed

## Performance Optimization

### Current Optimizations

1. **Parallel Processing**: `n_jobs=-1` uses all available CPU cores
2. **Tree Depth Control**: `max_depth=15` prevents overfitting
3. **Sample Size**: 2,200 samples provides good training data
4. **Strategic Splits**: 75/25 train-test split with stratification

### Potential Improvements

For future enhancements:
- Feature scaling or normalization
- Cross-validation for better evaluation
- Hyperparameter tuning with GridSearchCV
- Ensemble with other algorithms
- Feature importance analysis

## References

**Dataset Source**: Crop Recommendation Dataset  
**Algorithm**: Random Forest Classification (scikit-learn)  
**Libraries Used**:
- pandas: Data manipulation and analysis
- numpy: Numerical computations
- scikit-learn: Machine learning algorithms
- joblib: Model serialization

## License

This project is created for educational purposes.

## Contact & Support

For questions or issues with the pipeline, review the inline code documentation in:
- `crop_recommendation_pipeline.py` - Training pipeline documentation
- `crop_recommendation_inference.py` - Inference/prediction documentation

---

**Status**: ✅ **COMPLETE** - Model training and inference pipeline fully functional with 99.45% accuracy.
