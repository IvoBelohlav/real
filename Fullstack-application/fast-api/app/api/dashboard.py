from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
# Import require_active_subscription and SubscriptionTier
from app.utils.dependencies import get_current_user, require_active_subscription
from app.models.user import SubscriptionTier # Import SubscriptionTier
from app.utils.mongo import get_db # Import database utility
from app.utils.logging_config import get_module_logger
from app.utils.logging_config import get_module_logger
# Removed ObjectId import as user_id is a string (UUID)

logger = get_module_logger(__name__)
router = APIRouter()

@router.get("/dashboard/stats", response_model=dict) # Added response_model for clarity
# Apply subscription check dependency
async def get_dashboard_stats(
    current_user: dict = Depends(require_active_subscription),
    db: Database = Depends(get_db) # Inject database dependency
):
    """
    Get statistics for the user dashboard (requires active subscription).
    Fetches real data from the database.
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
            {"$project": {"message_count": {"$size": "$messages"}}}, # Assuming 'messages' is an array
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

        # Widget views - still needs a tracking mechanism
        widget_views = 0 # Placeholder

        logger.info(f"Dashboard stats calculated for user {user_id}: convos={total_conversations}, msgs={total_messages}, widgets={active_widgets}, domains={total_domains}")

        return {
            "widget_views": widget_views,
            "conversations": total_conversations,
            "active_widgets": active_widgets,
            "messages": total_messages,
            "domains": total_domains,
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
