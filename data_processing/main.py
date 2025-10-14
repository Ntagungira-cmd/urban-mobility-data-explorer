from data_processor import NYCTaxiDataProcessor


def main():

    print("=" * 80)
    print("NYC TAXI TRIP DATA PROCESSING PIPELINE")
    print("=" * 80)

    # Initialize processor
    processor = NYCTaxiDataProcessor()

    print("\n[1/5] Loading raw data...")
    try:
        processor.load_data('train.csv')
    except FileNotFoundError:
        print("ERROR: train.csv not found. Please place the dataset in the same directory.")
        print("Download from: NYC Taxi Trip Dataset")
        return

    # Clean data
    print("\n[2/5] Cleaning data...")
    processor.clean_dataset()

    # Derived features
    print("\n[3/5] Derived features...")
    processor.derived_features()

    # Save excluded records
    print("\n[4/5] Saving excluded records log...")
    processor.save_excluded_records()

    # Get summary
    summary = processor.get_data_summary()
    print("\n" + "=" * 80)
    print("DATA PROCESSING SUMMARY")
    print("=" * 80)
    print(f"Total records processed: {summary['record_count']}")
    print(f"Date range: {summary['date_range']['start']} to {summary['date_range']['end']}")
    print(f"\nTrip Duration:")
    print(f"  Mean: {summary['trip_duration']['mean']:.2f} seconds")
    print(f"  Median: {summary['trip_duration']['median']:.2f} seconds")
    print(f"\nTrip Distance:")
    print(f"  Mean: {summary['trip_distance']['mean']:.2f} km")
    print(f"  Median: {summary['trip_distance']['median']:.2f} km")
    print(f"\nTrip Speed:")
    print(f"  Mean: {summary['trip_speed']['mean']:.2f} km/h")
    print(f"  Median: {summary['trip_speed']['median']:.2f} km/h")
    print(f"\nPassenger Distribution: {summary['passenger_distribution']}")
    print(f"\nSpatial Index: {summary['spatial_index']}")
    print(f"\nExcluded Records: {summary['processing_stats']['excluded_records']}")
    print(f"Exclusion Reasons: {summary['processing_stats']['exclusion_reasons']}")

    # # Initialize database
    # print("\n[5/5] Setting up database...")
    # db = TaxiTripDatabase()
    # db.connect()
    # db.create_schema()
    # db.insert_data(processor.clean_data, processor)
    # db.close()

    print("\n" + "=" * 80)
    print("PROCESSING COMPLETE!")
    print("=" * 80)
    print(f"✓ Cleaned data: {len(processor.clean_data)} records")
    # print(f"✓ Database: nyc_taxi_trips.db")
    print(f"✓ Excluded records log: excluded_records.json")
    print(f"✓ Processing log: data_processing.log")


if __name__ == "__main__":
    main()
