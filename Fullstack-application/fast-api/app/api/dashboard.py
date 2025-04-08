from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from datetime import datetime, timedelta, timezone # Added datetime imports
# Import require_active_subscription and SubscriptionTier
from app.utils.dependencies import get_current_user, require_active_subscription
from app.models.user import SubscriptionTier # Import SubscriptionTier
from app.utils.mongo import get_db # Import database utility
from app.utils.logging_config import get_module_logger
# Removed ObjectId import as user_id is a string (UUID)

logger = get_module_logger(__name__)
router = APIRouter()

# Helper function to generate date range for charts
def get_date_range(days=30):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    # Generate a list of dates in YYYY-MM-DD format
    date_list = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days + 1)]
    return start_date, end_date, date_list

@router.get("/dashboard/stats", response_model=dict) # Added response_model for clarity
# Apply subscription check dependency
async def get_dashboard_stats(
    current_user: dict = Depends(require_active_subscription),
    db: Database = Depends(get_db) # Inject database dependency
):
    """
    Get statistics for the user dashboard (requires active subscription).
    Fetches real data from the database, including historical data for charts.
    """
    # The require_active_subscription dependency already ensures the user is authenticated
    # and has an active or trialing subscription.
    # Tier check was removed to allow Basic access.
    logger.info(f"User {current_user.get('id')} (Tier: {current_user.get('subscription_tier', 'N/A')}) accessing dashboard stats.")

    user_id = current_user.get("id")
    if not user_id:
        # This should technically not happen due to require_active_subscription, but good practice
        logger.error("User ID not found in token payload for dashboard stats.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user.")

    try:
        # user_object_id = ObjectId(user_id) # Removed ObjectId conversion

        # Fetch total conversations using the string user_id
        total_conversations = await db.conversations.count_documents({"user_id": user_id})

        # Fetch total messages (summing message counts from conversations)
        # This assumes conversations have a 'messages' list/array field. Adjust if schema differs.
        total_messages = 0
        # Using aggregation for potentially better performance than fetching all docs
        pipeline = [
            {"$match": {"user_id": user_id}}, # Use string user_id
            # Safely calculate message count, handling missing or non-array 'messages' field
            {"$project": {
                "message_count": {
                    "$cond": {
                        "if": {"$isArray": "$messages"}, # Check if 'messages' is an array
                        "then": {"$size": "$messages"},   # If yes, calculate size
                        "else": 0                         # If no (or missing), return 0
                    }
                }
            }},
            {"$group": {"_id": None, "total_messages": {"$sum": "$message_count"}}}
        ]
        result = await db.conversations.aggregate(pipeline).to_list(length=1)
        if result:
            total_messages = result[0].get("total_messages", 0)

        # Fetch widget configurations to count active widgets and domains using string user_id
        widget_configs = await db.widget_configs.find({"user_id": user_id}).to_list(length=None) # Fetch all configs for user
        active_widgets = len(widget_configs) # Count of widget configurations

        # Count unique authorized domains across all widget configs for the user
        all_domains = set()
        for config in widget_configs:
            # Assuming 'authorized_domains' is a list field in widget_config documents
            domains_list = config.get("authorized_domains", [])
            if isinstance(domains_list, list): # Ensure it's a list
                all_domains.update(domain for domain in domains_list if isinstance(domain, str) and domain) # Add non-empty strings

        total_domains = len(all_domains)

        # --- Calculate Historical Data (Last 30 days) ---
        start_date, end_date, all_dates = get_date_range(30)

        # 1. Daily Conversation Counts
        # Assuming conversations have a 'created_at' field (datetime object)
        conversation_history_pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "created_at": {"$gte": start_date, "$lte": end_date} # Filter by date range
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at", "timezone": "UTC"} # Group by day (UTC)
                    },
                    "count": {"$sum": 1} # Count conversations per day
                }
            },
            {"$sort": {"_id": 1}} # Sort by date
        ]
        daily_convo_results = await db.conversations.aggregate(conversation_history_pipeline).to_list(length=None)
        # Create a dictionary for quick lookup
        daily_convo_map = {item['_id']: item['count'] for item in daily_convo_results}
        # Fill in missing dates with 0 counts
        conversation_history = [{"date": date, "count": daily_convo_map.get(date, 0)} for date in all_dates]


        # 2. Daily Message Counts (Placeholder - requires message timestamps)
        # This is a simplified placeholder. A real implementation would need to
        # aggregate based on individual message timestamps, potentially from a
        # separate messages collection or by iterating within conversation documents.
        message_history = [{"date": date, "count": 0} for date in all_dates] # Placeholder


        # Widget views - still needs a tracking mechanism
        # Widget views - still needs a tracking mechanism
        widget_views = 0 # Placeholder

        # Calculate Average Conversation Length
        average_conversation_length = (total_messages / total_conversations) if total_conversations > 0 else 0

        logger.info(f"Dashboard stats calculated for user {user_id}: convos={total_conversations}, msgs={total_messages}, widgets={active_widgets}, domains={total_domains}, avg_len={average_conversation_length:.2f}")

        return {
            # Totals
            "widget_views": widget_views, # Placeholder
            "conversations": total_conversations,
            "active_widgets": active_widgets,
            "messages": total_messages,
            "domains": total_domains,
            "average_conversation_length": round(average_conversation_length, 2), # Add the calculated average
            # Historical Data
            "conversation_history": conversation_history,
            "message_history": message_history, # Placeholder
            # Subscription Info (already present)
            "subscription": {
                "status": current_user.get("subscription_status", "inactive"),
                "tier": current_user.get("subscription_tier", "free"),
                "end_date": current_user.get("subscription_end_date")
            }
        }

    except Exception as e:
        logger.exception(f"Error fetching dashboard stats for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch dashboard statistics."
        )
