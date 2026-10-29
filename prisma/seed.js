import "dotenv/config";
import argon2 from "argon2";
import prisma from "../src/lib/prisma.js";

const categories = [
  { name: "Apparel", slug: "demo-apparel" },
  { name: "Home & Living", slug: "demo-home-living" },
  { name: "Electronics", slug: "demo-electronics" },
  { name: "Accessories", slug: "demo-accessories" },
  { name: "Sports & Outdoors", slug: "demo-sports-outdoors" },
  { name: "Books & Stationery", slug: "demo-books-stationery" },
  { name: "Beauty & Personal Care", slug: "demo-beauty-care" },
  { name: "Toys & Games", slug: "demo-toys-games" },
  { name: "Kitchen & Dining", slug: "demo-kitchen-dining" },
  { name: "Office Supplies", slug: "demo-office-supplies" },
];

const productNamesByCategory = [
  [
    "T-Shirt",
    "Hoodie",
    "Sweatshirt",
    "Jeans",
    "Chinos",
    "Jacket",
    "Polo Shirt",
    "Shorts",
    "Cardigan",
    "Raincoat",
  ],
  [
    "Mug",
    "Cushion",
    "Throw Blanket",
    "Table Lamp",
    "Wall Clock",
    "Vase",
    "Storage Basket",
    "Desk Organizer",
    "Photo Frame",
    "Scented Candle",
  ],
  [
    "Desk Lamp",
    "Wireless Mouse",
    "Keyboard",
    "Headphones",
    "USB Hub",
    "Webcam",
    "Bluetooth Speaker",
    "Power Bank",
    "Monitor Stand",
    "Phone Charger",
  ],
  [
    "Backpack",
    "Wallet",
    "Belt",
    "Sunglasses",
    "Watch Strap",
    "Keychain",
    "Travel Pouch",
    "Card Holder",
    "Cap",
    "Tote Bag",
  ],
  [
    "Yoga Mat",
    "Water Bottle",
    "Gym Bag",
    "Resistance Bands",
    "Skipping Rope",
    "Camping Lantern",
    "Travel Pillow",
    "Sports Towel",
    "Hiking Bottle",
    "Training Gloves",
  ],
  [
    "Notebook",
    "Planner",
    "Sketchbook",
    "Ballpoint Pen Set",
    "Desk Calendar",
    "Bookmark Set",
    "Drawing Pencils",
    "Document Folder",
    "Sticky Notes",
    "Journal",
  ],
  [
    "Face Cleanser",
    "Moisturizer",
    "Hand Cream",
    "Shampoo",
    "Conditioner",
    "Body Lotion",
    "Lip Balm Set",
    "Bath Salts",
    "Hair Brush",
    "Travel Toiletry Kit",
  ],
  [
    "Building Blocks",
    "Puzzle",
    "Board Game",
    "Plush Toy",
    "Toy Car Set",
    "Craft Kit",
    "Card Game",
    "Model Kit",
    "Doll Set",
    "Science Kit",
  ],
  [
    "Chef Knife",
    "Cutting Board",
    "Mixing Bowl",
    "Frying Pan",
    "Food Container",
    "Measuring Cup Set",
    "Tea Kettle",
    "Apron",
    "Serving Tray",
    "Spice Rack",
  ],
  [
    "Office Chair Cushion",
    "Laptop Stand",
    "File Organizer",
    "Desk Mat",
    "Pen Holder",
    "Stapler",
    "Task Light",
    "Cable Organizer",
    "Whiteboard",
    "Paper Tray",
  ],
];

// Every variable product uses explicit combinations of option values.
const optionTemplates = [
  [
    { name: "Size", values: ["Small", "Medium", "Large"] },
    { name: "Color", values: ["Black", "White"] },
  ],
  [
    { name: "Color", values: ["Black", "Blue", "Green"] },
    { name: "Material", values: ["Cotton", "Polyester"] },
  ],
  [
    { name: "Size", values: ["Standard", "Large"] },
    { name: "Finish", values: ["Matte", "Glossy"] },
  ],
  [{ name: "Capacity", values: ["250 ml", "500 ml", "1 L"] }],
  [{ name: "Pack Size", values: ["Single", "Pack of 2", "Pack of 4"] }],
];

const SIMPLE_PRODUCT_COUNT = 50;
const VARIABLE_PRODUCT_COUNT = 50;
const DEMO_USER_COUNT = 25;
const DEMO_PASSWORD = "DemoPass123!";

function buildVariants(productNumber, options, basePrice) {
  if (options.length === 0) {
    return [
      {
        sku: `DEMO-PRODUCT-${String(productNumber).padStart(3, "0")}-SIMPLE`,
        price: basePrice,
        stock: (productNumber * 7) % 41,
        options: {},
      },
    ];
  }

  let combinations = [{}];

  for (const option of options) {
    combinations = combinations.flatMap((combination) =>
      option.values.map((value) => ({
        ...combination,
        [option.name]: value,
      })),
    );
  }

  // Limit combinations to keep the demo catalogue manageable.
  combinations = combinations.slice(0, 6);

  return combinations.map((selectedOptions, index) => {
    const optionCode = Object.values(selectedOptions)
      .map((value) => value.replace(/[^a-z0-9]/gi, "").toUpperCase())
      .join("-");

    return {
      sku: `DEMO-PRODUCT-${String(productNumber).padStart(3, "0")}-${optionCode}`,
      price: basePrice + index * 125,
      stock: (productNumber * 5 + index * 3) % 36,
      options: selectedOptions,
    };
  });
}

function buildProducts() {
  const result = [];

  for (
    let number = 1;
    number <= SIMPLE_PRODUCT_COUNT + VARIABLE_PRODUCT_COUNT;
    number += 1
  ) {
    const categoryIndex = (number - 1) % categories.length;

    const itemIndex = Math.floor((number - 1) / categories.length) % 10;

    const category = categories[categoryIndex];
    const productName = productNamesByCategory[categoryIndex][itemIndex];

    const isVariable = number > SIMPLE_PRODUCT_COUNT;
    const basePrice = 500 + ((number * 137) % 9500);

    const options = isVariable
      ? optionTemplates[
          (number - SIMPLE_PRODUCT_COUNT - 1) % optionTemplates.length
        ].map((option, index) => ({
          ...option,
          position: index + 1,
        }))
      : [];

    result.push({
      categorySlug: category.slug,
      title: `${productName} Model ${String(number).padStart(3, "0")}`,
      slug: `demo-product-${String(number).padStart(3, "0")}`,
      description: `Demo ${productName.toLowerCase()} for testing product listings, product details, pricing, stock, and ${
        isVariable ? "variant selection" : "simple-product purchase flows"
      }.`,
      basePrice,
      options,
      variants: buildVariants(number, options, basePrice),
    });
  }

  return result;
}

const products = buildProducts();

async function seedDemoData() {
  const isDemoReset = process.argv.includes("--reset-demo");

  if (process.env.RUN_DEMO_SEED !== "YES") {
    throw new Error(
      "Set RUN_DEMO_SEED=YES to confirm that you want to seed this database.",
    );
  }

  if (isDemoReset && process.env.RUN_DEMO_RESET !== "YES") {
    throw new Error(
      "Set RUN_DEMO_RESET=YES to confirm that you want to reset the demo database.",
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);

  if (isDemoReset) {
    const databaseName = decodeURIComponent(
      databaseUrl.pathname.replace(/^\/+/, ""),
    );

    if (databaseName !== "varianta_db") {
      throw new Error(
        `Demo reset is only allowed for varianta_db. Current database: ${
          databaseName || "(unknown)"
        }`,
      );
    }
  }

  console.log(
    `${isDemoReset ? "Resetting and seeding" : "Seeding"} database: ${
      databaseUrl.host
    }${databaseUrl.pathname}`,
  );

  // All demo accounts use this password.
  // Never use these credentials for real accounts.
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  await prisma.$transaction(async (tx) => {
    if (isDemoReset) {
      // Preserves Admin users but deletes all orders, regular users,
      // products, and categories in the selected database.
      await tx.order.deleteMany({});
      await tx.user.deleteMany({
        where: { role: "User" },
      });
      await tx.product.deleteMany({});
      await tx.category.deleteMany({});

      console.log("Previous data cleared (Admin users were preserved).");
    }

    const categoryIds = new Map();

    for (const category of categories) {
      const record = await tx.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category,
      });

      categoryIds.set(category.slug, record.id);
    }

    for (const productData of products) {
      const { categorySlug, options, variants, ...productFields } = productData;

      const categoryId = categoryIds.get(categorySlug);

      if (!categoryId) {
        throw new Error(`Category not found: ${categorySlug}`);
      }

      const product = await tx.product.upsert({
        where: { slug: productFields.slug },
        update: {
          categoryId,
          title: productFields.title,
          description: productFields.description,
          basePrice: productFields.basePrice,
        },
        create: {
          ...productFields,
          categoryId,
        },
      });

      const optionValueIds = new Map();

      for (const optionData of options) {
        const { values, ...optionFields } = optionData;

        const option = await tx.productOption.upsert({
          where: {
            productId_name: {
              productId: product.id,
              name: optionFields.name,
            },
          },
          update: {
            position: optionFields.position,
          },
          create: {
            ...optionFields,
            productId: product.id,
          },
        });

        for (const [index, valueName] of values.entries()) {
          const value = await tx.optionValue.upsert({
            where: {
              optionId_name: {
                optionId: option.id,
                name: valueName,
              },
            },
            update: {
              position: index + 1,
            },
            create: {
              optionId: option.id,
              name: valueName,
              position: index + 1,
            },
          });

          optionValueIds.set(`${optionFields.name}:${valueName}`, value.id);
        }
      }

      for (const variantData of variants) {
        const variant = await tx.variant.upsert({
          where: { sku: variantData.sku },
          update: {
            productId: product.id,
            price: variantData.price,
            // Preserve existing stock on a normal seed run.
          },
          create: {
            productId: product.id,
            sku: variantData.sku,
            price: variantData.price,
            stock: variantData.stock,
          },
        });

        for (const [optionName, valueName] of Object.entries(
          variantData.options,
        )) {
          const optionValueId = optionValueIds.get(
            `${optionName}:${valueName}`,
          );

          if (!optionValueId) {
            throw new Error(
              `Missing option value "${optionName}: ${valueName}" for ${variantData.sku}`,
            );
          }

          await tx.variantOptionValue.upsert({
            where: {
              variantId_optionValueId: {
                variantId: variant.id,
                optionValueId,
              },
            },
            update: {},
            create: {
              variantId: variant.id,
              optionValueId,
            },
          });
        }
      }
    }

    for (let number = 1; number <= DEMO_USER_COUNT; number += 1) {
      const suffix = String(number).padStart(3, "0");

      await tx.user.upsert({
        where: {
          email: `demo.user${suffix}@example.com`,
        },
        update: {
          name: `Demo User ${suffix}`,
          passwordHash,
          role: "User",
        },
        create: {
          name: `Demo User ${suffix}`,
          email: `demo.user${suffix}@example.com`,
          passwordHash,
          role: "User",
        },
      });
    }
  });

  const variantCount = products.reduce(
    (total, product) => total + product.variants.length,
    0,
  );

  console.log("Demo data seeded successfully.");
  console.log(`Categories in seed: ${categories.length}`);
  console.log(
    `Products in seed: ${products.length} (${SIMPLE_PRODUCT_COUNT} simple, ${VARIABLE_PRODUCT_COUNT} variable)`,
  );
  console.log(`Variants in seed: ${variantCount}`);
  console.log(`Demo users in seed: ${DEMO_USER_COUNT}`);
  console.log(`Demo login password for all demo users: ${DEMO_PASSWORD}`);
}

try {
  await seedDemoData();
} catch (error) {
  console.error("Demo seeding failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
