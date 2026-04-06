"""
Crop Recommendation System - Model Inference/Prediction Script
This module demonstrates how to load the trained model and use it for predictions.
"""

import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Union


class CropRecommendationPredictor:
    """
    Load and use the trained crop recommendation model for predictions.
    """
    
    def __init__(self, model_path: str = "model.pkl", metadata_path: str = "model_metadata.pkl"):
        """
        Initialize the predictor by loading the model and metadata.
        
        Args:
            model_path: Path to the saved model file
            metadata_path: Path to the saved metadata file
        """
        print("Loading trained model and metadata...")
        self.model = joblib.load(model_path)
        self.metadata = joblib.load(metadata_path)
        
        self.feature_columns = self.metadata['feature_columns']
        self.classes = self.metadata['classes']
        self.accuracy = self.metadata['accuracy']
        
        print(f"✓ Model loaded successfully (Accuracy: {self.accuracy:.4f})")
        print(f"  Features: {self.feature_columns}")
        print(f"  Crops: {len(self.classes)} types")
    
    def predict(self, N: float, P: float, K: float, temperature: float, 
                humidity: float, ph: float, rainfall: float) -> Dict[str, Union[str, float]]:
        """
        Make a crop recommendation based on input features.
        
        Args:
            N: Nitrogen content in soil
            P: Phosphorus content in soil
            K: Potassium content in soil
            temperature: Temperature in Celsius
            humidity: Humidity percentage
            ph: pH level of soil
            rainfall: Rainfall in mm
        
        Returns:
            dict: Prediction result with recommended crop and confidence
        """
        # Prepare input features
        features = np.array([[N, P, K, temperature, humidity, ph, rainfall]])
        
        # Make prediction
        predicted_crop = self.model.predict(features)[0]
        
        # Get prediction probabilities
        prediction_proba = self.model.predict_proba(features)[0]
        confidence = np.max(prediction_proba) * 100
        
        result = {
            'recommended_crop': predicted_crop,
            'confidence': confidence,
            'input_features': {
                'N': N,
                'P': P,
                'K': K,
                'temperature': temperature,
                'humidity': humidity,
                'ph': ph,
                'rainfall': rainfall
            }
        }
        
        return result
    
    def predict_batch(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        """
        Make crop recommendations for multiple samples.
        
        Args:
            dataframe: DataFrame with columns [N, P, K, temperature, humidity, ph, rainfall]
        
        Returns:
            pd.DataFrame: DataFrame with predictions and confidence scores
        """
        # Make predictions
        predictions = self.model.predict(dataframe[self.feature_columns])
        probabilities = self.model.predict_proba(dataframe[self.feature_columns])
        confidences = np.max(probabilities, axis=1) * 100
        
        # Create result dataframe
        result_df = dataframe.copy()
        result_df['recommended_crop'] = predictions
        result_df['confidence'] = confidences
        
        return result_df
    
    def get_model_info(self) -> Dict:
        """
        Get information about the trained model.
        
        Returns:
            dict: Model information
        """
        return {
            'model_type': self.metadata['model_type'],
            'accuracy': self.metadata['accuracy'],
            'hyperparameters': self.metadata['hyperparameters'],
            'crop_classes': self.classes,
            'number_of_crops': len(self.classes),
            'features': self.feature_columns,
            'number_of_features': len(self.feature_columns)
        }


def example_single_prediction():
    """Example: Single prediction."""
    print("\n" + "="*60)
    print("EXAMPLE 1: Single Crop Prediction")
    print("="*60)
    
    predictor = CropRecommendationPredictor()
    
    # Example input: conditions suitable for rice
    print("\nInput conditions:")
    print("  N: 90, P: 42, K: 43")
    print("  Temperature: 20.88°C, Humidity: 82%")
    print("  pH: 6.50, Rainfall: 202.94 mm")
    
    result = predictor.predict(
        N=90, P=42, K=43,
        temperature=20.88, humidity=82.0,
        ph=6.50, rainfall=202.94
    )
    
    print(f"\nRecommended Crop: {result['recommended_crop'].upper()}")
    print(f"Confidence: {result['confidence']:.2f}%")


def example_batch_prediction():
    """Example: Batch prediction from CSV."""
    print("\n" + "="*60)
    print("EXAMPLE 2: Batch Prediction from Test Data")
    print("="*60)
    
    # Load test data
    test_df = pd.read_csv("dataset/Crop Recommendation dataset/Crop_recommendation.csv")
    test_subset = test_df.head(5).copy()
    
    predictor = CropRecommendationPredictor()
    
    print("\nLoading 5 sample records from dataset...")
    print("\nInput data:")
    print(test_subset[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall', 'label']])
    
    results = predictor.predict_batch(test_subset)
    
    print("\nPredictions:")
    print(results[['N', 'P', 'K', 'label', 'recommended_crop', 'confidence']])
    
    # Check accuracy
    correct = (results['label'] == results['recommended_crop']).sum()
    print(f"\nCorrect Predictions: {correct}/{len(results)}")


def example_model_info():
    """Example: Get model information."""
    print("\n" + "="*60)
    print("EXAMPLE 3: Model Information")
    print("="*60)
    
    predictor = CropRecommendationPredictor()
    info = predictor.get_model_info()
    
    print(f"\nModel Type: {info['model_type']}")
    print(f"Accuracy: {info['accuracy']:.4f} ({info['accuracy']*100:.2f}%)")
    print(f"\nHyperparameters:")
    for key, value in info['hyperparameters'].items():
        print(f"  - {key}: {value}")
    print(f"\nNumber of Features: {info['number_of_features']}")
    print(f"Feature List: {', '.join(info['features'])}")
    print(f"\nNumber of Crop Classes: {info['number_of_crops']}")
    print(f"Crops: {', '.join(sorted(info['crop_classes']))}")


def main():
    """Run all examples."""
    print("\n" + "="*70)
    print("CROP RECOMMENDATION SYSTEM - MODEL INFERENCE DEMONSTRATIONS")
    print("="*70)
    
    try:
        example_single_prediction()
        example_batch_prediction()
        example_model_info()
        
        print("\n" + "="*70)
        print("ALL EXAMPLES COMPLETED SUCCESSFULLY!")
        print("="*70)
        
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("Make sure to run crop_recommendation_pipeline.py first to train the model.")


if __name__ == "__main__":
    main()
