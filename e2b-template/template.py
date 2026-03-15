from e2b import Template

template = (
    Template()
    .from_image("e2bdev/base")
    # Install Python packages
    .run_cmd("pip install pandas numpy matplotlib seaborn scipy geopy -q")
    # Create data directories
    .run_cmd("mkdir -p /home/user/data/resources /home/user/data/census /home/user/data/usda /home/user/data/crosswalk /home/user/data/cdc /home/user/data/reviews /home/user/charts")
    # Copy data files — resources
    .copy("../sandbox/data/resources/resources.csv", "/home/user/data/resources/resources.csv")
    .copy("../sandbox/data/resources/shifts.csv", "/home/user/data/resources/shifts.csv")
    .copy("../sandbox/data/resources/occurrences.csv", "/home/user/data/resources/occurrences.csv")
    .copy("../sandbox/data/resources/tags.csv", "/home/user/data/resources/tags.csv")
    .copy("../sandbox/data/resources/flags.csv", "/home/user/data/resources/flags.csv")
    # Copy data files — census
    .copy("../sandbox/data/census/demographics.csv", "/home/user/data/census/demographics.csv")
    .copy("../sandbox/data/census/poverty.csv", "/home/user/data/census/poverty.csv")
    .copy("../sandbox/data/census/income.csv", "/home/user/data/census/income.csv")
    .copy("../sandbox/data/census/housing.csv", "/home/user/data/census/housing.csv")
    .copy("../sandbox/data/census/education.csv", "/home/user/data/census/education.csv")
    .copy("../sandbox/data/census/geography.csv", "/home/user/data/census/geography.csv")
    .copy("../sandbox/data/census/commute.csv", "/home/user/data/census/commute.csv")
    # Copy data files — usda
    .copy("../sandbox/data/usda/food_environment.csv", "/home/user/data/usda/food_environment.csv")
    # Copy data files — crosswalk
    .copy("../sandbox/data/crosswalk/zip_county.csv", "/home/user/data/crosswalk/zip_county.csv")
    # Copy data files — cdc
    .copy("../sandbox/data/cdc/health.csv", "/home/user/data/cdc/health.csv")
    # Copy data files — reviews
    .copy("../sandbox/data/reviews/reviews.csv", "/home/user/data/reviews/reviews.csv")
)
