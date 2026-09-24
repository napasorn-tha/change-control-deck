# Code Artefacts — Customer Outbound Change

Request: Synthetic AI demo
Change type: Data Outbound

## Objects

- Source model: curated.customer
- Target table: customer_v2
- Outbound job: dwh_customer_outbound_v2
- Delivery: daily 22:00 Asia/Bangkok
- Primary key: customer_id

## Change

The outbound mapping adds loyalty_tier and customer_status and writes to customer_v2.

## Failure handling

The job stops on schema mismatch and writes an error event to the operational log.
