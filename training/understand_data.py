import pandas as pd

df = pd.read_csv("dataset/Crop Recommendation dataset/crop_recommendation.csv")

print("Columns:")
print(df.columns)

print("\nSample Data:")
print(df.head())

print("\nUnique crops (output):")
print(df['label'].unique())