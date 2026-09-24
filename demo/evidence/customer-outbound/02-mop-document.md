# MOP — Customer Outbound v2

## Objective

Deploy the updated customer outbound job to Production.

## Target

- Environment: Production
- Target table: customer_v2
- Job: dwh_customer_outbound_v2

## Steps

1. Confirm approved Git merge request.
2. Pause the existing outbound schedule.
3. Deploy the new transformation package.
4. Validate connectivity.
5. Run one controlled outbound batch.
6. Validate row counts and sample records.
7. Resume the 22:00 schedule.

## Validation

- row-count variance below 0.5%
- no schema errors
- loyalty_tier populated for eligible customers

## Rollback

Rollback owner: Data Engineering.

> Note for AI demo: the detailed rollback procedure is intentionally omitted from this synthetic MOP.
