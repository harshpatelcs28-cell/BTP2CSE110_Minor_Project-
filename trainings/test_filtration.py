import pandas as pd
import os

DATASET_PATH = r'd:\\Minor project (ML)\\dataset\\Crop Recommendation dataset\\Crop Wise Area Production Yield_Sample_Data.csv'

print(f"Using Dataset: {os.path.basename(DATASET_PATH)}")

FILTER_YEAR = "2018-19"
FILTER_STATE = "Uttar Pradesh"
FILTER_SEASON = "Kharif"
FILTER_CROP = "Rice"

FILTER_REGION = None
FILTER_CROP_TYPE = None

try:
    df = pd.read_csv(DATASET_PATH)
    print(f"Original Dataset Size: {df.shape[0]} rows, {df.shape[1]} columns.")
    
    df.columns = df.columns.str.strip()
    filtered_df = df.copy()
    
    if 'State Name (state_name)' in df.columns:
        for col in ['Year (year)', 'State Name (state_name)', 'Season (season)', 'Crop name (crop_name)']:
            if col in filtered_df.columns:
                filtered_df[col] = filtered_df[col].astype(str).str.strip()
        
        if FILTER_YEAR:
            filtered_df = filtered_df[filtered_df['Year (year)'] == FILTER_YEAR.strip()]
            print(f"[Filter] Applied Year='{FILTER_YEAR}' -> Remaining rows: {filtered_df.shape[0]}")
            
        if FILTER_STATE:
            filtered_df = filtered_df[filtered_df['State Name (state_name)'].str.contains(FILTER_STATE, case=False, na=False)]
            print(f"[Filter] Applied State='{FILTER_STATE}' -> Remaining rows: {filtered_df.shape[0]}")
            
        if FILTER_SEASON:
            filtered_df = filtered_df[filtered_df['Season (season)'] == FILTER_SEASON.strip()]
            print(f"[Filter] Applied Season='{FILTER_SEASON}' -> Remaining rows: {filtered_df.shape[0]}")
            
        if FILTER_CROP:
            filtered_df = filtered_df[filtered_df['Crop name (crop_name)'].str.contains(FILTER_CROP, case=False, na=False)]
            print(f"[Filter] Applied Crop='{FILTER_CROP}' -> Remaining rows: {filtered_df.shape[0]}")
            
    elif 'region' in df.columns:
        if FILTER_REGION:
            filtered_df = filtered_df[filtered_df['region'] == FILTER_REGION]
            print(f"[Filter] Applied Region='{FILTER_REGION}' -> Remaining rows: {filtered_df.shape[0]}")
            
        if FILTER_CROP_TYPE:
            filtered_df = filtered_df[filtered_df['crop_type'] == FILTER_CROP_TYPE]
            print(f"[Filter] Applied Crop Type='{FILTER_CROP_TYPE}' -> Remaining rows: {filtered_df.shape[0]}")
            
    print("\n=> Data Extraction Setup Complete & Precise.")
    print(f"=> Final Extracted Model Dataset Shape: {filtered_df.shape[0]} rows, {filtered_df.shape[1]} columns")
    
    if filtered_df.shape[0] > 0:
        output_csv_path = r'd:\Minor project (ML)\dataset\extracted_filtered_data.csv'
        filtered_df.to_csv(output_csv_path, index=False)
        print(f"\nSuccessfully saved precise extracted data to -> {output_csv_path}")
    else:
        print("\nWarning: Extraction resulted in an empty DataFrame. Please adjust your filtration parameters.")
        
    print(filtered_df.head(10))
        
except Exception as e:
    print(f"Exception processing dataset rules: {e}")
