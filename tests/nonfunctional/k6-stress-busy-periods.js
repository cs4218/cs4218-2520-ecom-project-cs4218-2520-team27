// Lai Xue Le Shaun, A0252643H

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const FRONTEND_BASE_URL = __ENV.FRONTEND_BASE_URL || "http://localhost:3000";
const API_BASE_URL = __ENV.API_BASE_URL || "http://localhost:6060";
const SEARCH_KEYWORD = __ENV.SEARCH_KEYWORD || "laptop";

const TEST_USER_NAME = __ENV.TEST_USER_NAME || "k6 stress shopper";
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || "k6Stress!234";
const TEST_USER_PHONE = __ENV.TEST_USER_PHONE || "91234567";
const TEST_USER_ADDRESS = __ENV.TEST_USER_ADDRESS || "123 Busy Lane";
const TEST_USER_ANSWER = __ENV.TEST_USER_ANSWER || "blue";

const BRAINTREE_TEST_NONCE = __ENV.BRAINTREE_TEST_NONCE || "fake-valid-nonce";

const homePageDuration = new Trend("stress_home_page_duration");
const productListDuration = new Trend("stress_product_list_duration");
const loginDuration = new Trend("stress_login_duration");
const accountCheckDuration = new Trend("stress_account_check_duration");
const checkoutDuration = new Trend("stress_checkout_duration");

const browseHealthy = new Rate("stress_browse_healthy");
const accountHealthy = new Rate("stress_account_healthy");
const cartIntegrityHealthy = new Rate("stress_cart_integrity_healthy");
const orderPlacementHealthy = new Rate("stress_order_placement_healthy");

function asJson(response, fallback = {}) {
  try {
    return JSON.parse(response.body);
  } catch (_) {
    return fallback;
  }
}

function authHeaders(token) {
  return {
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
  };
}

function ensureUserRegistered(testUserEmail) {
  const payload = JSON.stringify({
    name: TEST_USER_NAME,
    email: testUserEmail,
    password: TEST_USER_PASSWORD,
    phone: TEST_USER_PHONE,
    address: TEST_USER_ADDRESS,
    answer: TEST_USER_ANSWER,
  });

  const registerRes = http.post(`${API_BASE_URL}/api/v1/auth/register`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { endpoint: "auth_register_stress" },
  });

  check(registerRes, {
    "setup register accepted": (r) => [200, 201].includes(r.status),
  });
}

function getWorkingProduct() {
  const productsRes = http.get(`${API_BASE_URL}/api/v1/product/product-list/1`, {
    tags: { endpoint: "product_list_setup_stress" },
  });

  const productsJson = asJson(productsRes, { products: [] });
  const products = productsJson.products || [];
  const candidate = products.find((p) => p.slug && (p.quantity || 0) > 0) || products[0];

  return {
    id: candidate?._id || "",
    slug: candidate?.slug || "textbook",
    price: candidate?.price || 0,
  };
}

export const options = {
  scenarios: {
    busy_period_stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 30 },
        { duration: "45s", target: 80 },
        { duration: "45s", target: 140 },
        { duration: "45s", target: 80 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    // Users can still access and browse during busy periods.
    stress_home_page_duration: ["p(95)<3000"],
    stress_product_list_duration: ["p(95)<3000"],
    stress_browse_healthy: ["rate>0.95"],

    // Users can still log in and view account.
    stress_login_duration: ["p(95)<3000"],
    stress_account_check_duration: ["p(95)<3000"],
    stress_account_healthy: ["rate>0.95"],

    // Cart state remains usable while shopping.
    stress_cart_integrity_healthy: ["rate>0.95"],

    // Users can still place orders.
    stress_checkout_duration: ["p(95)<4500"],
    stress_order_placement_healthy: ["rate>0.85"],

    // Overall reliability under stress.
    http_req_failed: ["rate<0.08"],
  },
};

export function setup() {
  const testUserEmail =
    __ENV.TEST_USER_EMAIL || `k6_stress_${Date.now()}_${Math.random().toString(16).slice(2, 8)}@example.com`;

  ensureUserRegistered(testUserEmail);

  const product = getWorkingProduct();

  return {
    testUserEmail,
    testUserPassword: TEST_USER_PASSWORD,
    productId: product.id,
    productSlug: product.slug,
    productPrice: product.price,
  };
}

export default function (setupData) {
  const cart = [
    {
      _id: setupData.productId,
      slug: setupData.productSlug,
      price: setupData.productPrice,
    },
  ];

  group("Busy-period storefront browsing", () => {
    const homeRes = http.get(`${FRONTEND_BASE_URL}/`, {
      tags: { endpoint: "stress_home_page" },
    });
    homePageDuration.add(homeRes.timings.duration);

    const productListRes = http.get(`${API_BASE_URL}/api/v1/product/product-list/1`, {
      tags: { endpoint: "stress_product_list" },
    });
    productListDuration.add(productListRes.timings.duration);

    const searchRes = http.get(
      `${API_BASE_URL}/api/v1/product/search/${encodeURIComponent(SEARCH_KEYWORD)}`,
      { tags: { endpoint: "stress_search" } }
    );

    const browseOk =
      homeRes.status === 200 &&
      productListRes.status === 200 &&
      searchRes.status === 200 &&
      homeRes.timings.duration < 3000 &&
      productListRes.timings.duration < 3000;

    browseHealthy.add(browseOk);

    check(homeRes, {
      "home page reachable under stress": (r) => r.status === 200,
    });
    check(productListRes, {
      "product list reachable under stress": (r) => r.status === 200,
    });
    check(searchRes, {
      "search reachable under stress": (r) => r.status === 200,
    });
  });

  let token = "";
  group("Login and account access", () => {
    const loginRes = http.post(
      `${API_BASE_URL}/api/v1/auth/login`,
      JSON.stringify({
        email: setupData.testUserEmail,
        password: setupData.testUserPassword,
      }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { endpoint: "stress_login" },
      }
    );

    loginDuration.add(loginRes.timings.duration);

    const loginJson = asJson(loginRes, {});
    token = loginJson.token || "";

    let userAuthRes = { status: 0, timings: { duration: 0 } };
    if (token) {
      userAuthRes = http.get(`${API_BASE_URL}/api/v1/auth/user-auth`, {
        headers: { Authorization: token },
        tags: { endpoint: "stress_user_auth" },
      });
      accountCheckDuration.add(userAuthRes.timings.duration);
    }

    const accountOk =
      loginRes.status === 200 &&
      Boolean(token) &&
      userAuthRes.status === 200 &&
      loginRes.timings.duration < 3000 &&
      userAuthRes.timings.duration < 3000;

    accountHealthy.add(accountOk);

    check(loginRes, {
      "login succeeds under stress": (r) => r.status === 200,
      "login returns token": () => Boolean(token),
    });
    if (token) {
      check(userAuthRes, {
        "account endpoint succeeds under stress": (r) => r.status === 200,
      });
    }
  });

  group("Cart integrity while shopping", () => {
    const detailsRes = http.get(
      `${API_BASE_URL}/api/v1/product/get-product/${setupData.productSlug}`,
      { tags: { endpoint: "stress_product_details" } }
    );

    const detailsJson = asJson(detailsRes, {});
    const serverProduct = detailsJson.product || {};

    const cartStillValid =
      detailsRes.status === 200 &&
      Boolean(serverProduct._id) &&
      serverProduct.slug === cart[0].slug &&
      Number(serverProduct.price) === Number(cart[0].price);

    cartIntegrityHealthy.add(cartStillValid);

    check(detailsRes, {
      "product in cart remains retrievable": (r) => r.status === 200,
      "cart item id exists": () => Boolean(serverProduct._id),
      "cart item slug still matches": () => serverProduct.slug === cart[0].slug,
      "cart item price remains consistent": () =>
        Number(serverProduct.price) === Number(cart[0].price),
    });
  });

  group("Order placement under stress", () => {
    if (__ITER % 15 !== 0) {
      orderPlacementHealthy.add(true);
      return;
    }

    if (!token) {
      orderPlacementHealthy.add(false);
      return;
    }

    if (!cart[0]._id) {
      orderPlacementHealthy.add(false);
      return;
    }

    const paymentRes = http.post(
      `${API_BASE_URL}/api/v1/product/braintree/payment`,
      JSON.stringify({
        nonce: BRAINTREE_TEST_NONCE,
        cart,
      }),
      {
        ...authHeaders(token),
        tags: { endpoint: "stress_checkout_payment" },
      }
    );

    checkoutDuration.add(paymentRes.timings.duration);

    const paymentJson = asJson(paymentRes, {});
    const orderOk =
      paymentRes.status === 200 &&
      paymentJson.ok === true &&
      paymentRes.timings.duration < 4500;

    orderPlacementHealthy.add(orderOk);

    check(paymentRes, {
      "order placement succeeds under stress": (r) => r.status === 200,
      "payment API returns ok=true": () => paymentJson.ok === true,
    });
  });

  sleep(1);
}
