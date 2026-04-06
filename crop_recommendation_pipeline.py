"""
Crop Recommendation System - ML Pipeline
This module builds a machine learning pipeline for crop recommendation
using environmental features (N, P, K, temperature, humidity, ph, rainfall).
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
from pathlib import Path


class CropRecommendationPipeline:
    """
    A complete ML pipeline for crop recommendation.
    
    Handles data loading, preprocessing, model training, and evaluation.
    """
    
    def __init__(self, data_path: str, model_save_path: str = "model.pkl"):
        """
        Initialize the pipeline.
        
        Args:
            data_path: Path to the crop recommendation dataset CSV file
            model_save_path: Path where the trained model will be saved
        """
        self.data_path = data_path
        self.model_save_path = model_save_path
        self.df = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.model = None
        self.accuracy = None
        self.classification_rep = None
        
    def load_data(self) -> pd.DataFrame:
        """
        Load the dataset from CSV file.
        
        Returns:
            DataFrame: Loaded dataset
        """
        print("Loading dataset...")
        self.df = pd.read_csv(self.data_path)
        print(f"Dataset shape: {self.df.shape}")
        print(f"Columns: {self.df.columns.tolist()}")
        return self.df
    
    def check_missing_values(self) -> dict:
        """
        Check for missing values in the dataset.
        
        Returns:
            dict: Dictionary with missing value information
        """
        print("\nChecking for missing values...")
        missing_info = {
            'total_missing': self.df.isnull().sum().sum(),
            'missing_by_column': self.df.isnull().sum().to_dict()
        }
        
        if missing_info['total_missing'] == 0:
            print("✓ No missing values detected in the dataset.")
        else:
            print(f"Found {missing_info['total_missing']} missing values:")
            for col, count in missing_info['missing_by_column'].items():
                if count > 0:
                    print(f"  - {col}: {count} missing values")
                    # Handle missing values by dropping rows with NaN
                    self.df.drop(self.df[self.df[col].isnull()].index, inplace=True)
                    print(f"    → Removed {count} rows with missing values")
        
        return missing_info
    
    def prepare_features_and_target(self) -> tuple:
        """
        Separate features (X) and target (y) from the dataset.
        
        Returns:
            tuple: (X, y) - Features and target arrays
        """
        print("\nPreparing features and target...")
        
        # Define feature columns
        feature_columns = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        target_column = 'label'
        
        # Separate features and target
        self.X = self.df[feature_columns].values
        self.y = self.df[target_column].values
        
        print(f"Features shape: {self.X.shape}")
        print(f"Target shape: {self.y.shape}")
        print(f"Feature columns: {feature_columns}")
        print(f"Target column: {target_column}")
        print(f"Unique crops (classes): {len(np.unique(self.y))}")
        print(f"Classes: {sorted(np.unique(self.y))}")
        
        return self.X, self.y
    
    def split_data(self, test_size: float = 0.25, random_state: int = 42) -> tuple:
        """
        Split data into training and testing sets.
        
        Args:
            test_size: Proportion of dataset to include in test split (default: 0.25)
            random_state: Random seed for reproducibility
        
        Returns:
            tuple: (X_train, X_test, y_train, y_test)
        """
        print(f"\nSplitting data: {100-int(test_size*100)}% train, {int(test_size*100)}% test...")
        
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            self.X, self.y, 
            test_size=test_size, 
            random_state=random_state,
            stratify=self.y  # Ensures balanced class distribution
        )
        
        print(f"Training set size: {self.X_train.shape[0]} samples")
        print(f"Testing set size: {self.X_test.shape[0]} samples")
        
        return self.X_train, self.X_test, self.y_train, self.y_test
    
    def train_model(self, n_estimators: int = 200, max_depth: int = 15, 
                   min_samples_split: int = 2, random_state: int = 42) -> RandomForestClassifier:
        """
        Train a RandomForestClassifier with specified hyperparameters.
        
        Args:
            n_estimators: Number of trees in the forest
            max_depth: Maximum depth of trees
            min_samples_split: Minimum samples required to split a node
            random_state: Random seed for reproducibility
        
        Returns:
            RandomForestClassifier: Trained model
        """
        print("\nTraining RandomForestClassifier...")
        print(f"Hyperparameters:")
        print(f"  - n_estimators: {n_estimators}")
        print(f"  - max_depth: {max_depth}")
        print(f"  - min_samples_split: {min_samples_split}")
        print(f"  - random_state: {random_state}")
        print(f"  - n_jobs: -1 (parallel processing enabled)")
        
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            random_state=random_state,
            n_jobs=-1  # Use all available processors
        )
        
        self.model.fit(self.X_train, self.y_train)
        print("✓ Model training completed!")
        
        return self.model
    
    def evaluate_model(self) -> dict:
        """
        Evaluate the trained model on the test set.
        
        Returns:
            dict: Dictionary containing accuracy and classification report
        """
        print("\nEvaluating model performance...")
        
        # Make predictions
        y_pred = self.model.predict(self.X_test)
        
        # Calculate accuracy
        self.accuracy = accuracy_score(self.y_test, y_pred)
        print(f"\n{'='*60}")
        print(f"ACCURACY SCORE: {self.accuracy:.4f} ({self.accuracy*100:.2f}%)")
        print(f"{'='*60}")
        
        # Check if accuracy meets requirement
        if self.accuracy >= 0.95:
            print("✓ Excellent! Model achieves >= 95% accuracy!")
        else:
            print(f"⚠ Warning: Model accuracy is {self.accuracy*100:.2f}%, below 95% target.")
        
        # Generate classification report
        self.classification_rep = classification_report(
            self.y_test, y_pred, 
            target_names=sorted(np.unique(self.y))
        )
        
        print("\nCLASSIFICATION REPORT:")
        print("-" * 60)
        print(self.classification_rep)
        print("-" * 60)
        
        return {
            'accuracy': self.accuracy,
            'classification_report': self.classification_rep,
            'predictions': y_pred
        }
    
    def save_model(self) -> str:
        """
        Save the trained model to a pickle file.
        
        Returns:
            str: Path where the model was saved
        """
        print(f"\nSaving trained model to '{self.model_save_path}'...")
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(self.model_save_path) or '.', exist_ok=True)
        
        joblib.dump(self.model, self.model_save_path)
        print(f"✓ Model saved successfully!")
        
        return self.model_save_path
    
    def save_metadata(self, metadata_path: str = "model_metadata.pkl") -> str:
        """
        Save metadata about the model including feature names and classes.
        
        Args:
            metadata_path: Path where metadata will be saved
        
        Returns:
            str: Path where metadata was saved
        """
        print(f"\nSaving model metadata to '{metadata_path}'...")
        
        feature_columns = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        
        metadata = {
            'feature_columns': feature_columns,
            'classes': sorted(np.unique(self.y)),
            'accuracy': self.accuracy,
            'model_type': 'RandomForestClassifier',
            'hyperparameters': {
                'n_estimators': self.model.n_estimators,
                'max_depth': self.model.max_depth,
                'min_samples_split': self.model.min_samples_split,
                'random_state': self.model.random_state,
            }
        }
        
        joblib.dump(metadata, metadata_path)
        print(f"✓ Metadata saved successfully!")
        
        return metadata_path
    
    def run_pipeline(self) -> dict:
        """
        Execute the complete ML pipeline from data loading to model evaluation.
        
        Returns:
            dict: Dictionary containing pipeline results
        """
        print("\n" + "="*60)
        print("CROP RECOMMENDATION SYSTEM - ML PIPELINE")
        print("="*60)
        
        # Step 1: Load data
        self.load_data()
        
        # Step 2: Check for missing values
        self.check_missing_values()
        
        # Step 3: Prepare features and target
        self.prepare_features_and_target()
        
        # Step 4: Split data
        self.split_data()
        
        # Step 5: Train model
        self.train_model()
        
        # Step 6: Evaluate model
        results = self.evaluate_model()
        
        # Step 7: Save model
        self.save_model()
        
        # Step 8: Save metadata
        self.save_metadata()
        
        print("\n" + "="*60)
        print("PIPELINE EXECUTION COMPLETED!")
        print("="*60)
        
        return results


def main():
    """Main execution function."""
    
    # Define paths
    data_path = "dataset/Crop Recommendation dataset/Crop_recommendation.csv"
    model_save_path = "model.pkl"
    
    # Create and run pipeline
    pipeline = CropRecommendationPipeline(
        data_path=data_path,
        model_save_path=model_save_path
    )
    
    results = pipeline.run_pipeline()
    
    # Print final summary
    print(f"\nFinal Accuracy: {results['accuracy']:.4f}")
    

if __name__ == "__main__":
    main()
