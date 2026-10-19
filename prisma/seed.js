import "dotenv/config";
import prisma from "../src/lib/prisma.js";

const categories = [
  {
    name: "Apparel",
    slug: "demo-apparel",
  },
  {
    name: "Home & Living",
    slug: "demo-home-living",
  },
  {
    name: "Electronics",
    slug: "demo-electronics",
  },
];

const products = [
  {
    categorySlug: "demo-apparel",
    title: "Classic T-Shirt",
    slug: "demo-classic-t-shirt",
    description: "A configurable demo t-shirt.",
    basePrice: 2500,
    options: [
      {
        name: "Size",
        position: 1,
        values: ["Small", "Medium"],
      },
      {
        name: "Color",
        position: 2,
        values: ["Black", "White"],
      },
    ],
    variants: [
      {
        sku: "DEMO-TSHIRT-S-BLACK",
        price: 2500,
        stock: 20,
        options: { Size: "Small", Color: "Black" },
      },
      {
        sku: "DEMO-TSHIRT-S-WHITE",
        price: 2600,
        stock: 15,
        options: { Size: "Small", Color: "White" },
      },
      {
        sku: "DEMO-TSHIRT-M-BLACK",
        price: 2700,
        stock: 12,
        options: { Size: "Medium", Color: "Black" },
      },
      {
        sku: "DEMO-TSHIRT-M-WHITE",
        price: 2800,
        stock: 10,
        options: { Size: "Medium", Color: "White" },
      },
    ],
  },
  {
    categorySlug: "demo-home-living",
    title: "Classic Mug",
    slug: "demo-classic-mug",
    description: "A simple product without configurable options.",
    basePrice: 900,
    options: [],
    variants: [
      {
        sku: "DEMO-MUG-001",
        price: 900,
        stock: 30,
        options: {},
      },
    ],
  },
  {
    categorySlug: "demo-electronics",
    title: "Desk Lamp",
    slug: "demo-desk-lamp",
    description: "A desk lamp available in different finishes.",
    basePrice: 4500,
    options: [
      {
        name: "Finish",
        position: 1,
        values: ["Black", "White"],
      },
    ],
    variants: [
      {
        sku: "DEMO-LAMP-BLACK",
        price: 4500,
        stock: 8,
        options: { Finish: "Black" },
      },
      {
        sku: "DEMO-LAMP-WHITE",
        price: 4700,
        stock: 6,
        options: { Finish: "White" },
      },
    ],
  },
  {
    categorySlug: "demo-home-living",
    title: "Jigsaw Puzzle",
    slug: "demo-jigsaw-puzzle",
    description: "A puzzle with configurable piece counts.",
    basePrice: 1500,
    options: [
      {
        name: "Piece Count",
        position: 1,
        values: ["100", "500"],
      },
    ],
    variants: [
      {
        sku: "DEMO-PUZZLE-100",
        price: 1500,
        stock: 25,
        options: { "Piece Count": "100" },
      },
      {
        sku: "DEMO-PUZZLE-500",
        price: 3200,
        stock: 14,
        options: { "Piece Count": "500" },
      },
    ],
  },
  {
    categorySlug: "demo-home-living",
    title: "Abstract Poster",
    slug: "demo-abstract-poster",
    description: "A poster available in two sizes.",
    basePrice: 1200,
    options: [
      {
        name: "Size",
        position: 1,
        values: ["A4", "A3"],
      },
    ],
    variants: [
      {
        sku: "DEMO-POSTER-A4",
        price: 1200,
        stock: 18,
        options: { Size: "A4" },
      },
      {
        sku: "DEMO-POSTER-A3",
        price: 2000,
        stock: 9,
        options: { Size: "A3" },
      },
    ],
  },
];

async function seedDemoData() {
  const isDemoReset = process.argv.includes("--reset-demo");

  // Require explicit confirmation before writing to the database.
  if (process.env.RUN_DEMO_SEED !== "YES") {
    throw new Error(
      "Set RUN_DEMO_SEED=YES to confirm that you want to seed this database.",
    );
  }

  // Reset requires a separate confirmation.
  if (isDemoReset && process.env.RUN_DEMO_RESET !== "YES") {
    throw new Error(
      "Set RUN_DEMO_RESET=YES to confirm that you want to reset the demo database.",
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);

  // Prevent accidental resets of a database with a different name.
  if (isDemoReset) {
    const databaseName = decodeURIComponent(
      databaseUrl.pathname.replace(/^\/+/, ""),
    );

    if (databaseName !== "varianta_db") {
      throw new Error(
        `Demo reset is only allowed for varianta_db. Current database: ${databaseName || "(unknown)"}`,
      );
    }
  }

  console.log(
    `${isDemoReset ? "Resetting and seeding" : "Seeding"} database: ${databaseUrl.host}${databaseUrl.pathname}`,
  );

  await prisma.$transaction(async (tx) => {
    if (isDemoReset) {
      // Delete orders and their items before removing users and products.
      await tx.order.deleteMany({});

      // Preserve admin accounts.
      await tx.user.deleteMany({
        where: { role: "User" },
      });

      // Related variants, options, and option values are deleted via Cascade.
      await tx.product.deleteMany({});

      // Products have been removed, so categories can now be deleted.
      await tx.category.deleteMany({});

      console.log("Previous demo data cleared.");
    }

    const categoryIds = new Map();

    // Create demo categories without duplicating existing records.
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
        throw new Error(
          `Category not found for product: ${productFields.slug}`,
        );
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

      // Create options and values before creating variants.
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

      // Create variants and link their selected option values.
      for (const variantData of variants) {
        const variant = await tx.variant.upsert({
          where: { sku: variantData.sku },
          update: {
            productId: product.id,
            price: variantData.price,
            // Preserve existing stock when running a normal seed.
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
  });

  console.log(
    `Demo data ${isDemoReset ? "reset and seeded" : "seeded"} successfully.`,
  );
  console.log(`Categories: ${categories.length}`);
  console.log(`Products: ${products.length}`);
  console.log(
    `Variants: ${products.reduce(
      (total, product) => total + product.variants.length,
      0,
    )}`,
  );
}

try {
  await seedDemoData();
} catch (error) {
  console.error("Demo seeding failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
