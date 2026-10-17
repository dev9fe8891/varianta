import request from "supertest";
import app from "../../src/app.js";

const TEST_ORIGIN = "http://localhost:5173";

const withOrigin = (client) => ({
  get: (url) => client.get(url),

  post: (url) => client.post(url).set("Origin", TEST_ORIGIN),

  put: (url) => client.put(url).set("Origin", TEST_ORIGIN),

  patch: (url) => client.patch(url).set("Origin", TEST_ORIGIN),

  delete: (url) => client.delete(url).set("Origin", TEST_ORIGIN),
});

const apiRequest = withOrigin(request(app));

apiRequest.agent = () => withOrigin(request.agent(app));

export { apiRequest, TEST_ORIGIN };
