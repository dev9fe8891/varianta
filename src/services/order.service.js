import orderData from "../data/order.data.js";

const createOrder = async (userId, items, expectedTotal) => {
  return orderData.create(userId, items, expectedTotal);
};

const getOrders = async (userId) => {
  return orderData.findManyByUserId(userId);
};

const getOrder = async (userId, orderId) => {
  return orderData.findById(userId, orderId);
};

const cancelOrder = async (userId, orderId) => {
  return orderData.cancelOrder(userId, orderId);
};

const updateOrderStatus = async (orderId, status) => {
  return orderData.updateStatus(orderId, status);
};

export { createOrder, getOrders, getOrder, cancelOrder, updateOrderStatus };
