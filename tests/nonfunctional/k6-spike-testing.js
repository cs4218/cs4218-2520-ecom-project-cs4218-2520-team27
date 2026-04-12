// Kim Hofmann, A0337805Y

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const API_BASE_URL = __ENV.API_BASE_URL || "http://localhost:6060";
const FRONTEND_BASE_URL = __ENV.FRONTEND_BASE_URL || "http://localhost:3000";
const SEARCH_KEYWORD = __ENV.SEARCH_KEYWORD || "laptop";

const errorRate = new Rate("errors");
const getProductTrend = new Trend("get_product_duration");
const searchTrend = new Trend("search_duration");
const checkoutTokenTrend = new Trend("checkout_token_duration");

export const options = {
  discardResponseBodies: true,
  scenarios: {
    spike_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 50 },  // Ramp up to normal load
        { duration: "10s", target: 300 }, // SPIKE: Rapidly ramp up to extreme load
        { duration: "20s", target: 300 }, // Hold peak briefly
        { duration: "10s", target: 50 },  // Drop back down to normal load
        { duration: "10s", target: 0 },   // Scale down to 0
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    errors: ["rate<0.10"], // Error rate should be less than 10% even during peak
    get_product_duration: ["p(95)<3500"], // 95% of product requests should be < 3.5s
    search_duration: ["p(95)<4000"], // Search can be heavier, should be < 4s
    checkout_token_duration: ["p(95)<4000"], // Checkout token should remain responsive
    http_req_duration: ["p(95)<4000"], // Overall 95th percentile response time
  },
};

export default function spikeTest() {
  // Kim Hofmann, A0337805Y
  group("Spike - Product Discovery & Search", () => {
    const homeRes = http.get(`${FRONTEND_BASE_URL}/`, {
      tags: { endpoint: "spike_home" }
    });
    
    check(homeRes, {
      "home page status is 200": (r) => r.status === 200,
    });
    errorRate.add(homeRes.status !== 200);

    const listRes = http.get(`${API_BASE_URL}/api/v1/product/product-list/1`, {
      tags: { endpoint: "spike_product_list" },
    });
    
    getProductTrend.add(listRes.timings.duration);
    check(listRes, {
      "product list status is 200": (r) => r.status === 200,
    });
    errorRate.add(listRes.status !== 200);

    const searchRes = http.get(
      `${API_BASE_URL}/api/v1/product/search/${encodeURIComponent(SEARCH_KEYWORD)}`,
      { tags: { endpoint: "spike_search" } }
    );
    
    searchTrend.add(searchRes.timings.duration);
    check(searchRes, {
      "search status is 200": (r) => r.status === 200,
    });
    errorRate.add(searchRes.status !== 200);

    const checkoutTokenRes = http.get(`${API_BASE_URL}/api/v1/product/braintree/token`, {
      tags: { endpoint: "spike_checkout_token" },
    });

    checkoutTokenTrend.add(checkoutTokenRes.timings.duration);
    check(checkoutTokenRes, {
      "checkout token endpoint reachable": (r) => r.status < 500,
    });
    errorRate.add(checkoutTokenRes.status >= 500);
  });

  sleep(1);
}

