export const ORDER_SELECT = `
  *,
  customer:Customer!customerId(*),
  assignedTo:User!assignedToId(*),
  invoice:Invoice!orderId(*),
  statusHistory:OrderHistory!orderId(*),
  items:OrderItem!orderId(*, assignedTo:User!assignedToId(id,name,role,position))
`;
