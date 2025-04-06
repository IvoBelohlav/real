# app/api/admin.py
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.mongo import get_db, get_user_collection
from app.models.models import Statistics
from app.models.user import User, SubscriptionStatus # Import SubscriptionStatus if needed for checks
from app.utils.error import handle_error
from app.utils.jwt import verify_token
from fastapi.security import OAuth2PasswordBearer
from app.utils.logging_config import get_module_logger

router = APIRouter()
logger = get_module_logger(__name__)

# Using OAuth2PasswordBearer for token handling
# Ensure this token URL matches your login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_stats_collection(db: AsyncIOMotorClient = Depends(get_db)):
    """Returns the conversations collection for stats aggregation."""
    return db["conversations"]

async def get_current_admin_or_paid_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorClient = Depends(get_db)):
    """
    Fetches the current user from the database based on the provided JWT token.
    Checks if the user is a super admin, an admin, or has a paid subscription.
    Raises HTTPException if the token is invalid, the user is not found, or the user doesn't have proper access.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    permission_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions. Super admin, admin access, or paid subscription required.",
    )

    try:
        payload = verify_token(token)
        logger.debug(f"Token payload: {payload}")  # Log the token payload

        user_id: str = payload.get("user_id")
        if user_id is None:
            logger.error("User ID not found in token")
            raise credentials_exception

        user_collection = await get_user_collection()
        user = await user_collection.find_one({"id": user_id})
        if user is None:
            logger.error("User not found in database")
            raise credentials_exception

        # Check permissions: Super Admin OR Admin Tier OR Active/Trialing Subscription
        is_super_admin = user.get("is_super_admin", False)
        is_admin_tier = user.get("subscription_tier") == "admin" # Keep original admin tier check if still relevant
        has_paid_subscription = user.get("subscription_status") in [SubscriptionStatus.ACTIVE.value, SubscriptionStatus.TRIALING.value]

        if not (is_super_admin or is_admin_tier or has_paid_subscription):
            logger.warning(f"User {user_id} attempted to access admin/stats features without proper permissions (super_admin={is_super_admin}, admin_tier={is_admin_tier}, paid_sub={has_paid_subscription})")
            raise permission_exception

        logger.debug(f"Authenticated user with proper permissions for stats/admin access: {user_id}")
        return User(**user)  # Return the user object

    except HTTPException as e:
        # Re-raise HTTPExceptions to avoid being caught by the generic Exception block below
        raise e
    except Exception as e:
        logger.error(f"Error in get_current_admin_or_paid_user: {e}")
        raise credentials_exception

@router.get("/admin/stats", response_model=Statistics)
async def get_admin_stats(
    stats_collection: AsyncIOMotorClient = Depends(get_stats_collection),
    current_user: User = Depends(get_current_admin_or_paid_user)
):
    """
    Retrieves admin statistics.
    Accessible to admin users or users with paid subscriptions.
    """
    logger.info(f"Fetching statistics for user {current_user.id} (is_super_admin={current_user.is_super_admin}, tier={current_user.subscription_tier})")
    try:
        # Determine filter: Super admins and 'admin' tier see global stats. Others see only their own.
        can_see_global_stats = current_user.is_super_admin or current_user.subscription_tier == "admin"
        user_filter = {} if can_see_global_stats else {"user_id": current_user.id}

        logger.debug(f"Using filter for stats: {user_filter} (can_see_global={can_see_global_stats})")
        
        pipeline = [
            {
                '$match': user_filter
            },
            {
                '$facet': {
                    'totalUsers': [{'$group': {'_id': '$user_id'}}],
                    'activeUsers': [
                        {'$match': {'timestamp': {'$gte': datetime.utcnow() - timedelta(hours=24)}}},
                        {'$group': {'_id': '$user_id'}}
                    ],
                    'totalMessages': [{'$count': 'count'}],
                    'responseTimes': [
                        {'$match': {'response_time': {'$exists': True}}},  # Assuming you have a response_time field
                        {'$group': {'_id': None, 'avg': {'$avg': '$response_time'}}}
                    ],
                    'dailyStats': [
                        {'$match': {'timestamp': {'$gte': datetime.utcnow() - timedelta(days=7)}}},
                        {'$group': {
                            '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}},
                            'messages': {'$sum': 1}
                        }},
                        {'$sort': {'_id': 1}}
                    ],
                    'monthlyUsers': [
                        {'$match': {'timestamp': {'$gte': datetime.utcnow() - timedelta(days=180)}}},
                        {'$group': {
                            '_id': {'$dateToString': {'format': '%Y-%m', 'date': '$timestamp'}},
                            'users': {'$addToSet': '$user_id'}
                        }},
                        {'$project': {'users': {'$size': '$users'}}},
                        {'$sort': {'_id': 1}}
                    ]
                }
            }
        ]

        results = await stats_collection.aggregate(pipeline).next()

        return {
            "totalUsers": len(results['totalUsers']),
            "activeUsers": len(results['activeUsers']),
            "totalMessages": results['totalMessages'][0]['count'] if results['totalMessages'] else 0,
            "averageResponseTime": results['responseTimes'][0]['avg'] if results['responseTimes'] else 0,
            "dailyStats": [{"date": x["_id"], "messages": x["messages"]} for x in results['dailyStats']],
            "monthlyUsers": [{"month": x["_id"], "users": x["users"]} for x in results['monthlyUsers']]
        }

    except Exception as e:
        logger.error(f"Error fetching admin statistics: {e}")
        handle_error(e, 500, "Failed to fetch admin statistics")
