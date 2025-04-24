# Intercom API Implementation Notes

This document details how our MCP tools map to Intercom's API requirements, focusing on parameter translations, format conversions, and implementation details.

## API Mapping Summary

| MCP Parameter         | Intercom API Field/Usage      | Conversion Required                                    |
|-----------------------|-------------------------------|--------------------------------------------------------|
| `customerIdentifier`  | `contact_ids` (contact ID)    | Email → contact ID via contacts/search endpoint        |
| `status`              | `state`                       | `pending` → `snoozed`, `resolved` → `closed`           |
| `startDate`/`endDate` | `created_at` (Unix timestamp) | DD/MM/YYYY → Unix timestamp                            |
| `keywords`/`keyword`  | `source.body` + `~` operator  | Build multiple filters for multiple keywords           |
| `exclude`             | `source.body` + `!~` operator | Use "does not contain" operator                        |

## Detailed Endpoint Mappings

### 1. search_conversations_by_customer

**Implementation Parameters**:
- `customerIdentifier` (email/ID)
- `startDate`/`endDate` (DD/MM/YYYY)
- `keywords` array

**Intercom API Implementation**:
1. **Email Resolution**: For emails, first call `contacts/search` to get contact ID
   ```json
   POST /contacts/search
   {
     "query": {
       "field": "email",
       "operator": "=",
       "value": "user@example.com"
     }
   }
   ```

2. **Conversation Retrieval**: Use contact ID to get conversations
   ```
   GET /contacts/{contact_id}/conversations
   ```

3. **Date Filtering**: Convert dates to Unix timestamps and filter post-retrieval
   ```javascript
   const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
   const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
   ```

4. **Keyword Filtering**: Implemented post-retrieval by scanning conversation content
   - Ideally would use search endpoint with `source.body` filtering:
   ```json
   POST /conversations/search
   {
     "query": {
       "operator": "AND",
       "value": [
         {"field": "source.body", "operator": "~", "value": "keyword"}
       ]
     }
   }
   ```

### 2. search_tickets_by_status

**Implementation Parameters**:
- `status` (open/pending/resolved)
- Date parameters (DD/MM/YYYY)

**Intercom API Implementation**:
1. **Status Mapping**:
   ```json
   {
     "open": "open",
     "pending": "snoozed",
     "resolved": "closed"
   }
   ```

2. **Search Query Construction**:
   ```json
   POST /tickets/search
   {
     "query": {
       "operator": "AND",
       "value": [
         {
           "field": "state",
           "operator": "=",
           "value": "open" // or "snoozed" or "closed"
         },
         {
           "field": "created_at",
           "operator": ">=",
           "value": 1640995200 // Unix timestamp
         }
       ]
     }
   }
   ```

### 3. list_conversations

**Implementation Parameters**:
- 7-day date range limit
- Post-retrieval keyword/exclusion filtering

**Intercom API Implementation**:
1. **Retrieval**: Uses conversations endpoint with pagination
   ```
   GET /conversations?per_page=150
   ```

2. **Pagination**: Uses cursor-based pagination with `starting_after`
   ```
   GET /conversations?starting_after=convo_123&per_page=150
   ```

3. **Filtering**: Applies date and keyword filters after retrieval
   - Ideally would use search endpoint with `created_at` and `source.body` filtering
   ```json
   POST /conversations/search
   {
     "query": {
       "operator": "AND",
       "value": [
         {"field": "created_at", "operator": ">=", "value": 1640995200},
         {"field": "created_at", "operator": "<=", "value": 1641599999},
         {"field": "source.body", "operator": "~", "value": "keyword"}
       ]
     }
   }
   ```

### 4. search_tickets_by_customer

**Implementation Parameters**:
- `customerIdentifier` (email/ID)
- Date parameters (DD/MM/YYYY)

**Intercom API Implementation**:
1. **Contact Resolution**: Same as `search_conversations_by_customer`

2. **Ticket Search**:
   ```json
   POST /tickets/search
   {
     "query": {
       "operator": "AND",
       "value": [
         {
           "field": "contact_ids",
           "operator": "=", 
           "value": "contact_123" // From resolution step
         },
         {
           "field": "created_at",
           "operator": ">=",
           "value": 1640995200 // Unix timestamp
         }
       ]
     }
   }
   ```

## Optimization Opportunities

1. **Use Search Endpoint**: When possible, leverage Intercom's search capabilities with proper field filtering instead of post-retrieval filtering

2. **Batch Processing**: For large datasets, implement consistent batching strategy to prevent API rate limits and memory issues

3. **Error Handling**: Improve error detection and recovery for common API failures like rate limits (429) and invalid parameters (400)

4. **Date Handling**: Consider updating endpoints to accept ISO8601 or Unix timestamps directly, which would simplify conversion to Intercom's format

## References

- [Intercom Search Conversations API](https://developers.intercom.com/docs/references/2.4/rest-api/conversations/search-for-conversations)
- [Intercom Search Tickets API](https://developers.intercom.com/docs/references/2.10/rest-api/api.intercom.io/tickets/searchtickets)
- [Intercom List Conversations API](https://developers.intercom.com/docs/references/1.2/rest-api/conversations/list-conversations)
- [Intercom Search Contacts API](https://developers.intercom.com/docs/references/2.5/rest-api/contacts/search-for-contacts)