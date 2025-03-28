# MongoDB Indexes for Multi-Tenancy Support

The following indexes have been created to support multi-tenancy and secure API key validation in the MongoDB collections:

## User Collection Indexes

```python
# User identity and authentication
await user_collection.create_index("email", unique=True)
await user_collection.create_index("id", unique=True)

# API key and subscription
await user_collection.create_index("api_key", unique=True, sparse=True)
await user_collection.create_index("stripe_customer_id", sparse=True)
await user_collection.create_index("stripe_subscription_id", sparse=True)
await user_collection.create_index("subscription_status")

# Email verification and password reset
await user_collection.create_index("verification_token", sparse=True)
await user_collection.create_index("reset_password_token", sparse=True)
```

## Data Collection Indexes for Multi-Tenancy

```python
# Conversation Collection
await conversation_collection.create_index("conversation_id", unique=True)
await conversation_collection.create_index("user_id")
await conversation_collection.create_index([("user_id", 1), ("timestamp", -1)])

# Product Collection
await product_collection.create_index("id", unique=True)
await product_collection.create_index("user_id")

# Widget Config Collection
await widget_config_collection.create_index("user_id", unique=True)

# FAQ Collection
await faq_collection.create_index("id", unique=True)
await faq_collection.create_index("user_id")

# Guided Chat Collection
await guided_chat_collection.create_index("id", unique=True)
await guided_chat_collection.create_index("user_id")

# Human Chat Collection
await human_chat_collection.create_index("session_id", unique=True)
await human_chat_collection.create_index("user_id")

# Shop Info Collection
await shop_info_collection.create_index("user_id", unique=True)

# Business Config Collection
await business_configs_collection.create_index("user_id", unique=True)
```

These indexes ensure:

1. **Data Isolation**: Each user's data is properly scoped and isolated from other users
2. **Query Efficiency**: Fast lookups by user_id for all tenant-specific data
3. **Security**: Unique API keys and proper verification token handling
4. **Performance**: Compound indexes for common query patterns (e.g., user_id + timestamp)

All relevant endpoints in the API have been updated to include the `get_current_active_customer` dependency which validates the API key and ensures subscription status is active, then filters all database queries by the authenticated user's ID to maintain proper multi-tenancy. 