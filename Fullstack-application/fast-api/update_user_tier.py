import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId
import sys

# Load environment variables from .env file in the current directory
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")
USER_ID_TO_UPDATE = "67fabaf3907c8f7b66d56285" # User ID from the screenshot provided by user
NEW_TIER = "premium" # Set the correct tier

if not MONGO_URL or not MONGO_DB_NAME:
    print("Error: MONGO_URL or MONGO_DB_NAME not found in .env file.", file=sys.stderr)
    sys.exit(1)

client = None # Initialize client to None
try:
    client = MongoClient(MONGO_URL)
    db = client[MONGO_DB_NAME]
    users_collection = db["users"] # Assuming the collection name is 'users'

    # Convert string ID to ObjectId
    try:
        user_object_id = ObjectId(USER_ID_TO_UPDATE)
    except Exception as e:
        print(f"Error: Invalid User ID format '{USER_ID_TO_UPDATE}'. {e}", file=sys.stderr)
        sys.exit(1)

    # --- Attempt to update the user ---
    print(f"Attempting to update user '{USER_ID_TO_UPDATE}' tier to '{NEW_TIER}'...")
    result = users_collection.update_one(
        {"_id": user_object_id},
        {"$set": {"subscription_tier": NEW_TIER}}
    )

    if result.matched_count == 0:
        print(f"Error: User with ID '{USER_ID_TO_UPDATE}' not found during update attempt.", file=sys.stderr)
    elif result.modified_count == 0:
        print(f"Warning: User '{USER_ID_TO_UPDATE}' was found, but the tier was not modified (might already be '{NEW_TIER}').")
    else:
        print(f"Update successful: {result.modified_count} document(s) modified.")

    # --- Verify the update by fetching the record ---
    print(f"Verifying update for user '{USER_ID_TO_UPDATE}'...")
    updated_user = users_collection.find_one({"_id": user_object_id})

    if updated_user:
        current_tier = updated_user.get("subscription_tier", "Not Set")
        print(f"Verification: User '{USER_ID_TO_UPDATE}' current subscription_tier in DB is: '{current_tier}'")
        if current_tier != NEW_TIER:
             print(f"Error: Verification failed! Tier is still '{current_tier}'.", file=sys.stderr)
    else:
        print(f"Error: Could not find user '{USER_ID_TO_UPDATE}' during verification.", file=sys.stderr)


except Exception as e:
    print(f"An error occurred: {e}", file=sys.stderr)
    sys.exit(1)
finally:
    if client:
        client.close()
        print("Database connection closed.")
