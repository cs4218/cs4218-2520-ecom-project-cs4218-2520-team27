// Lee Wen Jun, A0235164J

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const FRONTEND_BASE_URL = __ENV.FRONTEND_BASE_URL || "http://localhost:3000";
const API_BASE_URL = __ENV.API_BASE_URL || "http://localhost:6060";
const PRODUCT_SLUG = __ENV.PRODUCT_SLUG || "textbook";
const SEARCH_KEYWORD = __ENV.SEARCH_KEYWORD || "laptop";

const TEST_USER_NAME = __ENV.TEST_USER_NAME || "k6 shopper";
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || `k6_${Date.now()}@example.com`;
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || "k6Pass!234";
const TEST_USER_PHONE = __ENV.TEST_USER_PHONE || "91234567";
const TEST_USER_ADDRESS = __ENV.TEST_USER_ADDRESS || "123 k6 Lane";
const TEST_USER_ANSWER = __ENV.TEST_USER_ANSWER || "blue";

const pageLoadFast = new Rate("page_load_fast");
const searchFast = new Rate("search_responsive_fast");
const addToCartFast = new Rate("add_to_cart_action_fast");
const checkoutFast = new Rate("checkout_flow_fast");

const homePageTrend = new Trend("home_page_duration");
const productPageTrend = new Trend("product_page_duration");
const checkoutPageTrend = new Trend("checkout_page_duration");

function getJson(response, fallback = {}) {
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

export const options = {
  scenarios: {
    normal_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 25 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "20s",
    },
  },
  thresholds: {
    // Acceptance criteria: pages stay under 2.5s at p95.
    home_page_duration: ["p(95)<2500"],
    product_page_duration: ["p(95)<2500"],
    checkout_page_duration: ["p(95)<2500"],

    // Acceptance criteria: searches feel responsive.
    search_responsive_fast: ["rate>0.95"],

    // Acceptance criteria: add to cart flow stays fast.
    add_to_cart_action_fast: ["rate>0.95"],

    // Acceptance criteria: checkout flow stays fast.
    checkout_flow_fast: ["rate>0.90"],

    // General service health target during load.
    http_req_failed: ["rate<0.05"],
  },
};

export function setup() {
  // Create and authenticate one reusable shopper account for checkout APIs.
  const registerPayload = JSON.stringify({
    name: TEST_USER_NAME,
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    phone: TEST_USER_PHONE,
    address: TEST_USER_ADDRESS,
    answer: TEST_USER_ANSWER,
  });

  const registerRes = http.post(
    `${API_BASE_URL}/api/v1/auth/register`,
    registerPayload,
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "auth_register" },
    }
  );

  check(registerRes, {
    "register request accepted": (r) => [200, 201].includes(r.status),
  });

  const loginRes = http.post(
    `${API_BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "auth_login" },
    }
  );

  const loginJson = getJson(loginRes, {});
  check(loginRes, {
    "login succeeded": (r) => r.status === 200,
    "token returned": () => Boolean(loginJson.token),
  });

  // Fetch product list once so each VU can pick a real product quickly.
  const productsRes = http.get(
    `${API_BASE_URL}/api/v1/product/product-list/1`,
    { tags: { endpoint: "product_list_setup" } }
  );
  const productsJson = getJson(productsRes, { products: [] });
  const candidate = productsJson.products?.find((p) => p.slug) || null;

  return {
    token: loginJson.token || "",
    productSlug: candidate?.slug || PRODUCT_SLUG,
    productId: candidate?._id || "",
    productPrice: candidate?.price || 0,
    categoryId: candidate?.category?._id || "",
  };
}

export default function (setupData) {
  // Evan Lee, STUDENT_ID
  group("Home Page Load", () => {
    const homePageRes = http.get(`${FRONTEND_BASE_URL}/`, {
      tags: { endpoint: "page_home" },
    });
    homePageTrend.add(homePageRes.timings.duration);
    const homeFast = homePageRes.timings.duration < 2500;
    pageLoadFast.add(homeFast);

    check(homePageRes, {
      "home page status is 200": (r) => r.status === 200,
      "home page under 2.5s": () => homeFast,
    });

    const categoryRes = http.get(`${API_BASE_URL}/api/v1/category/get-category`, {
      tags: { endpoint: "get_category" },
    });
    check(categoryRes, {
      "categories API status is 200": (r) => r.status === 200,
    });

    const listRes = http.get(`${API_BASE_URL}/api/v1/product/product-list/1`, {
      tags: { endpoint: "product_list" },
    });
    check(listRes, {
      "product list API status is 200": (r) => r.status === 200,
    });
  });

  // Evan Lee, STUDENT_ID
  group("Product Discovery And Search", () => {
    const searchRes = http.get(
      `${API_BASE_URL}/api/v1/product/search/${encodeURIComponent(SEARCH_KEYWORD)}`,
      { tags: { endpoint: "search" } }
    );
    const searchIsFast = searchRes.timings.duration < 2500;
    searchFast.add(searchIsFast);

    check(searchRes, {
      "search API status is 200": (r) => r.status === 200,
      "search API under 2.5s": () => searchIsFast,
    });

    const slug = setupData.productSlug || PRODUCT_SLUG;
    const productPageRes = http.get(`${FRONTEND_BASE_URL}/product/${slug}`, {
      tags: { endpoint: "page_product" },
    });
    productPageTrend.add(productPageRes.timings.duration);
    const productPageFast = productPageRes.timings.duration < 2500;
    pageLoadFast.add(productPageFast);

    check(productPageRes, {
      "product page status is 200": (r) => r.status === 200,
      "product page under 2.5s": () => productPageFast,
    });

    const productDetailsRes = http.get(
      `${API_BASE_URL}/api/v1/product/get-product/${slug}`,
      { tags: { endpoint: "product_details" } }
    );

    const detailsJson = getJson(productDetailsRes, {});
    check(productDetailsRes, {
      "product details API status is 200": (r) => r.status === 200,
      "product details returned": () => Boolean(detailsJson.product?._id),
    });

    const relatedPid = detailsJson.product?._id || setupData.productId;
    const relatedCid = detailsJson.product?.category?._id || setupData.categoryId;
    if (relatedPid && relatedCid) {
      const relatedRes = http.get(
        `${API_BASE_URL}/api/v1/product/related-product/${relatedPid}/${relatedCid}`,
        { tags: { endpoint: "related_products" } }
      );
      check(relatedRes, {
        "related products API status is 200": (r) => r.status === 200,
      });
    }
  });

  // Evan Lee, STUDENT_ID
  group("Cart And Checkout Journey", () => {
    const cartPageRes = http.get(`${FRONTEND_BASE_URL}/cart`, {
      tags: { endpoint: "page_cart" },
    });
    checkoutPageTrend.add(cartPageRes.timings.duration);
    const checkoutPageFast = cartPageRes.timings.duration < 2500;
    pageLoadFast.add(checkoutPageFast);

    check(cartPageRes, {
      "cart/checkout page status is 200": (r) => r.status === 200,
      "cart/checkout page under 2.5s": () => checkoutPageFast,
    });

    // Simulate add-to-cart responsiveness using product details fetch + local cart payload prep.
    const addToCartProbe = http.get(
      `${API_BASE_URL}/api/v1/product/get-product/${setupData.productSlug || PRODUCT_SLUG}`,
      { tags: { endpoint: "add_to_cart_probe" } }
    );
    const addToCartIsFast = addToCartProbe.timings.duration < 2500;
    addToCartFast.add(addToCartIsFast);

    check(addToCartProbe, {
      "add-to-cart probe status is 200": (r) => r.status === 200,
      "add-to-cart probe under 2.5s": () => addToCartIsFast,
    });

    // Checkout preparation: braintree token endpoint.
    const tokenRes = http.get(`${API_BASE_URL}/api/v1/product/braintree/token`, {
      tags: { endpoint: "braintree_token" },
    });
    const tokenFast = tokenRes.timings.duration < 2500;

    // Optional full checkout attempt: set BRAINTREE_TEST_NONCE to enable.
    const maybeNonce = __ENV.BRAINTREE_TEST_NONCE;
    if (maybeNonce && setupData.token && setupData.productSlug) {
      const paymentPayload = JSON.stringify({
        nonce: maybeNonce,
        cart: [
          {
            slug: setupData.productSlug,
            price: setupData.productPrice,
          },
        ],
      });

      const paymentRes = http.post(
        `${API_BASE_URL}/api/v1/product/braintree/payment`,
        paymentPayload,
        {
          ...authHeaders(setupData.token),
          tags: { endpoint: "braintree_payment" },
        }
      );

      const checkoutIsFast = tokenFast && paymentRes.timings.duration < 2500;
      checkoutFast.add(checkoutIsFast);

      check(paymentRes, {
        "payment endpoint responds without 5xx": (r) => r.status < 500,
        "checkout payment under 2.5s": (r) => r.timings.duration < 2500,
      });
    } else {
      // If nonce is unavailable, still assert checkout token flow responsiveness.
      checkoutFast.add(tokenFast);
    }

    check(tokenRes, {
      "braintree token endpoint reachable": (r) => r.status < 500,
      "checkout token step under 2.5s": () => tokenFast,
    });
  });

  sleep(1);
}
