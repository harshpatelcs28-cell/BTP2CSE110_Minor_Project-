"""
QUICK START GUIDE - Crop Recommendation System

This file contains simple, ready-to-use examples.
Run this file directly: python quickstart_examples.py
"""

import sys
from training.crop_recommendation_inference import CropRecommendationPredictor
import pandas as pd


def example_1_basic_prediction():
    """
    Example 1: Make a single prediction
    
    Scenario: Farmer has these soil/weather conditions
    What crop should they plant?
    """
    print("\n" + "="*70)
    print("EXAMPLE 1: Basic Single Prediction")
    print("="*70)
    
    # Create predictor
    predictor = CropRecommendationPredictor()
    
    # Example: Conditions suitable for rice cultivation
    print("\nScenario: You are a farmer with these soil & weather conditions:")
    print("  • Nitrogen (N): 90 ppm")
    print("  • Phosphorus (P): 42 ppm")
    print("  • Potassium (K): 43 ppm")
    print("  • Temperature: 20.88°C")
    print("  • Humidity: 82%")
    print("  • pH: 6.50")
    print("  • Rainfall: 202.94 mm")
    
    # Make prediction
    result = predictor.predict(
        N=90, P=42, K=43,
        temperature=20.88, humidity=82.0,
        ph=6.50, rainfall=202.94
    )
    
    # Display result
    print(f"\n✓ RECOMMENDED CROP: {result['recommended_crop'].upper()}")
    print(f"  Confidence: {result['confidence']:.2f}%")
    print(f"  (Model is {result['confidence']:.0f}% confident in this recommendation)")


def example_2_different_conditions():
    """
    Example 2: Prediction for different environmental conditions
    
    How does the recommendation change with different conditions?
    """
    print("\n" + "="*70)
    print("EXAMPLE 2: Predictions for Different Conditions")
    print("="*70)
    
    predictor = CropRecommendationPredictor()
    
    # Define different scenarios
    scenarios = [
        {
            'name': 'High Temperature Region',
            'N': 40, 'P': 40, 'K': 40, 'temperature': 30,
            'humidity': 70, 'ph': 7.0, 'rainfall': 150
        },
        {
            'name': 'Cool & High Rainfall Region',
            'N': 80, 'P': 40, 'K': 40, 'temperature': 15,
            'humidity': 90, 'ph': 6.5, 'rainfall': 400
        },
        {
            'name': 'Low Nitrogen Soil',
            'N': 20, 'P': 50, 'K': 50, 'temperature': 25,
            'humidity': 75, 'ph': 6.8, 'rainfall': 200
        },
        {
            'name': 'High Phosphorus & Potassium',
            'N': 100, 'P': 100, 'K': 100, 'temperature': 22,
            'humidity': 80, 'ph': 7.2, 'rainfall': 250
        }
    ]
    
    print("\nTesting different environmental scenarios:\n")
    
    for scenario in scenarios:
        name = scenario.pop('name')
        result = predictor.predict(**scenario)
        print(f"📍 {name}")
        print(f"   → Recommended: {result['recommended_crop'].upper()} ({result['confidence']:.1f}%)\n")


def example_3_confidence_levels():
    """
    Example 3: Understanding confidence scores
    
    What do different confidence levels mean?
    """
    print("\n" + "="*70)
    print("EXAMPLE 3: Confidence Score Interpretation")
    print("="*70)
    
    predictor = CropRecommendationPredictor()
    
    print("\nConfidence Score Guide:")
    print("  90-100%  → ✓✓✓ Very High Confidence (Excellent recommendation)")
    print("  80-89%   → ✓✓  High Confidence (Good recommendation)")
    print("  70-79%   → ✓   Moderate Confidence (Acceptable recommendation)")
    print("  <70%     → ⚠   Low Confidence (Verify before planting)")
    
    print("\n" + "-"*70)
    print("Testing various conditions:\n")
    
    test_cases = [
        {'N': 90, 'P': 42, 'K': 43, 'temperature': 20.88, 'humidity': 82.0, 'ph': 6.50, 'rainfall': 202.94},
        {'N': 100, 'P': 80, 'K': 100, 'temperature': 23, 'humidity': 78, 'ph': 6.8, 'rainfall': 180},
        {'N': 50, 'P': 30, 'K': 30, 'temperature': 28, 'humidity': 65, 'ph': 7.0, 'rainfall': 120},
    ]
    
    for i, case in enumerate(test_cases, 1):
        result = predictor.predict(**case)
        confidence = result['confidence']
        
        if confidence >= 90:
            level = "✓✓✓ VERY HIGH"
        elif confidence >= 80:
            level = "✓✓  HIGH"
        elif confidence >= 70:
            level = "✓   MODERATE"
        else:
            level = "⚠   LOW"
        
        print(f"Test Case {i}:")
        print(f"  Crop: {result['recommended_crop'].upper()}")
        print(f"  Confidence: {confidence:.2f}% ({level})\n")


def example_4_batch_prediction():
    """
    Example 4: Batch prediction from CSV file
    
    How to process multiple fields at once
    """
    print("\n" + "="*70)
    print("EXAMPLE 4: Batch Prediction (Multiple Fields)")
    print("="*70)
    
    # Load sample data
    print("\nLoading 10 field records from dataset...")
    df = pd.read_csv("dataset/Crop Recommendation dataset/Crop_recommendation.csv")
    sample_data = df.head(10).copy()
    
    # Make batch predictions
    predictor = CropRecommendationPredictor()
    results = predictor.predict_batch(sample_data)
    
    # Display results
    print("\nField Predictions:")
    print("-" * 90)
    print(f"{'Field':<8} {'Actual':<15} {'Predicted':<15} {'Confidence':<12} {'Match':<8}")
    print("-" * 90)
    
    correct = 0
    for idx, row in results.iterrows():
        match = "✓ YES" if row['label'] == row['recommended_crop'] else "✗ NO"
        if row['label'] == row['recommended_crop']:
            correct += 1
        print(f"{idx+1:<8} {row['label']:<15} {row['recommended_crop']:<15} "
              f"{row['confidence']:>6.1f}%      {match:<8}")
    
    print("-" * 90)
    print(f"Accuracy on this batch: {correct}/{len(results)} ({correct/len(results)*100:.1f}%)")


def example_5_model_information():
    """
    Example 5: Get detailed information about the model
    
    What are the model's capabilities?
    """
    print("\n" + "="*70)
    print("EXAMPLE 5: Model Information & Capabilities")
    print("="*70)
    
    predictor = CropRecommendationPredictor()
    info = predictor.get_model_info()
    
    print(f"\n🤖 Model Details:")
    print(f"   Type: {info['model_type']}")
    print(f"   Framework: scikit-learn RandomForest")
    
    print(f"\n📊 Performance Metrics:")
    print(f"   Overall Accuracy: {info['accuracy']:.4f} ({info['accuracy']*100:.2f}%)")
    print(f"   Status: {'✓ EXCEEDS 95% TARGET' if info['accuracy'] >= 0.95 else '✗ Below target'}")
    
    print(f"\n⚙️ Model Configuration:")
    hp = info['hyperparameters']
    print(f"   Number of Trees: {hp['n_estimators']}")
    print(f"   Max Tree Depth: {hp['max_depth']}")
    print(f"   Min Samples to Split: {hp['min_samples_split']}")
    print(f"   Random State: {hp['random_state']} (for reproducibility)")
    
    print(f"\n📥 Input Features ({info['number_of_features']}):")
    for i, feature in enumerate(info['features'], 1):
        print(f"   {i}. {feature}")
    
    print(f"\n🌾 Supported Crops ({info['number_of_crops']}):")
    crops = sorted(info['crop_classes'])
    # Print in columns
    for i in range(0, len(crops), 4):
        print(f"   {', '.join(crops[i:i+4])}")


def example_6_real_world_scenario():
    """
    Example 6: Real-world farming scenario
    
    Complete workflow for a farmer
    """
    print("\n" + "="*70)
    print("EXAMPLE 6: Real-World Farming Scenario")
    print("="*70)
    
    print("""
SCENARIO: Farmer Rajesh has tested soil and recorded weather conditions
         He wants to know what to plant this season.

STEP 1: Get soil test results
────────────────────────────────
       Nitrogen (N):  70 ppm
       Phosphorus:   50 ppm
       Potassium:    30 ppm

STEP 2: Check weather forecast
────────────────────────────────
       Temperature:  25°C
       Humidity:     75%
       Expected Rainfall: 250 mm

STEP 3: Check soil pH
────────────────────────────────
       pH Level:     6.8

SOLUTION: Use the recommendation system
──────────────────────────────────────
""")
    
    predictor = CropRecommendationPredictor()
    result = predictor.predict(
        N=70, P=50, K=30,
        temperature=25, humidity=75,
        ph=6.8, rainfall=250
    )
    
    print(f"RESULT:")
    print(f"  ✓ Recommended Crop: {result['recommended_crop'].upper()}")
    print(f"    Confidence: {result['confidence']:.2f}%")
    print(f"\nCONCLUSION:")
    print(f"  Based on soil nutrients, weather conditions, and pH level,")
    print(f"  {result['recommended_crop'].upper()} is the best choice for Rajesh's field!")


def menu():
    """Display menu and run selected example."""
    print("\n" + "="*70)
    print("CROP RECOMMENDATION SYSTEM - QUICK START EXAMPLES")
    print("="*70)
    print("""
Choose an example to run:

1. Basic Single Prediction       - Make one simple prediction
2. Different Conditions          - See how conditions affect recommendations
3. Confidence Levels             - Understand confidence scores
4. Batch Prediction              - Process multiple fields at once
5. Model Information             - Learn about the model's capabilities
6. Real-World Scenario           - Complete farming scenario walkthrough
7. Run All Examples              - Execute all examples

0. Exit
""")
    
    while True:
        try:
            choice = input("Enter your choice (0-7): ").strip()
            
            if choice == '0':
                print("\nThank you! Goodbye.")
                sys.exit(0)
            elif choice == '1':
                example_1_basic_prediction()
            elif choice == '2':
                example_2_different_conditions()
            elif choice == '3':
                example_3_confidence_levels()
            elif choice == '4':
                example_4_batch_prediction()
            elif choice == '5':
                example_5_model_information()
            elif choice == '6':
                example_6_real_world_scenario()
            elif choice == '7':
                print("\nRunning all examples...\n")
                example_1_basic_prediction()
                example_2_different_conditions()
                example_3_confidence_levels()
                example_4_batch_prediction()
                example_5_model_information()
                example_6_real_world_scenario()
                break
            else:
                print("Invalid choice. Please enter 0-7.")
                continue
            
            again = input("\n\nRun another example? (y/n): ").strip().lower()
            if again != 'y':
                print("\nThank you! Goodbye.")
                break
        
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}")
            print("Please try again.")


def main():
    """Main entry point."""
    try:
        menu()
    except Exception as e:
        print(f"\nFatal Error: {e}")
        print("\nMake sure:")
        print("1. model.pkl exists (run crop_recommendation_pipeline.py first)")
        print("2. Dataset CSV file exists in dataset/Crop Recommendation dataset/")
        sys.exit(1)


if __name__ == "__main__":
    main()
