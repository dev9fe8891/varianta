import orderData from "../data/order.data.js";

const createOrder = async (userId, data) => {
  return orderData.create(userId, data);
};

const getOrders = async (userId, query) => {
  const { sort, order, page, limit } = query;

  const skip = (page - 1) * limit;

  const { orders, total } = await orderData.findManyByUserId(userId, {
    sort,
    order,
    skip,
    take: limit,
  });

  return {
    data: orders,
    pagination: {
      page,
      limit,
      total,
      pageCount: Math.ceil(total / limit),
    },
  };
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
