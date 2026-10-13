import orderData from "../data/order.data.js";

const allowedTransitions = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["COMPLETED"],
  CANCELLED: [],
  COMPLETED: [],
};

const createOrder = async (userId, items) => {
  return orderData.create(userId, items);
};

const getOrders = async (userId) => {
  return orderData.findManyByUserId(userId);
};

const getOrder = async (userId, orderId) => {
  return orderData.findById(userId, orderId);
};

const updateOrderStatus = async (orderId, status) => {
  const order = await orderData.findStatusById(orderId);

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  if (order.status === status) {
    return orderData.findByIdForAdmin(orderId);
  }

  const allowedStatuses = allowedTransitions[order.status];

  if (!allowedStatuses.includes(status)) {
    const error = new Error("Invalid order status transition");
    error.statusCode = 409;
    throw error;
  }

  return orderData.updateStatus(orderId, order.status, status);
};

export { createOrder, getOrders, getOrder, updateOrderStatus };
