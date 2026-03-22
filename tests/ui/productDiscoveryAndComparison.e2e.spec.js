import { test, expect } from "@playwright/test";

// Lai Xue Le Shaun, A0252643H

const PRODUCTS_PER_PAGE = 6;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const formatAsUsd = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

async function findProductWithRecommendations(request) {
  const countResponse = await request.get("/api/v1/product/product-count");
  if (!countResponse.ok()) return null;

  const countPayload = await countResponse.json();
  const totalProducts = countPayload?.total ?? 0;

  if (totalProducts < 1) return null;

  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const listResponse = await request.get(`/api/v1/product/product-list/${pageNumber}`);
    if (!listResponse.ok()) continue;

    const listPayload = await listResponse.json();
    const products = listPayload?.products ?? [];

    for (const candidate of products) {
      if (!candidate?._id || !candidate?.slug) continue;

      const detailResponse = await request.get(`/api/v1/product/get-product/${candidate.slug}`);
      if (!detailResponse.ok()) continue;

      const detailPayload = await detailResponse.json();
      const product = detailPayload?.product;
      const categoryId = product?.category?._id;

      if (!product?._id || !product?.slug || !product?.name || !categoryId) continue;

      const relatedResponse = await request.get(
        `/api/v1/product/related-product/${product._id}/${categoryId}`
      );
      if (!relatedResponse.ok()) continue;

      const relatedPayload = await relatedResponse.json();
      const relatedProducts = relatedPayload?.products ?? [];

      if (relatedProducts.length > 0) {
        return {
          product,
          recommendedProduct: relatedProducts[0],
        };
      }
    }
  }

  return null;
}

test.describe("UI: Shopper can browse and compare products", () => {
  test.describe("Live data AC coverage", () => {
    async function getLiveScenarioOrSkip(request) {
      const scenario = await findProductWithRecommendations(request);
      test.skip(
        !scenario,
        "Test data requires at least one product that has similar/recommended products."
      );
      return scenario;
    }

    async function goToHomeAndOpenLiveProduct(page, product) {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

      const browseCard = page
        .locator(".card")
        .filter({
          has: page.getByRole("heading", { name: product.name, exact: true }),
        })
        .first();

      await expect(browseCard).toBeVisible();
      await browseCard.getByRole("button", { name: "More Details" }).click();
      await expect(page).toHaveURL(new RegExp(`/product/${escapeRegExp(product.slug)}$`));
    }

    test("AC1 live-data: user can move from browsing results to product detail page", async ({
      page,
      request,
    }) => {
      const { product } = await getLiveScenarioOrSkip(request);
      await goToHomeAndOpenLiveProduct(page, product);

      await expect(page.getByRole("heading", { name: "Product Details" })).toBeVisible();
    });

    test("AC2 live-data: product detail page shows correct name, price, and category", async ({
      page,
      request,
    }) => {
      const { product } = await getLiveScenarioOrSkip(request);
      await goToHomeAndOpenLiveProduct(page, product);

      await expect(page.getByText(`Name : ${product.name}`, { exact: true })).toBeVisible();
      await expect(
        page.getByText(`Category : ${product.category.name}`, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(
          new RegExp(`Price\\s*:\\s*${escapeRegExp(formatAsUsd(product.price))}`)
        )
      ).toBeVisible();
    });

    test("AC3 live-data: recommended/similar products are shown when available", async ({
      page,
      request,
    }) => {
      const { product, recommendedProduct } = await getLiveScenarioOrSkip(request);
      await goToHomeAndOpenLiveProduct(page, product);

      const recommendationsSection = page.locator(".similar-products");
      await expect(
        recommendationsSection.getByRole("heading", { name: /Similar Products/i })
      ).toBeVisible();

      const recommendationCard = recommendationsSection
        .locator(".card")
        .filter({
          has: page.getByRole("heading", {
            name: recommendedProduct.name,
            exact: true,
          }),
        })
        .first();

      await expect(recommendationCard).toBeVisible();
    });

    test("AC4 live-data: user can open another product from recommendations", async ({
      page,
      request,
    }) => {
      const { product, recommendedProduct } = await getLiveScenarioOrSkip(request);
      await goToHomeAndOpenLiveProduct(page, product);

      const recommendationCard = page
        .locator(".similar-products .card")
        .filter({
          has: page.getByRole("heading", {
            name: recommendedProduct.name,
            exact: true,
          }),
        })
        .first();

      await expect(recommendationCard).toBeVisible();
      await recommendationCard.getByRole("button", { name: "More Details" }).click();

      await expect(page).toHaveURL(
        new RegExp(`/product/${escapeRegExp(recommendedProduct.slug)}$`)
      );
      await expect(
        page.getByText(`Name : ${recommendedProduct.name}`, { exact: true })
      ).toBeVisible();
    });
  });

  test.describe("Deterministic AC coverage with mocked data", () => {
    const mainProduct = {
      _id: "p-main-1",
      slug: "alpha-runner",
      name: "Alpha Runner",
      description: "Lightweight running shoe for everyday training sessions.",
      price: 129.99,
      category: {
        _id: "c-shoes-1",
        name: "Shoes",
      },
    };

    const recommendedProduct = {
      _id: "p-rec-1",
      slug: "beta-runner-pro",
      name: "Beta Runner Pro",
      description: "Stability-focused shoe for longer distance efforts.",
      price: 149.5,
      category: {
        _id: "c-shoes-1",
        name: "Shoes",
      },
    };

    async function setupMockCatalog(page) {
      await page.route("**/api/v1/category/get-category", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            category: [{ _id: "c-shoes-1", name: "Shoes", slug: "shoes" }],
          }),
        });
      });

      await page.route("**/api/v1/product/product-count", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, total: 1 }),
        });
      });

      await page.route("**/api/v1/product/product-list/1", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, products: [mainProduct] }),
        });
      });

      await page.route("**/api/v1/product/get-product/alpha-runner", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, product: mainProduct }),
        });
      });

      await page.route(
        "**/api/v1/product/related-product/p-main-1/c-shoes-1",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, products: [recommendedProduct] }),
          });
        }
      );

      await page.route("**/api/v1/product/get-product/beta-runner-pro", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, product: recommendedProduct }),
        });
      });

      await page.route(
        "**/api/v1/product/related-product/p-rec-1/c-shoes-1",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, products: [mainProduct] }),
          });
        }
      );

      await page.route("**/api/v1/product/product-photo/*", async (route) => {
        await route.fulfill({ status: 204, body: "" });
      });
    }

    async function goToHomeAndOpenMainProduct(page) {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

      const browseCard = page
        .locator(".card")
        .filter({
          has: page.getByRole("heading", { name: mainProduct.name, exact: true }),
        })
        .first();

      await expect(browseCard).toBeVisible();
      await browseCard.getByRole("button", { name: "More Details" }).click();
      await expect(page).toHaveURL(/\/product\/alpha-runner$/);
    }

    test.beforeEach(async ({ page }) => {
      await setupMockCatalog(page);
    });

    test("AC1: user can move from browsing results to product detail page", async ({
      page,
    }) => {
      await goToHomeAndOpenMainProduct(page);
      await expect(page.getByRole("heading", { name: "Product Details" })).toBeVisible();
    });

    test("AC2: product detail page shows correct name, price, and category", async ({
      page,
    }) => {
      await goToHomeAndOpenMainProduct(page);

      await expect(
        page.getByText(`Name : ${mainProduct.name}`, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(`Category : ${mainProduct.category.name}`, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(
          new RegExp(`Price\\s*:\\s*${escapeRegExp(formatAsUsd(mainProduct.price))}`)
        )
      ).toBeVisible();
    });

    test("AC3: recommended/similar products are shown when available", async ({ page }) => {
      await goToHomeAndOpenMainProduct(page);

      const recommendationsSection = page.locator(".similar-products");
      await expect(
        recommendationsSection.getByRole("heading", { name: /Similar Products/i })
      ).toBeVisible();
      await expect(
        recommendationsSection.getByRole("heading", {
          name: recommendedProduct.name,
          exact: true,
        })
      ).toBeVisible();
    });

    test("AC4: user can open another product from recommendations", async ({ page }) => {
      await goToHomeAndOpenMainProduct(page);

      const recommendationCard = page
        .locator(".similar-products .card")
        .filter({
          has: page.getByRole("heading", {
            name: recommendedProduct.name,
            exact: true,
          }),
        })
        .first();

      await expect(recommendationCard).toBeVisible();
      await recommendationCard.getByRole("button", { name: "More Details" }).click();

      await expect(page).toHaveURL(/\/product\/beta-runner-pro$/);
      await expect(
        page.getByText(`Name : ${recommendedProduct.name}`, { exact: true })
      ).toBeVisible();
    });
  });
});